package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.response.FuelPriceResponse;
import com.fuelpool.fuelpool_backend.dto.response.FuelTrendResponse;
import com.fuelpool.fuelpool_backend.dto.response.RefuelRecommendationResponse;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import com.fuelpool.fuelpool_backend.service.fuel.FuelLogService;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import com.fuelpool.fuelpool_backend.service.fuel.TrendPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fuel")
@RequiredArgsConstructor
public class FuelPriceController {

    private final FuelPriceService fuelPriceService;
    private final TrendPredictionService trendService;
    private final FuelLogService fuelLogService;
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
}
