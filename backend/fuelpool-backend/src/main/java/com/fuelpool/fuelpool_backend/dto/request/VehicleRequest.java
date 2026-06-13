package com.fuelpool.fuelpool_backend.dto.request;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class VehicleRequest {

    @NotBlank
    private String make;

    @NotBlank
    private String model;

    private Integer year;
    private String color;
    private String plateNumber;

    @NotNull
    @Positive
    private BigDecimal tankCapacity;

    @NotNull
    @Positive
    private BigDecimal avgEfficiency;

    @NotNull
    private Vehicle.FuelType fuelType;

    private Integer currentOdometer;
    private boolean isPrimary = true;
}
