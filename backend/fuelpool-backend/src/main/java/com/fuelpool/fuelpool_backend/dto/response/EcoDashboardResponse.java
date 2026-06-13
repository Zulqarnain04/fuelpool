package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class EcoDashboardResponse {
    private LocalDate weekStartDate;
    private int totalTrips;
    private int carpoolTrips;
    private int soloTrips;
    private BigDecimal totalCarbonKg;
    private BigDecimal carbonSavedKg;
    private double treesEquivalent;
    private BigDecimal totalFuelCost;
    private BigDecimal savedVsSolo;
    private BigDecimal savedVsGrab;
    private BigDecimal ecoScore;
    private Integer communityRank;
    private Integer totalUsersRanked;
    private Double percentile;
    private String ollamaSummary;
}
