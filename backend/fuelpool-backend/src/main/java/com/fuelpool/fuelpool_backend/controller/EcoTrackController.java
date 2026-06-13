package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.response.EcoDashboardResponse;
import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.service.eco.CarbonService;
import com.fuelpool.fuelpool_backend.service.eco.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/eco")
@RequiredArgsConstructor
public class EcoTrackController {

    private final EcoWeeklyStatsRepository statsRepository;
    private final LeaderboardService leaderboardService;
    private final CarbonService carbonService;

    @GetMapping("/weekly")
    public ResponseEntity<EcoDashboardResponse> weekly(@AuthenticationPrincipal User user,
                                                       @RequestParam(defaultValue = "0") int weekOffset) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(weekOffset);

        EcoWeeklyStats stats = statsRepository
                .findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(EcoWeeklyStats.builder().user(user).weekStartDate(weekStart).build());

        double trees = carbonService.treesEquivalent(stats.getCarbonSavedKg().doubleValue());
        int rank = leaderboardService.getRank(user.getId());
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
}
