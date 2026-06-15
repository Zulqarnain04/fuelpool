package com.fuelpool.fuelpool_backend.service.eco;

import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.TripPassenger;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.repository.FuelPriceRepository;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class SavingsService {

    private final FuelPriceRepository fuelPriceRepository;
    private final FuelPriceService fuelPriceService;
    private final EcoWeeklyStatsRepository ecoWeeklyStatsRepository;
    private final VehicleRepository vehicleRepository;
    private final CarbonService carbonService;

    public BigDecimal savedVsSolo(double distanceKm, Vehicle vehicle, BigDecimal farePaid) {
        var latest = fuelPriceRepository.findTopByOrderByPriceDateDesc().orElse(null);
        if (latest == null) return BigDecimal.ZERO;
        double pricePerLitre = fuelPriceService.getPriceForFuelType(latest, vehicle.getFuelType()).doubleValue();
        double soloFuelCost = (distanceKm / vehicle.getAvgEfficiency().doubleValue()) * pricePerLitre;
        return BigDecimal.valueOf(soloFuelCost).subtract(farePaid).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal savedVsGrab(double distanceKm, BigDecimal farePaid) {
        BigDecimal grab = BigDecimal.valueOf(2.50 + distanceKm * 0.90).setScale(2, RoundingMode.HALF_UP);
        return grab.subtract(farePaid).setScale(2, RoundingMode.HALF_UP);
    }

    public void upsertWeeklyStats(User user, TripPassenger trip) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        EcoWeeklyStats stats = ecoWeeklyStatsRepository
                .findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().user(user).weekStartDate(weekStart).build());

        stats.setTotalTrips(stats.getTotalTrips() + 1);
        stats.setCarpoolTrips(stats.getCarpoolTrips() + 1);
        stats.setTotalCarbonKg(stats.getTotalCarbonKg().add(
                trip.getCarbonEmittedKg() != null ? trip.getCarbonEmittedKg() : BigDecimal.ZERO));
        stats.setCarbonSavedKg(stats.getCarbonSavedKg().add(
                trip.getCarbonSavedKg() != null ? trip.getCarbonSavedKg() : BigDecimal.ZERO));
        stats.setSavedVsSolo(stats.getSavedVsSolo().add(
                trip.getSavedVsSolo() != null ? trip.getSavedVsSolo() : BigDecimal.ZERO));
        stats.setSavedVsGrab(stats.getSavedVsGrab().add(
                trip.getSavedVsGrab() != null ? trip.getSavedVsGrab() : BigDecimal.ZERO));

        applyEcoScore(stats);
        ecoWeeklyStatsRepository.save(stats);
    }

    /**
     * Records a completed ride from the driver's perspective: the trip they drove,
     * the community carbon savings their passengers achieved, and the fuel cost of
     * running the vehicle for this trip.
     */
    public void recordDriverTrip(User driver, Ride ride, int totalOccupants, double distKm) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        EcoWeeklyStats stats = ecoWeeklyStatsRepository
                .findByUserIdAndWeekStartDate(driver.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().user(driver).weekStartDate(weekStart).build());

        Vehicle vehicle = ride.getVehicle();
        int passengerCount = Math.max(0, totalOccupants - 1);

        double tripCarbonKg = carbonService.soloCarbon(distKm, vehicle);
        double carbonSavedKg = passengerCount > 0
                ? carbonService.carbonSavedByPassenger(distKm, vehicle, totalOccupants) * passengerCount
                : 0;

        var latest = fuelPriceRepository.findTopByOrderByPriceDateDesc().orElse(null);
        double pricePerLitre = latest != null
                ? fuelPriceService.getPriceForFuelType(latest, vehicle.getFuelType()).doubleValue()
                : 2.05;
        double fuelCostTotal = (distKm / vehicle.getAvgEfficiency().doubleValue()) * pricePerLitre;

        stats.setTotalTrips(stats.getTotalTrips() + 1);
        stats.setCarpoolTrips(stats.getCarpoolTrips() + 1);
        stats.setTotalCarbonKg(stats.getTotalCarbonKg().add(
                BigDecimal.valueOf(tripCarbonKg).setScale(4, RoundingMode.HALF_UP)));
        stats.setCarbonSavedKg(stats.getCarbonSavedKg().add(
                BigDecimal.valueOf(carbonSavedKg).setScale(4, RoundingMode.HALF_UP)));
        stats.setTotalFuelCost(stats.getTotalFuelCost().add(
                BigDecimal.valueOf(fuelCostTotal).setScale(2, RoundingMode.HALF_UP)));

        applyEcoScore(stats);
        ecoWeeklyStatsRepository.save(stats);
    }

    /**
     * Records a solo (non-carpool) trip: adds its carbon and fuel cost to the user's
     * weekly stats, counts it against their eco score, and deducts the fuel used from
     * the vehicle's tracked fuel level.
     */
    public void recordSoloTrip(User user, Vehicle vehicle, double distanceKm) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        EcoWeeklyStats stats = ecoWeeklyStatsRepository
                .findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().user(user).weekStartDate(weekStart).build());

        double tripCarbonKg = carbonService.soloCarbon(distanceKm, vehicle);

        var latest = fuelPriceRepository.findTopByOrderByPriceDateDesc().orElse(null);
        double pricePerLitre = latest != null
                ? fuelPriceService.getPriceForFuelType(latest, vehicle.getFuelType()).doubleValue()
                : 2.05;
        double litresUsed = distanceKm / vehicle.getAvgEfficiency().doubleValue();

        stats.setTotalTrips(stats.getTotalTrips() + 1);
        stats.setSoloTrips(stats.getSoloTrips() + 1);
        stats.setTotalCarbonKg(stats.getTotalCarbonKg().add(
                BigDecimal.valueOf(tripCarbonKg).setScale(4, RoundingMode.HALF_UP)));
        stats.setTotalFuelCost(stats.getTotalFuelCost().add(
                BigDecimal.valueOf(litresUsed * pricePerLitre).setScale(2, RoundingMode.HALF_UP)));

        applyEcoScore(stats);
        ecoWeeklyStatsRepository.save(stats);

        BigDecimal current = vehicle.getCurrentFuelLevel() != null ? vehicle.getCurrentFuelLevel() : BigDecimal.ZERO;
        vehicle.setCurrentFuelLevel(current.subtract(BigDecimal.valueOf(litresUsed)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        vehicleRepository.save(vehicle);
    }

    private void applyEcoScore(EcoWeeklyStats stats) {
        double score = stats.getCarbonSavedKg().doubleValue() * 0.5
                + stats.getCarpoolTrips() * 5
                + stats.getSavedVsSolo().doubleValue() / 10
                - stats.getSoloTrips() * 2;
        stats.setEcoScore(BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP));
    }
}
