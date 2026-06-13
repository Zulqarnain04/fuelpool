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
            "You are a Malaysian fuel price analyst. Extract information from Ministry of Finance press releases. " +
            "Always respond in JSON format only. No preamble, no markdown code blocks.";

    private static final String USER_PROMPT_TEMPLATE =
            "Read this MOF press release and extract the following as JSON:\n" +
            "{\n" +
            "  \"fuelChanges\": [{\"fuelType\":\"RON97\",\"oldPrice\":4.35,\"newPrice\":4.45,\"changeAmount\":0.10,\"direction\":\"INCREASE\"}],\n" +
            "  \"effectiveDate\": \"2026-06-18\",\n" +
            "  \"mainReason\": \"Rising global crude oil prices\",\n" +
            "  \"userTip\": \"Consider filling up before Wednesday if you use RON97.\",\n" +
            "  \"affectedUsers\": \"RON97 users only.\"\n" +
            "}\n\nArticle text:\n";

    public void parseAndSave(String title, String sourceUrl, String content) {
        String truncated = content.length() > 3000 ? content.substring(0, 3000) : content;
        String ollamaResponse = ollamaService.generate(SYSTEM_PROMPT, USER_PROMPT_TEMPLATE + truncated);

        MOFArticle article = MOFArticle.builder()
                .fetchedAt(LocalDateTime.now())
                .title(title)
                .sourceUrl(sourceUrl)
                .rawContent(truncated)
                .ollamaAnalysis(ollamaResponse)
                .build();

        if (ollamaResponse != null) {
            try {
                JsonNode node = objectMapper.readTree(sanitizeJson(ollamaResponse));
                article.setParsedChanges(node.path("fuelChanges").toString());
                article.setMainReason(node.path("mainReason").asText(null));
                article.setUserTip(node.path("userTip").asText(null));

                String dateStr = node.path("effectiveDate").asText(null);
                if (dateStr != null && !dateStr.isBlank()) {
                    try { article.setEffectiveDate(LocalDate.parse(dateStr)); }
                    catch (Exception ignored) {}
                }
            } catch (Exception e) {
                log.warn("Could not parse Ollama JSON response: {}", e.getMessage());
            }
        }

        mofArticleRepository.save(article);
        notificationService.sendToAll("Fuel Price Update",
                article.getUserTip() != null ? article.getUserTip() : "Check the latest fuel prices.");
        log.info("MOF article saved and users notified");
    }

    private String sanitizeJson(String raw) {
        // Strip markdown code fences if Ollama included them
        return raw.replaceAll("```json", "").replaceAll("```", "").trim();
    }
}
