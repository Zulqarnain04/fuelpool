package com.fuelpool.fuelpool_backend.service.ollama;

import com.fuelpool.fuelpool_backend.config.OllamaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OllamaService {

    private final OllamaConfig ollamaConfig;
    private final RestClient ollamaRestClient;

    public String generate(String systemPrompt, String userPrompt) {
        return generate(systemPrompt, userPrompt, 0.4);
    }

    public String generate(String systemPrompt, String userPrompt, double temperature) {
        String fullPrompt = "System: " + systemPrompt + "\n\nUser: " + userPrompt;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", ollamaConfig.getModel());
        requestBody.put("prompt", fullPrompt);
        requestBody.put("stream", false);
        requestBody.put("options", Map.of("temperature", temperature));

        try {
            Map<String, Object> response = ollamaRestClient
                    .post()
                    .uri("/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
        } catch (Exception e) {
            log.warn("Ollama call failed: {}", e.getMessage());
        }
        return null;
    }
}
