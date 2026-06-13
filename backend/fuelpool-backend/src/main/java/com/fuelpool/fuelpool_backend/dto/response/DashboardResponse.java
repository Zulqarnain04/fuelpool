package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DashboardResponse {
    // L1 — Fuel price card
    private FuelPriceResponse currentPrices;
    private String refuelAction;
    private String refuelReason;

    // L1 — Fuel level card
    private Double remainingFuelPct;
    private Double remainingKm;
    private Double remainingLitres;
    private boolean vehicleSetUp;

    // L2 — Nearby carpool card
    private int nearbyRidesCount;
    private String nearbyRidesSummary;

    // L3 — Weekly savings card
    private BigDecimal weeklySavedVsSolo;
    private BigDecimal weeklySavedVsGrab;

    // L3 — Carbon card
    private BigDecimal weeklyCarbonSavedKg;
    private double treesEquivalent;

    // L3 — Community rank card
    private Integer communityRank;
    private Integer totalUsers;
    private Double percentile;
    private String rankSummary;
}
