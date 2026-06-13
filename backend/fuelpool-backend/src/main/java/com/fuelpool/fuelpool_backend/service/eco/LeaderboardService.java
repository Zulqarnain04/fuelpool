package com.fuelpool.fuelpool_backend.service.eco;

import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import com.fuelpool.fuelpool_backend.repository.EcoWeeklyStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final EcoWeeklyStatsRepository statsRepository;

    public List<EcoWeeklyStats> getLeaderboard() {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        return statsRepository.findByWeekStartDateOrderByEcoScoreDesc(weekStart);
    }

    public int getRank(Long userId) {
        List<EcoWeeklyStats> board = getLeaderboard();
        for (int i = 0; i < board.size(); i++) {
            if (board.get(i).getUser().getId().equals(userId)) return i + 1;
        }
        return board.size() + 1;
    }

    public double getPercentile(Long userId) {
        List<EcoWeeklyStats> board = getLeaderboard();
        int total = board.size();
        if (total == 0) return 100.0;
        int rank = getRank(userId);
        return ((double)(total - rank + 1) / total) * 100;
    }

    public void updateRanksForCurrentWeek() {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        List<EcoWeeklyStats> sorted = statsRepository.findByWeekStartDateOrderByEcoScoreDesc(weekStart);
        int total = sorted.size();
        for (int i = 0; i < sorted.size(); i++) {
            EcoWeeklyStats s = sorted.get(i);
            s.setCommunityRank(i + 1);
            s.setTotalUsersRanked(total);
            statsRepository.save(s);
        }
    }
}
