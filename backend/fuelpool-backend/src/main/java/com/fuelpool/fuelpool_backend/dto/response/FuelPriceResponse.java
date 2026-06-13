package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class FuelPriceResponse {
    private LocalDate priceDate;
    private BigDecimal ron95;
    private BigDecimal ron97;
    private BigDecimal diesel;
    private BigDecimal dieselEastMsia;
    private BigDecimal ron95Budi95;
    private BigDecimal ron95Skps;
}
