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

@Service
@RequiredArgsConstructor
@Slf4j
public class MOFArticleParser {

    private final OllamaService ollamaService;
    private final MOFArticleRepository mofArticleRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT =
        "You are a Malaysian government document classifier and data extractor. " +
        "Respond ONLY with valid JSON. No markdown, no text outside the JSON.";

    private static final String USER_PROMPT =
        "Read this article. Is it an official Malaysian Ministry of Finance fuel price announcement?\n\n" +
        "Reply ONLY with this JSON:\n" +
        "{\n" +
        "  \"isFuelAnnouncement\": true or false,\n" +
        "  \"effectiveDate\": \"YYYY-MM-DD or null\",\n" +
        "  \"ron95\": number or null,\n" +
        "  \"ron97\": number or null,\n" +
        "  \"diesel\": number or null,\n" +
        "  \"dieselEastMalaysia\": number or null,\n" +
        "  \"budi95\": number or null,\n" +
        "  \"reason\": \"one sentence or null\",\n" +
        "  \"userTip\": \"one actionable sentence for Malaysian drivers or null\"\n" +
        "}\n\n" +
        "If isFuelAnnouncement is false, all other fields must be null.\n\nArticle:\n";

    /** @return true if article was a fuel announcement and was saved */
    public boolean classifyAndSave(String title, String url, String content) {
        // temperature 0 — deterministic JSON extraction
        String response = ollamaService.generate(SYSTEM_PROMPT, USER_PROMPT + content, 0.0);
        if (response == null) { log.warn("Ollama returned null for: {}", title); return false; }

        try {
            JsonNode node = objectMapper.readTree(sanitize(response));

            if (!node.path("isFuelAnnouncement").asBoolean(false)) {
                log.debug("'{}' → not a fuel announcement", title);
                return false;
            }

            MOFArticle article = MOFArticle.builder()
                    .fetchedAt(LocalDateTime.now()).title(title).sourceUrl(url)
                    .rawContent(content).ollamaAnalysis(response)
                    .parsedChanges(buildChanges(node))
                    .mainReason(node.path("reason").asText(null))
                    .userTip(node.path("userTip").asText(null))
                    .isNotified(false).build();

            String dateStr = node.path("effectiveDate").asText(null);
            if (dateStr != null && !dateStr.equals("null") && !dateStr.isBlank()) {
                try { article.setEffectiveDate(LocalDate.parse(dateStr)); }
                catch (Exception ignored) {}
            }

            mofArticleRepository.save(article);
            notificationService.sendToAll("⛽ Fuel Price Update",
                article.getUserTip() != null ? article.getUserTip() : "Check the latest fuel prices.");
            return true;

        } catch (Exception e) {
            log.warn("Parse failed for '{}': {}", title, e.getMessage()); return false;
        }
    }

    private String buildChanges(JsonNode n) {
        return String.format(
            "[{\"ron95\":%s,\"ron97\":%s,\"diesel\":%s,\"dieselEastMalaysia\":%s,\"budi95\":%s}]",
            val(n, "ron95"), val(n, "ron97"), val(n, "diesel"),
            val(n, "dieselEastMalaysia"), val(n, "budi95"));
    }

    private String val(JsonNode n, String f) {
        return n.path(f).isMissingNode() || n.path(f).isNull() ? "null" : n.path(f).toString();
    }

    private String sanitize(String raw) {
        return raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
    }
}
