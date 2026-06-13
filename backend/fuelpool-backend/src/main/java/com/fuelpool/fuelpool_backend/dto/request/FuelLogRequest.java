package com.fuelpool.fuelpool_backend.dto.request;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class FuelLogRequest {

    @NotNull
    private LocalDateTime logDate;

    @NotNull
    private Integer odometer;

    @NotNull
    @Positive
    private BigDecimal litresFilled;

    private BigDecimal pricePerLitre;
    private BigDecimal totalCost;

    private boolean isFullTank = true;
    private boolean isMissedPrevious = false;

    private String stationName;

    @NotNull
    private Vehicle.FuelType fuelType;

    private String notes;
    private Long vehicleId;
}
