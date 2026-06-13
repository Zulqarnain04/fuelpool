package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FuelTrendResponse {
    private double slope;
    private String direction;        // RISING | FALLING | STABLE
    private List<Double> predicted;  // next 4 weeks
    private String recommendation;   // FILL_NOW | FILL_SOON | WAIT | NORMAL
    private String reason;
}
