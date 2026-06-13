package com.fuelpool.fuelpool_backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RidePostRequest {

    @NotNull
    private BigDecimal originLat;

    @NotNull
    private BigDecimal originLng;

    private String originLabel;

    @NotNull
    private BigDecimal destinationLat;

    @NotNull
    private BigDecimal destinationLng;

    private String destinationLabel;

    @NotNull
    private LocalDateTime departureTime;

    @Min(1)
    @Max(4)
    private int maxSeats = 3;

    @NotNull
    private Long vehicleId;

    private BigDecimal estimatedDistanceKm;
}
