package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RefuelRecommendationResponse {
    private String  action;           // FILL_NOW | FILL_SOON | WAIT | NORMAL
    private String  reason;
    private Double  remainingFuelPct;
    private Double  remainingKm;
    private Double  remainingLitres;
    private Integer confidence;
    private Double  suggestedAmount;
    private Double  estimatedSavings;
    private Double  daysOfRange;
    private Integer behaviourScore;
}
