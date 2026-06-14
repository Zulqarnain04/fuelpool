package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.dto.response.EnhancedPredictionResponse;
import com.fuelpool.fuelpool_backend.dto.response.FuelTrendResponse;
import com.fuelpool.fuelpool_backend.model.FuelPrice;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.MOFArticleRepository;
import com.fuelpool.fuelpool_backend.service.ollama.OllamaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TrendPredictionService {

    private final FuelPriceService fuelPriceService;
    private final OllamaService ollamaService;
    private final MOFArticleRepository mofArticleRepository;

    public FuelTrendResponse predict(Vehicle.FuelType fuelType) {
        List<FuelPrice> recent = fuelPriceService.getLastNPrices(6);

        if (recent.size() < 2) {
            return FuelTrendResponse.builder()
                    .slope(0)
                    .direction("STABLE")
                    .predicted(List.of())
                    .recommendation("NORMAL")
                    .reason("Insufficient data for prediction.")
                    .build();
        }

        // Build price series oldest-first
        List<Double> prices = new ArrayList<>();
        for (int i = recent.size() - 1; i >= 0; i--) {
            BigDecimal p = fuelPriceService.getPriceForFuelType(recent.get(i), fuelType);
            if (p != null) prices.add(p.doubleValue());
        }

        int n = prices.size();
        double xMean = (n - 1) / 2.0;
        double yMean = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        double numerator = 0, denominator = 0;
        for (int i = 0; i < n; i++) {
            numerator += (i - xMean) * (prices.get(i) - yMean);
            denominator += Math.pow(i - xMean, 2);
        }

        double slope = denominator == 0 ? 0 : numerator / denominator;
        double intercept = yMean - slope * xMean;

        List<Double> predicted = new ArrayList<>();
        for (int w = 1; w <= 4; w++) {
            double raw = intercept + slope * (n - 1 + w);
            predicted.add(BigDecimal.valueOf(raw).setScale(2, RoundingMode.HALF_UP).doubleValue());
        }

        String direction = slope < -0.05 ? "FALLING" : slope > 0.05 ? "RISING" : "STABLE";

        return FuelTrendResponse.builder()
                .slope(BigDecimal.valueOf(slope).setScale(4, RoundingMode.HALF_UP).doubleValue())
                .direction(direction)
                .predicted(predicted)
                .recommendation(buildRecommendation(direction))
                .reason(buildReason(direction))
                .build();
    }

    public EnhancedPredictionResponse predictEnhanced(Vehicle.FuelType fuelType) {
        List<FuelPrice> recent = fuelPriceService.getLastNPrices(6);
        List<Double> prices = new ArrayList<>();
        for (int i = recent.size() - 1; i >= 0; i--) {
            BigDecimal p = fuelPriceService.getPriceForFuelType(recent.get(i), fuelType);
            if (p != null) prices.add(p.doubleValue());
        }

        if (prices.size() < 2) {
            return EnhancedPredictionResponse.builder()
                    .prediction("STABLE").confidence(40).nextWeekRange(List.of(0.0, 0.0))
                    .predictedPrice(0).reason("Insufficient data.").basedOn("< 2 weeks of data")
                    .priceHistory(prices).weeklyChangeSen(0).build();
        }

        int n = prices.size();
        double xMean = (n - 1) / 2.0;
        double yMean = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double num = 0, den = 0;
        for (int i = 0; i < n; i++) { num += (i - xMean) * (prices.get(i) - yMean); den += Math.pow(i - xMean, 2); }
        double slope = den == 0 ? 0 : num / den;
        double predicted = BigDecimal.valueOf(yMean - slope * xMean + slope * n).setScale(2, RoundingMode.HALF_UP).doubleValue();

        double variance = prices.stream().mapToDouble(p -> Math.pow(p - yMean, 2)).average().orElse(0);
        double uncertainty = Math.sqrt(variance) * 1.5;
        double lower = BigDecimal.valueOf(Math.max(0, predicted - uncertainty)).setScale(2, RoundingMode.HALF_UP).doubleValue();
        double upper = BigDecimal.valueOf(predicted + uncertainty).setScale(2, RoundingMode.HALF_UP).doubleValue();

        int c = 65;
        double abs = Math.abs(slope);
        if (abs > 0.20) c += 15; else if (abs > 0.10) c += 10; else if (abs > 0.05) c += 5;
        c += Math.min(10, prices.size() * 2);
        if (variance < 0.01) c += 10; else if (variance > 0.10) c -= 10;
        c = Math.min(95, Math.max(40, c));

        String direction = slope < -0.05 ? "DOWN" : slope > 0.05 ? "UP" : "STABLE";
        String mofContext = mofArticleRepository.findTopByOrderByFetchedAtDesc()
                .map(a -> a.getMainReason() != null ? a.getMainReason() : "No recent MOF update")
                .orElse("No recent MOF update");

        String prompt = String.format(
            "Malaysian %s fuel last 6 weeks (oldest→newest): %s. " +
            "Trend: %s at %.1f sen/week. Predicted next week: RM %.2f (range RM %.2f–%.2f). " +
            "MOF context: %s. " +
            "Write ONE sentence explaining this trend for a Malaysian driver. " +
            "Mention direction and main reason. Max 25 words.",
            fuelType.name(), prices, direction, slope * 100, predicted, lower, upper, mofContext);

        String reason = ollamaService.generate(
            "You are a concise Malaysian fuel price analyst.", prompt, 0.3);

        return EnhancedPredictionResponse.builder()
                .prediction(direction).confidence(c)
                .nextWeekRange(List.of(lower, upper)).predictedPrice(predicted)
                .reason(reason != null ? reason : "Trend based on last " + n + " weeks of data.")
                .basedOn(n + "-week linear regression + MOF context")
                .priceHistory(prices)
                .weeklyChangeSen(BigDecimal.valueOf(slope * 100).setScale(2, RoundingMode.HALF_UP).doubleValue())
                .build();
    }

    private String buildRecommendation(String direction) {
        return switch (direction) {
            case "RISING" -> "FILL_NOW";
            case "FALLING" -> "WAIT";
            default -> "NORMAL";
        };
    }

    private String buildReason(String direction) {
        return switch (direction) {
            case "RISING" -> "Prices trending up. Fill up before next Wednesday.";
            case "FALLING" -> "Prices trending down. Top up minimally and wait for lower prices.";
            default -> "Prices stable. Fill up as needed.";
        };
    }
}
