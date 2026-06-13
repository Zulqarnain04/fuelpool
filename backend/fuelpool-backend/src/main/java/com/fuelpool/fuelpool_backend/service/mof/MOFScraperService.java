package com.fuelpool.fuelpool_backend.service.mof;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
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
                    .timeout(10_000)
                    .get();

            Elements links = doc.select("a[href]");
            for (Element link : links) {
                String text = link.text().toLowerCase();
                if (text.contains("petrol") || text.contains("ron") ||
                        text.contains("fuel") || text.contains("harga") || text.contains("minyak")) {

                    String articleUrl = link.absUrl("href");
                    log.info("Found MOF fuel article: {}", articleUrl);

                    String content = Jsoup.connect(articleUrl)
                            .userAgent("Mozilla/5.0 (compatible; FuelPool/1.0)")
                            .timeout(10_000)
                            .get()
                            .body()
                            .text();

                    articleParser.parseAndSave(link.text(), articleUrl, content);
                    return;
                }
            }
            log.warn("No fuel price article found on MOF page");
        } catch (Exception e) {
            log.error("MOF scraper error: {}", e.getMessage());
            useFallbackArticle();
        }
    }

    private void useFallbackArticle() {
        String fallback = "Kementerian Kewangan Malaysia mengumumkan harga runcit minyak untuk minggu " +
                "12 Jun 2026 hingga 18 Jun 2026. RON95 kekal pada RM 2.05, RON97 naik sebanyak 10 sen " +
                "kepada RM 4.45, dan diesel kekal pada RM 2.15. Harga berkuat kuasa mulai 12 Jun 2026.";
        log.info("Using fallback MOF article for demo");
        articleParser.parseAndSave("Harga Runcit Minyak (Demo)", MOF_URL, fallback);
    }
}
