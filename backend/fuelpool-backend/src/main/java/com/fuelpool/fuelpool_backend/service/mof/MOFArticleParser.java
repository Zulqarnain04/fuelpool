package com.fuelpool.fuelpool_backend.service.mof;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fuelpool.fuelpool_backend.model.MOFArticle;
import com.fuelpool.fuelpool_backend.repository.MOFArticleRepository;
import com.fuelpool.fuelpool_backend.service.notification.NotificationService;
import com.fuelpool.fuelpool_backend.service.ollama.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AI agents for the MOF Intelligence Engine: verification, extraction and impact.
 * The scraper supplies cleaned article text; every decision here is AI-driven,
 * gated by a minimum confidence. Low-confidence results are never saved, and no
 * fake/demo data is ever generated.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MOFArticleParser {

    // ── Configuration (centralised) ──
    private static final int MIN_CONFIDENCE = 80;
    private static final int CHUNK_SIZE = 4000;
    private static final int MAX_CONTENT_CHARS = 20_000; // LLM-context safety bound (full article never discarded below this)
    private static final int RAW_COLUMN_CAP = 60_000;    // DB TEXT column guard

    private static final String JSON_ONLY = "Respond with valid JSON ONLY. No markdown, no text outside the JSON.";

    private static final String VERIFY_SYSTEM =
            "You are a Malaysian Ministry of Finance fuel policy classifier. " + JSON_ONLY;
    private static final String VERIFY_USER = """
            Determine whether this article contains:
            - official fuel prices
            - fuel subsidy updates
            - petroleum policy changes

            Return JSON:
            {"isFuelArticle": true, "articleType": "weekly_price_update|subsidy_change|policy|other", "confidence": 95}

            Article:
            """;

    private static final String EXTRACT_SYSTEM =
            "You are a Malaysian government fuel policy analyst. " + JSON_ONLY;
    private static final String EXTRACT_USER = """
            Extract structured information. Return JSON ONLY with this schema:
            {
              "isFuelAnnouncement": true,
              "confidence": 95,
              "articleType": "",
              "effectiveDate": "",
              "ron95": null,
              "ron97": null,
              "diesel": null,
              "dieselEastMalaysia": null,
              "budi95": null,
              "priceChange": "",
              "reason": "",
              "governmentAction": "",
              "consumerImpact": "",
              "userTip": "",
              "summary": ""
            }
            Rules: If this is NOT a fuel article, return {"isFuelAnnouncement": false, "confidence": 0}
            and every other field must be null. No markdown, no explanation, JSON only.

            Article:
            """;

    private static final String IMPACT_SYSTEM =
            "You are a Malaysian fuel cost advisor for everyday drivers. " + JSON_ONLY;
    private static final String IMPACT_USER = """
            Based on this fuel announcement, explain: 1) impact on drivers, 2) cost implications,
            3) refueling advice.
            Return JSON:
            {"impactLevel":"LOW|MEDIUM|HIGH","estimatedCostImpact":"","driverAdvice":"","summary":""}

            Announcement:
            """;

    private final OllamaService ollamaService;
    private final MOFArticleRepository mofArticleRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public record VerificationResult(boolean isFuelArticle, String articleType, int confidence) {}

    /**
     * Full per-candidate pipeline: verify → extract → impact → persist.
     * @return true only if a high-confidence fuel article was saved.
     */
    public boolean processCandidate(ArticleCandidate candidate, String content) {
        String prepared = prepareContent(content); // Phase 5: never discard within the safety bound

        // ── Phase 4: AI verification agent ──
        VerificationResult v = verify(prepared);
        log.info("[MOF] Verification confidence {} (type={})", v.confidence(), v.articleType());
        if (!v.isFuelArticle() || v.confidence() < MIN_CONFIDENCE) {
            log.info("[MOF] Article rejected at verification: '{}' (fuel={}, conf={})",
                    candidate.title(), v.isFuelArticle(), v.confidence());
            return false;
        }

        // ── Phase 6: AI extraction agent ──
        String extractionRaw = ollamaService.generate(EXTRACT_SYSTEM, EXTRACT_USER + prepared, 0.0);
        JsonNode ext = parseJson(extractionRaw);
        if (ext == null) {
            log.warn("[MOF] Extraction produced no parseable JSON: '{}'", candidate.title());
            return false;
        }
        boolean isFuel = ext.path("isFuelAnnouncement").asBoolean(false);
        int conf = ext.path("confidence").asInt(0);
        log.info("[MOF] Extraction confidence {}", conf);
        if (!isFuel || conf < MIN_CONFIDENCE) { // Phase 7: confidence validation
            log.info("[MOF] Article rejected at extraction: '{}' (fuel={}, conf={})",
                    candidate.title(), isFuel, conf);
            return false;
        }

        // ── Phase 8: AI impact analysis agent (best-effort) ──
        String impactRaw = analyzeImpact(ext);

        // ── Phase 9: persist ──
        MOFArticle article = MOFArticle.builder()
                .fetchedAt(LocalDateTime.now())
                .title(candidate.title())
                .sourceUrl(candidate.url())
                .rawContent(capForColumn(content))
                .ollamaAnalysis(sanitize(extractionRaw))
                .parsedChanges(buildChanges(ext))
                .mainReason(text(ext, "reason"))
                .userTip(text(ext, "userTip"))
                .summary(text(ext, "summary"))
                .articleType(firstNonBlank(text(ext, "articleType"), v.articleType()))
                .aiConfidence((double) conf)
                .impactAnalysis(impactRaw)
                .isNotified(false)
                .build();

        String dateStr = text(ext, "effectiveDate");
        if (dateStr != null && !dateStr.isBlank() && !"null".equalsIgnoreCase(dateStr)) {
            try {
                article.setEffectiveDate(LocalDate.parse(dateStr.substring(0, Math.min(10, dateStr.length()))));
            } catch (Exception ignored) { /* leave null */ }
        }

        mofArticleRepository.save(article);
        notificationService.sendToAll("⛽ Fuel Price Update",
                firstNonBlank(article.getUserTip(), article.getSummary(), "Check the latest fuel prices."));
        log.info("[MOF] Article saved (confidence {}): {}", conf, candidate.title());
        return true;
    }

    // ── Phase 4: verification agent ──
    private VerificationResult verify(String content) {
        String resp = ollamaService.generate(VERIFY_SYSTEM, VERIFY_USER + content, 0.0);
        JsonNode n = parseJson(resp);
        if (n == null) return new VerificationResult(false, "unknown", 0);
        return new VerificationResult(
                n.path("isFuelArticle").asBoolean(false),
                n.path("articleType").asText("unknown"),
                n.path("confidence").asInt(0));
    }

    // ── Phase 8: impact analysis agent ──
    private String analyzeImpact(JsonNode extraction) {
        try {
            String summary = text(extraction, "summary");
            String basis = (summary != null && !summary.isBlank()) ? summary : extraction.toString();
            String resp = ollamaService.generate(IMPACT_SYSTEM, IMPACT_USER + basis, 0.2);
            String clean = sanitize(resp);
            return parseJson(clean) != null ? clean : null; // store only if valid JSON
        } catch (Exception e) {
            log.warn("[MOF] Impact analysis failed: {}", e.getMessage());
            return null;
        }
    }

    // ── Phase 5: chunking (combine, never discard within bound) ──
    private String prepareContent(String content) {
        String c = content == null ? "" : content.trim();
        if (c.length() <= MAX_CONTENT_CHARS) return c;
        List<String> chunks = chunkText(c, CHUNK_SIZE);
        StringBuilder sb = new StringBuilder();
        for (String chunk : chunks) {
            if (sb.length() + chunk.length() > MAX_CONTENT_CHARS) break;
            sb.append(chunk).append('\n');
        }
        log.info("[MOF] Long article chunked: {} chars → {} chunks, sending {} chars",
                c.length(), chunks.size(), sb.length());
        return sb.toString();
    }

    private List<String> chunkText(String content, int size) {
        List<String> chunks = new ArrayList<>();
        for (int i = 0; i < content.length(); i += size) {
            chunks.add(content.substring(i, Math.min(content.length(), i + size)));
        }
        return chunks;
    }

    // ── JSON helpers ──
    private JsonNode parseJson(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readTree(extractJsonObject(sanitize(raw)));
        } catch (Exception e) {
            return null;
        }
    }

    /** Pull the outermost {...} in case the model wraps it in stray prose. */
    private String extractJsonObject(String s) {
        int start = s.indexOf('{');
        int end = s.lastIndexOf('}');
        return (start >= 0 && end > start) ? s.substring(start, end + 1) : s;
    }

    private String buildChanges(JsonNode n) {
        return String.format(
                "[{\"ron95\":%s,\"ron97\":%s,\"diesel\":%s,\"dieselEastMalaysia\":%s,\"budi95\":%s}]",
                val(n, "ron95"), val(n, "ron97"), val(n, "diesel"), val(n, "dieselEastMalaysia"), val(n, "budi95"));
    }

    private String val(JsonNode n, String f) {
        JsonNode v = n.path(f);
        return v.isMissingNode() || v.isNull() ? "null" : v.toString();
    }

    private String text(JsonNode n, String f) {
        JsonNode v = n.path(f);
        return v.isMissingNode() || v.isNull() ? null : v.asText(null);
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private static String capForColumn(String content) {
        if (content == null) return null;
        return content.length() > RAW_COLUMN_CAP ? content.substring(0, RAW_COLUMN_CAP) : content;
    }

    private static String sanitize(String raw) {
        return raw == null ? "" : raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
    }
}
