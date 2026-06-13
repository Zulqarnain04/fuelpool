package com.fuelpool.fuelpool_backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RideJoinRequest {

    @NotNull
    private BigDecimal pickupLat;

    @NotNull
    private BigDecimal pickupLng;

    private String pickupLabel;

    @NotNull
    private BigDecimal dropoffLat;

    @NotNull
    private BigDecimal dropoffLng;

    private String dropoffLabel;
}
