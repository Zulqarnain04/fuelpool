package com.fuelpool.fuelpool_backend.service.eco;

import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.TripPassenger;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.repository.FuelPriceRepository;
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

        // Eco score formula
        double score = stats.getCarbonSavedKg().doubleValue() * 0.5
                + stats.getCarpoolTrips() * 5
                + stats.getSavedVsSolo().doubleValue() / 10
                - stats.getSoloTrips() * 2;
        stats.setEcoScore(BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP));

        ecoWeeklyStatsRepository.save(stats);
    }
}
