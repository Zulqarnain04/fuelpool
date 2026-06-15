package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.SoloTripRequest;
import com.fuelpool.fuelpool_backend.dto.response.EcoDashboardResponse;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.FuelLog;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.repository.FuelLogRepository;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import com.fuelpool.fuelpool_backend.service.eco.CarbonService;
import com.fuelpool.fuelpool_backend.service.eco.LeaderboardService;
import com.fuelpool.fuelpool_backend.service.eco.SavingsService;
import com.fuelpool.fuelpool_backend.service.eco.WeeklySummaryService;
import com.fuelpool.fuelpool_backend.service.fuel.Budi95Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/eco")
@RequiredArgsConstructor
public class EcoTrackController {

    private final EcoWeeklyStatsRepository statsRepository;
    private final FuelLogRepository fuelLogRepository;
    private final VehicleRepository vehicleRepository;
    private final LeaderboardService leaderboardService;
    private final CarbonService carbonService;
    private final Budi95Service budi95Service;
    private final WeeklySummaryService weeklySummaryService;
    private final SavingsService savingsService;

    @GetMapping("/weekly")
    public ResponseEntity<EcoDashboardResponse> weekly(@AuthenticationPrincipal User user,
                                                       @RequestParam(defaultValue = "0") int weekOffset) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(weekOffset);

        EcoWeeklyStats stats = statsRepository
                .findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().user(user).weekStartDate(weekStart).build());

        double trees = carbonService.treesEquivalent(stats.getCarbonSavedKg().doubleValue());
        int rank  = leaderboardService.getRank(user.getId());
        int total = leaderboardService.getLeaderboard().size();
        double pct = leaderboardService.getPercentile(user.getId());

        return ResponseEntity.ok(EcoDashboardResponse.builder()
                .weekStartDate(weekStart)
                .totalTrips(stats.getTotalTrips())
                .carpoolTrips(stats.getCarpoolTrips())
                .soloTrips(stats.getSoloTrips())
                .totalCarbonKg(stats.getTotalCarbonKg())
                .carbonSavedKg(stats.getCarbonSavedKg())
                .treesEquivalent(Math.round(trees * 100.0) / 100.0)
                .totalFuelCost(stats.getTotalFuelCost())
                .savedVsSolo(stats.getSavedVsSolo())
                .savedVsGrab(stats.getSavedVsGrab())
                .ecoScore(stats.getEcoScore())
                .communityRank(rank)
                .totalUsersRanked(total)
                .percentile(Math.round(pct * 10.0) / 10.0)
                .ollamaSummary(stats.getOllamaSummary())
                .build());
    }

    @PostMapping("/solo-trip")
    public ResponseEntity<EcoDashboardResponse> logSoloTrip(@AuthenticationPrincipal User user,
                                                             @Valid @RequestBody SoloTripRequest req) {
        Vehicle vehicle = req.getVehicleId() != null
                ? vehicleRepository.findById(req.getVehicleId())
                    .filter(v -> v.getUser().getId().equals(user.getId()))
                    .orElseThrow(() -> new BusinessException("Vehicle does not belong to this user"))
                : vehicleRepository.findFirstByUserIdAndIsPrimaryTrue(user.getId())
                    .orElseThrow(() -> new BusinessException("No vehicle found. Add a vehicle first."));

        savingsService.recordSoloTrip(user, vehicle, req.getDistanceKm().doubleValue());
        leaderboardService.updateRanksForCurrentWeek();

        return weekly(user, 0);
    }

    @PostMapping("/summary/generate")
    public ResponseEntity<Map<String, Object>> generateSummary(@AuthenticationPrincipal User user) {
        String summary = weeklySummaryService.generateForCurrentUser(user);
        return ResponseEntity.ok(Map.of(
                "summary", summary != null ? summary : "Could not generate summary. Check Ollama is running.",
                "generatedAt", LocalDateTime.now().toString(),
                "model", "llama3.2:3b"
        ));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<EcoWeeklyStats>> leaderboard() {
        return ResponseEntity.ok(leaderboardService.getLeaderboard());
    }

    @GetMapping("/summary")
    public ResponseEntity<String> summary(@AuthenticationPrincipal User user) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        return statsRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .map(s -> ResponseEntity.ok(s.getOllamaSummary() != null ? s.getOllamaSummary() : "No summary yet."))
                .orElse(ResponseEntity.ok("No data for this week yet."));
    }

    @GetMapping("/monthly")
    public ResponseEntity<Map<String, Object>> monthly(@AuthenticationPrincipal User user) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd   = monthStart.plusMonths(1).minusDays(1);

        List<EcoWeeklyStats> weeks = statsRepository
                .findByUserIdAndWeekStartDateBetween(user.getId(), monthStart, monthEnd);

        Map<String, Object> result = new HashMap<>();
        result.put("month",              monthStart.format(DateTimeFormatter.ofPattern("MMMM yyyy")));
        result.put("totalSavedVsSolo",   weeks.stream().mapToDouble(w -> w.getSavedVsSolo().doubleValue()).sum());
        result.put("totalSavedVsGrab",   weeks.stream().mapToDouble(w -> w.getSavedVsGrab().doubleValue()).sum());
        result.put("totalCarbonSavedKg", weeks.stream().mapToDouble(w -> w.getCarbonSavedKg().doubleValue()).sum());
        result.put("totalCarpoolTrips",  weeks.stream().mapToInt(EcoWeeklyStats::getCarpoolTrips).sum());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/habits")
    public ResponseEntity<Map<String, Object>> habits(@AuthenticationPrincipal User user) {
        Vehicle vehicle = vehicleRepository.findFirstByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);

        List<FuelLog> logs = fuelLogRepository
                .findTop5ByUserIdAndIsFullTankTrueAndEfficiencyThisFillIsNotNullOrderByLogDateDesc(user.getId());

        List<Double> efficiencies = logs.stream()
                .map(l -> l.getEfficiencyThisFill().doubleValue())
                .toList();

        double avgEff     = efficiencies.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double defaultEff = vehicle != null ? vehicle.getAvgEfficiency().doubleValue() : 0;
        String status     = avgEff >= defaultEff ? "GOOD" : avgEff >= defaultEff * 0.85 ? "AVERAGE" : "BELOW";

        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        EcoWeeklyStats week = statsRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().build());

        int total   = week.getTotalTrips()   != null ? week.getTotalTrips()   : 0;
        int carpool = week.getCarpoolTrips() != null ? week.getCarpoolTrips() : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("avgEfficiencyKmPerL",      Math.round(avgEff * 10.0) / 10.0);
        result.put("vehicleDefaultEfficiency", defaultEff);
        result.put("efficiencyTrend",          efficiencies);
        result.put("efficiencyStatus",         status);
        result.put("carpoolRatePercent",       total > 0 ? Math.round((double) carpool / total * 100) : 0);
        result.put("carpoolTripsThisWeek",     carpool);
        result.put("totalTripsThisWeek",       total);

        if (vehicle != null && vehicle.getFuelType() == Vehicle.FuelType.RON95_BUDI95) {
            double used = budi95Service.getBudi95UsedThisMonth(user.getId());
            Map<String, Object> budi = new HashMap<>();
            budi.put("usedLitres",      Math.round(used * 10.0) / 10.0);
            budi.put("limitLitres",     300);
            budi.put("remainingLitres", Math.round(Math.max(0, 300 - used) * 10.0) / 10.0);
            budi.put("limitExceeded",   used >= 300);
            result.put("budi95", budi);
        }

        return ResponseEntity.ok(result);
    }
}
