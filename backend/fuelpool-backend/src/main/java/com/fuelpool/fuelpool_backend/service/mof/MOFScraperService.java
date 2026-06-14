package com.fuelpool.fuelpool_backend.service.mof;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fuelpool.fuelpool_backend.service.ollama.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * AI-first MOF Intelligence Engine — discovery stage.
 *
 * The scraper only gathers raw information (homepage HTML → cleaned article
 * candidates). The AI agents (ranking, verification, extraction, impact) make
 * every decision; see {@link MOFArticleParser}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MOFScraperService {

    // ── Configuration (centralised) ──
    private static final String MOF_HOME = "https://www.mof.gov.my/portal/en";
    private static final int MAX_CANDIDATES = 30;
    private static final int TOP_DOWNLOAD_COUNT = 5;
    private static final int CONNECT_TIMEOUT_MS = 12_000;
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; FuelPool/1.0)";

    // strip these from any page before we read text/links
    private static final String NOISE_SELECTOR =
            "script, style, nav, footer, header, aside, form, noscript, " +
            ".social, .socials, .share, [class*=accessibility], [id*=accessibility], " +
            ".skip-link, .breadcrumb, .menu, .navbar, .cookie";

    // article URLs on the MOF portal live under /news/<category>/<slug>
    private static final Pattern ARTICLE_URL = Pattern.compile(
            "(?i)mof\\.gov\\.my/.*/news/(press-citations|press-release|media-statement|speech)/[^/?#]+");
    private static final Pattern DATE_NEARBY = Pattern.compile(
            "(\\d{1,2}\\s+\\w+\\s+\\d{4})|(\\d{4}-\\d{2}-\\d{2})|(\\d{1,2}/\\d{1,2}/\\d{4})");

    private final MOFArticleParser articleParser;
    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper;

    // ───────────────────────────────────────────────────────────────────────────
    public void scrapeAndProcess() {
        Document home;
        try {
            home = Jsoup.connect(MOF_HOME).userAgent(USER_AGENT).timeout(CONNECT_TIMEOUT_MS).get();
            log.info("[MOF] Homepage fetched: {}", MOF_HOME);
        } catch (Exception e) {
            log.error("[MOF] Homepage fetch failed: {}", e.getMessage());
            return; // never fabricate data
        }

        List<ArticleCandidate> candidates = extractHomepageCandidates(home);
        log.info("[MOF] Found {} homepage candidates", candidates.size());
        if (candidates.isEmpty()) {
            log.warn("[MOF] No article candidates discovered — aborting");
            return;
        }

        List<Integer> ranked = aiRankCandidates(candidates);
        log.info("[MOF] AI ranked {} candidate(s); evaluating top {}",
                ranked.size(), Math.min(TOP_DOWNLOAD_COUNT, ranked.size()));

        int evaluated = 0;
        for (int idx : ranked) {
            if (evaluated >= TOP_DOWNLOAD_COUNT) break;
            ArticleCandidate c = candidates.get(idx);
            evaluated++;

            log.info("[MOF] Downloading candidate #{}: {}", evaluated, c.title());
            String content = downloadArticle(c.url());
            if (content == null || content.isBlank()) {
                log.warn("[MOF] Download failed/empty for {}", c.url());
                continue;
            }

            if (articleParser.processCandidate(c, content)) {
                log.info("[MOF] Article saved: {}", c.title());
                return; // stop at the first verified + extracted fuel article
            }
        }
        log.warn("[MOF] No fuel article passed verification/extraction among ranked candidates");
    }

    // ── Phase 2: HTML cleaning + candidate extraction ──────────────────────────
    private List<ArticleCandidate> extractHomepageCandidates(Document doc) {
        clean(doc);
        LinkedHashMap<String, ArticleCandidate> byUrl = new LinkedHashMap<>();

        for (Element a : doc.select("a[href]")) {
            String url = a.absUrl("href");
            String title = safe(a.text());
            if (url.isBlank() || title.length() < 15) continue;
            if (!ARTICLE_URL.matcher(url).find()) continue;
            if (byUrl.containsKey(url)) continue;

            byUrl.put(url, new ArticleCandidate(title, url, previewNear(a), dateNear(a)));
            if (byUrl.size() >= MAX_CANDIDATES) break;
        }
        return new ArrayList<>(byUrl.values());
    }

    /** Remove non-content noise (scripts, nav, footer, social, accessibility, etc.). */
    private void clean(Document doc) {
        doc.select(NOISE_SELECTOR).remove();
    }

    private String previewNear(Element anchor) {
        // nearest paragraph-ish text around the link (card description)
        Element parent = anchor.parent();
        for (int i = 0; i < 3 && parent != null; i++) {
            String text = safe(parent.text());
            if (text.length() > anchor.text().length() + 20) {
                return text.length() > 240 ? text.substring(0, 240) : text;
            }
            parent = parent.parent();
        }
        return "";
    }

    private String dateNear(Element anchor) {
        Element scope = anchor.parent() != null ? anchor.parent() : anchor;
        Matcher m = DATE_NEARBY.matcher(scope.text());
        return m.find() ? m.group() : "";
    }

    // ── Phase 3: AI Discovery / Ranking agent ──────────────────────────────────
    private List<Integer> aiRankCandidates(List<ArticleCandidate> candidates) {
        StringBuilder list = new StringBuilder();
        for (int i = 0; i < candidates.size(); i++) {
            ArticleCandidate c = candidates.get(i);
            list.append(i).append(". title=\"").append(c.title()).append("\"");
            if (!c.date().isBlank()) list.append(" date=\"").append(c.date()).append("\"");
            if (!c.preview().isBlank()) list.append(" preview=\"").append(truncate(c.preview(), 160)).append("\"");
            list.append('\n');
        }

        String system = "You are a Malaysian Ministry of Finance fuel analyst.";
        String user = """
                Identify articles related to: fuel prices, petrol, diesel, RON95, RON97, BUDI95,
                fuel subsidies, petroleum policy, energy pricing.

                Candidates:
                %s

                Return JSON ONLY, sorted highest confidence first:
                {"rankedCandidates":[{"index":0,"confidence":95,"reason":"..."}]}
                Only include candidates that are plausibly about fuel/energy.
                """.formatted(list);

        try {
            String resp = ollamaService.generate(system, user, 0.0);
            if (resp != null) {
                JsonNode root = objectMapper.readTree(sanitize(resp));
                JsonNode arr = root.path("rankedCandidates");
                if (arr.isArray() && !arr.isEmpty()) {
                    List<int[]> pairs = new ArrayList<>(); // [index, confidence]
                    for (JsonNode n : arr) {
                        int index = n.path("index").asInt(-1);
                        int conf = n.path("confidence").asInt(0);
                        if (index >= 0 && index < candidates.size()) pairs.add(new int[]{index, conf});
                    }
                    if (!pairs.isEmpty()) {
                        List<Integer> ranked = pairs.stream()
                                .sorted(Comparator.comparingInt((int[] p) -> p[1]).reversed())
                                .map(p -> p[0])
                                .distinct()
                                .collect(Collectors.toList());
                        log.info("[MOF] AI ranking results: {}", ranked);
                        return padWithKeyword(ranked, candidates);
                    }
                }
            }
            log.warn("[MOF] AI ranking unavailable — using keyword ranking fallback");
        } catch (Exception e) {
            log.warn("[MOF] AI ranking failed ({}) — using keyword ranking fallback", e.getMessage());
        }
        return keywordRank(candidates);
    }

    /** Ensure every candidate is reachable: AI picks first, then keyword order, then the rest. */
    private List<Integer> padWithKeyword(List<Integer> aiRanked, List<ArticleCandidate> candidates) {
        List<Integer> out = new ArrayList<>(aiRanked);
        for (int i : keywordRank(candidates)) if (!out.contains(i)) out.add(i);
        for (int i = 0; i < candidates.size(); i++) if (!out.contains(i)) out.add(i);
        return out;
    }

    private List<Integer> keywordRank(List<ArticleCandidate> candidates) {
        List<Integer> hits = new ArrayList<>();
        List<Integer> rest = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            if (looksFuel(candidates.get(i).title() + " " + candidates.get(i).preview())) hits.add(i);
            else rest.add(i);
        }
        hits.addAll(rest);
        return hits;
    }

    private boolean looksFuel(String text) {
        String t = text.toLowerCase();
        return t.contains("harga") || t.contains("runcit") || t.contains("petrol") || t.contains("ron95")
                || t.contains("ron 95") || t.contains("ron97") || t.contains("ron 97") || t.contains("diesel")
                || t.contains("minyak") || t.contains("budi95") || t.contains("subsidi") || t.contains("fuel");
    }

    // ── Phase 5: full article download (cleaned, never truncated) ──────────────
    private String downloadArticle(String url) {
        try {
            Document doc = Jsoup.connect(url).userAgent(USER_AGENT).timeout(CONNECT_TIMEOUT_MS).get();
            clean(doc);
            Element main = doc.selectFirst("article, main, .content, .article-content, #content, .post");
            String text = (main != null ? main.text() : doc.body().text());
            return safe(text);
        } catch (Exception e) {
            log.warn("[MOF] Article download error {}: {}", url, e.getMessage());
            return null;
        }
    }

    // ── small helpers ──
    private static String safe(String s) { return s == null ? "" : s.trim(); }
    private static String truncate(String s, int max) { return s.length() > max ? s.substring(0, max) : s; }
    private static String sanitize(String raw) {
        return raw == null ? "" : raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
    }
}
