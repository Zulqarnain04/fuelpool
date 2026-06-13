package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.dto.response.FuelTrendResponse;
import com.fuelpool.fuelpool_backend.model.FuelPrice;
import com.fuelpool.fuelpool_backend.model.Vehicle;
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
