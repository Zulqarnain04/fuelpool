package com.fuelpool.fuelpool_backend.service.mof;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MOFScraperService {

    private static final String MOF_URL = "https://www.mof.gov.my/portal/en/news/press-citations";

    private final MOFArticleParser articleParser;

    public void scrapeAndProcess() {
        try {
            Document doc = Jsoup.connect(MOF_URL)
                    .userAgent("Mozilla/5.0 (compatible; FuelPool/1.0)")
                    .timeout(10_000).get();

            int checked = 0;
            for (Element link : doc.select("a[href]")) {
                if (checked >= 5) break;
                String href = link.absUrl("href");
                if (href.isBlank() || !href.contains("mof.gov.my")) continue;

                try {
                    String content = Jsoup.connect(href)
                            .userAgent("Mozilla/5.0").timeout(10_000)
                            .get().body().text();
                    String truncated = content.length() > 1500 ? content.substring(0, 1500) : content;

                    boolean wasFuel = articleParser.classifyAndSave(link.text(), href, truncated);
                    if (wasFuel) { log.info("Fuel article saved: {}", link.text()); return; }
                    checked++;
                } catch (Exception e) {
                    log.warn("Failed to fetch {}: {}", href, e.getMessage());
                }
            }
            log.warn("No fuel article found in top 5 articles");
        } catch (Exception e) {
            log.error("MOF scrape failed: {}", e.getMessage());
            useFallbackArticle();
        }
    }

    private void useFallbackArticle() {
        String fallback = "Kementerian Kewangan Malaysia mengumumkan harga runcit minyak " +
            "minggu 12 Jun 2026. RON95 kekal RM 2.05, RON97 naik 10 sen kepada RM 4.45, " +
            "diesel kekal RM 2.15. Berkuat kuasa 12 Jun 2026.";
        articleParser.classifyAndSave("Harga Runcit Minyak (Demo)", MOF_URL, fallback);
    }
}
