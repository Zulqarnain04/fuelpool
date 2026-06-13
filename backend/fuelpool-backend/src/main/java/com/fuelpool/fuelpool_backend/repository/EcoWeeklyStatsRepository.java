package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.EcoWeeklyStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EcoWeeklyStatsRepository extends JpaRepository<EcoWeeklyStats, Long> {
    Optional<EcoWeeklyStats> findByUserIdAndWeekStartDate(Long userId, LocalDate weekStartDate);
    List<EcoWeeklyStats> findByWeekStartDateOrderByEcoScoreDesc(LocalDate weekStartDate);

    @Query("SELECT e FROM EcoWeeklyStats e WHERE e.user.id = :userId ORDER BY e.weekStartDate DESC")
    List<EcoWeeklyStats> findRecentByUserId(Long userId);
}
