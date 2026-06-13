package com.fuelpool.fuelpool_backend.service.ollama;

import com.fuelpool.fuelpool_backend.config.OllamaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OllamaService {

    private final OllamaConfig ollamaConfig;
    private final RestTemplate ollamaRestTemplate;

    public String generate(String systemPrompt, String userPrompt) {
        String fullPrompt = "System: " + systemPrompt + "\n\nUser: " + userPrompt;
        Map<String, Object> body = new HashMap<>();
        body.put("model", ollamaConfig.getModel());
        body.put("prompt", fullPrompt);
        body.put("stream", false);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = ollamaRestTemplate.postForObject(
                    ollamaConfig.getBaseUrl() + "/api/generate",
                    body,
                    Map.class
            );
            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
        } catch (Exception e) {
            log.warn("Ollama call failed: {}", e.getMessage());
        }
        return null;
    }
}
