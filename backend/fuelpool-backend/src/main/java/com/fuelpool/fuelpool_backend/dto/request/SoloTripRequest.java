package com.fuelpool.fuelpool_backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SoloTripRequest {

    @NotNull
    @Positive
    private BigDecimal distanceKm;

    private Long vehicleId;
}
