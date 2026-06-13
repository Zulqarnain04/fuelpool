package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.response.DashboardResponse;
import com.fuelpool.fuelpool_backend.dto.response.FuelPriceResponse;
import com.fuelpool.fuelpool_backend.dto.response.RefuelRecommendationResponse;
import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.repository.RideRepository;
import com.fuelpool.fuelpool_backend.service.eco.CarbonService;
import com.fuelpool.fuelpool_backend.service.eco.LeaderboardService;
import com.fuelpool.fuelpool_backend.service.fuel.FuelLogService;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final FuelPriceService fuelPriceService;
    private final FuelLogService fuelLogService;
    private final RideRepository rideRepository;
    private final EcoWeeklyStatsRepository statsRepository;
    private final LeaderboardService leaderboardService;
    private final CarbonService carbonService;

    @GetMapping
    public ResponseEntity<DashboardResponse> dashboard(@AuthenticationPrincipal User user) {
        // L1 — prices
        FuelPriceResponse prices = fuelPriceService.getCurrentPrices();
        RefuelRecommendationResponse rec = fuelLogService.getRecommendation(user);

        // L2 — nearby rides in next 30 min
        List<Ride> nearbyRides = rideRepository.findByStatusAndDepartureTimeBetween(
                Ride.RideStatus.OPEN,
                LocalDateTime.now(),
                LocalDateTime.now().plusMinutes(30)
        );
        int nearbyCount = nearbyRides.size();

        // L3 — weekly stats
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        EcoWeeklyStats stats = statsRepository
                .findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().build());

        double trees = carbonService.treesEquivalent(stats.getCarbonSavedKg().doubleValue());
        int rank = leaderboardService.getRank(user.getId());
        int total = leaderboardService.getLeaderboard().size();
        double pct = leaderboardService.getPercentile(user.getId());

        return ResponseEntity.ok(DashboardResponse.builder()
                .currentPrices(prices)
                .refuelAction(rec.getAction())
                .refuelReason(rec.getReason())
                .remainingFuelPct(rec.getRemainingFuelPct())
                .remainingKm(rec.getRemainingKm())
                .remainingLitres(rec.getRemainingLitres())
                .vehicleSetUp(rec.getRemainingFuelPct() != null)
                .nearbyRidesCount(nearbyCount)
                .nearbyRidesSummary(nearbyCount + " rides available in the next 30 mins")
                .weeklySavedVsSolo(stats.getSavedVsSolo())
                .weeklySavedVsGrab(stats.getSavedVsGrab())
                .weeklyCarbonSavedKg(stats.getCarbonSavedKg())
                .treesEquivalent(Math.round(trees * 100.0) / 100.0)
                .communityRank(rank)
                .totalUsers(total)
                .percentile(Math.round(pct * 10.0) / 10.0)
                .rankSummary("You are in the top " + (int) Math.round(pct) + "% of EcoDrivers at UTM this week")
                .build());
    }
}
