package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class FareBreakdownResponse {
    private BigDecimal fuelCostTotal;
    private int totalOccupants;
    private BigDecimal farePerPerson;
    private BigDecimal driverNetCost;
    private double driverSavingsPercent;
    private BigDecimal grabEstimate;
    private BigDecimal passengerSavingsVsGrab;
    private double passengerSavingsPercent;
}
