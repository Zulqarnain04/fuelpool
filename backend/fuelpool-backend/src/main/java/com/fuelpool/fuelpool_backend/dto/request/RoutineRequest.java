package com.fuelpool.fuelpool_backend.dto.request;

import com.fuelpool.fuelpool_backend.model.Routine;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class RoutineRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String daysOfWeek;

    @NotNull
    private LocalTime departureTime;

    @NotNull
    private BigDecimal originLat;

    @NotNull
    private BigDecimal originLng;

    private String originLabel;

    @NotNull
    private BigDecimal destLat;

    @NotNull
    private BigDecimal destLng;

    private String destLabel;

    private Routine.RolePreference rolePreference = Routine.RolePreference.EITHER;
    private boolean autoRequest = false;
}
