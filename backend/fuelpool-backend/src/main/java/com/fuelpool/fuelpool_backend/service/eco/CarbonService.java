package com.fuelpool.fuelpool_backend.service.eco;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import org.springframework.stereotype.Service;

@Service
public class CarbonService {

    private static final double CO2_PETROL = 2.31;
    private static final double CO2_DIESEL = 2.68;

    public double soloCarbon(double distanceKm, Vehicle vehicle) {
        double litres = distanceKm / vehicle.getAvgEfficiency().doubleValue();
        return litres * co2Factor(vehicle);
    }

    public double passengerShareCarbon(double distanceKm, Vehicle vehicle, int totalOccupants) {
        return soloCarbon(distanceKm, vehicle) / totalOccupants;
    }

    public double carbonSavedByPassenger(double distanceKm, Vehicle vehicle, int totalOccupants) {
        double solo = soloCarbon(distanceKm, vehicle);
        return solo - (solo / totalOccupants);
    }

    public double treesEquivalent(double carbonSavedKg) {
        return carbonSavedKg / 0.021;
    }

    private double co2Factor(Vehicle vehicle) {
        return (vehicle.getFuelType() == Vehicle.FuelType.DIESEL
                || vehicle.getFuelType() == Vehicle.FuelType.DIESEL_EAST)
                ? CO2_DIESEL : CO2_PETROL;
    }
}
