package com.fuelpool.fuelpool_backend.service.eco;

import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import com.fuelpool.fuelpool_backend.repository.UserRepository;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import com.fuelpool.fuelpool_backend.service.ollama.OllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklySummaryService {

    private final EcoWeeklyStatsRepository statsRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final OllamaService ollamaService;
    private final LeaderboardService leaderboardService;

    private static final String SYSTEM_PROMPT =
            "You are a friendly fuel savings coach for a Malaysian university student. " +
            "Be encouraging, specific, and brief. Max 3 sentences.";

    public void generateForAllUsers() {
        LocalDate weekStart = LocalDate.now().minusWeeks(1).with(DayOfWeek.MONDAY);
        List<EcoWeeklyStats> allStats = statsRepository.findByWeekStartDateOrderByEcoScoreDesc(weekStart);

        for (EcoWeeklyStats stats : allStats) {
            try {
                generateForUser(stats);
            } catch (Exception e) {
                log.warn("Failed to generate summary for user {}: {}", stats.getUser().getId(), e.getMessage());
            }
        }

        leaderboardService.updateRanksForCurrentWeek();
    }

    private void generateForUser(EcoWeeklyStats stats) {
        User user = stats.getUser();
        var vehicle = vehicleRepository.findByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);
        double defaultEff = vehicle != null ? vehicle.getAvgEfficiency().doubleValue() : 15.0;

        String userPrompt = String.format(
                "Here is %s's driving data this week:\n" +
                "- Total trips: %d\n- Carpool trips: %d\n- Solo trips: %d\n" +
                "- Fuel cost: RM %.2f\n- Average efficiency: %.1f km/L (vehicle default: %.1f km/L)\n" +
                "- Carbon emitted: %.2f kg\n- Carbon saved via carpooling: %.2f kg\n" +
                "- Money saved vs driving solo: RM %.2f\n- Community rank: %s out of %s at UTM\n\n" +
                "Generate a short, personalized weekly summary with one specific tip to improve next week.",
                user.getName(),
                stats.getTotalTrips(), stats.getCarpoolTrips(), stats.getSoloTrips(),
                stats.getTotalFuelCost().doubleValue(),
                defaultEff, defaultEff,
                stats.getTotalCarbonKg().doubleValue(),
                stats.getCarbonSavedKg().doubleValue(),
                stats.getSavedVsSolo().doubleValue(),
                stats.getCommunityRank(), stats.getTotalUsersRanked()
        );

        String summary = ollamaService.generate(SYSTEM_PROMPT, userPrompt);
        if (summary != null) {
            stats.setOllamaSummary(summary.trim());
            statsRepository.save(stats);
        }
    }
}
