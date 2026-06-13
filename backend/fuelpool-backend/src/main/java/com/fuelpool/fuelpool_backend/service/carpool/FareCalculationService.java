package com.fuelpool.fuelpool_backend.service.carpool;

import com.fuelpool.fuelpool_backend.dto.response.FareBreakdownResponse;
import com.fuelpool.fuelpool_backend.model.FuelPrice;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.FuelPriceRepository;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class FareCalculationService {

    private final FuelPriceRepository fuelPriceRepository;
    private final FuelPriceService fuelPriceService;

    public FareBreakdownResponse calculate(double distanceKm, Vehicle vehicle, int totalOccupants) {
        FuelPrice latest = fuelPriceRepository.findTopByOrderByPriceDateDesc().orElse(null);
        BigDecimal pricePerLitre = latest != null
                ? fuelPriceService.getPriceForFuelType(latest, vehicle.getFuelType())
                : new BigDecimal("2.05");

        double efficiency = vehicle.getAvgEfficiency().doubleValue();
        double litresUsed = distanceKm / efficiency;
        BigDecimal fuelCostTotal = BigDecimal.valueOf(litresUsed * pricePerLitre.doubleValue())
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal farePerPerson = fuelCostTotal.divide(BigDecimal.valueOf(totalOccupants), 2, RoundingMode.HALF_UP);
        BigDecimal driverNetCost = farePerPerson;

        double driverSavingsPct = ((double)(totalOccupants - 1) / totalOccupants) * 100;

        BigDecimal grabEstimate = BigDecimal.valueOf(2.50 + distanceKm * 0.90).setScale(2, RoundingMode.HALF_UP);
        BigDecimal savedVsGrab = grabEstimate.subtract(farePerPerson);
        double passengerSavingsPct = savedVsGrab.doubleValue() / grabEstimate.doubleValue() * 100;

        return FareBreakdownResponse.builder()
                .fuelCostTotal(fuelCostTotal)
                .totalOccupants(totalOccupants)
                .farePerPerson(farePerPerson)
                .driverNetCost(driverNetCost)
                .driverSavingsPercent(BigDecimal.valueOf(driverSavingsPct).setScale(1, RoundingMode.HALF_UP).doubleValue())
                .grabEstimate(grabEstimate)
                .passengerSavingsVsGrab(savedVsGrab)
                .passengerSavingsPercent(BigDecimal.valueOf(passengerSavingsPct).setScale(1, RoundingMode.HALF_UP).doubleValue())
                .build();
    }

    public BigDecimal grabEstimate(double distanceKm) {
        return BigDecimal.valueOf(2.50 + distanceKm * 0.90).setScale(2, RoundingMode.HALF_UP);
    }
}
