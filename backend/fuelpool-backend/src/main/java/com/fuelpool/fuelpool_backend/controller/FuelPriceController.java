package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.response.FuelPriceResponse;
import com.fuelpool.fuelpool_backend.dto.response.FuelTrendResponse;
import com.fuelpool.fuelpool_backend.dto.response.RefuelRecommendationResponse;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import com.fuelpool.fuelpool_backend.service.fuel.Budi95Service;
import com.fuelpool.fuelpool_backend.service.fuel.FuelLogService;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import com.fuelpool.fuelpool_backend.service.fuel.TrendPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fuel")
@RequiredArgsConstructor
public class FuelPriceController {

    private final FuelPriceService fuelPriceService;
    private final TrendPredictionService trendService;
    private final FuelLogService fuelLogService;
    private final Budi95Service budi95Service;
    private final VehicleRepository vehicleRepository;

    @GetMapping("/prices/current")
    public ResponseEntity<FuelPriceResponse> current() {
        return ResponseEntity.ok(fuelPriceService.getCurrentPrices());
    }

    @GetMapping("/prices/history")
    public ResponseEntity<List<FuelPriceResponse>> history(@RequestParam(defaultValue = "12") int weeks) {
        return ResponseEntity.ok(fuelPriceService.getHistory(weeks));
    }

    @GetMapping("/trend")
    public ResponseEntity<FuelTrendResponse> trend(
            @RequestParam(defaultValue = "RON95_MARKET") String fuelType) {
        return ResponseEntity.ok(trendService.predict(Vehicle.FuelType.valueOf(fuelType)));
    }

    @GetMapping("/recommendation")
    public ResponseEntity<RefuelRecommendationResponse> recommendation(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(fuelLogService.getRecommendation(user));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(fuelLogService.getStats(user));
    }

    @GetMapping("/budi95/status")
    public ResponseEntity<Map<String, Object>> budi95Status(@AuthenticationPrincipal User user) {
        double used     = budi95Service.getBudi95UsedThisMonth(user.getId());
        boolean exceeded = budi95Service.isOverLimit(user.getId());

        BigDecimal effectivePrice;
        if (exceeded) {
            FuelPriceResponse current = fuelPriceService.getCurrentPrices();
            effectivePrice = current != null && current.getRon95() != null
                ? current.getRon95()
                : new BigDecimal("2.05");
        } else {
            effectivePrice = new BigDecimal("1.99");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("usedLitres",      Math.round(used * 10.0) / 10.0);
        result.put("limitLitres",     300);
        result.put("remainingLitres", Math.round(Math.max(0, 300 - used) * 10.0) / 10.0);
        result.put("limitExceeded",   exceeded);
        result.put("effectivePrice",  effectivePrice);
        return ResponseEntity.ok(result);
    }
}
