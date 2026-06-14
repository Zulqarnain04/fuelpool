package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EnhancedPredictionResponse {
    private String       prediction;      // "UP" | "DOWN" | "STABLE"
    private int          confidence;      // 0-100
    private List<Double> nextWeekRange;   // [lower, upper] in RM
    private double       predictedPrice;  // midpoint RM
    private String       reason;          // Ollama sentence
    private String       basedOn;         // transparency field
    private List<Double> priceHistory;    // last 6 weeks for frontend chart
    private double       weeklyChangeSen; // slope × 100 (sen/week)
}
