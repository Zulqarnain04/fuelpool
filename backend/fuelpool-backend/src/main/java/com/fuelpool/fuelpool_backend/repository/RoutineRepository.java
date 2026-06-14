package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface RoutineRepository extends JpaRepository<Routine, Long> {
    List<Routine> findByUserIdAndIsActiveTrue(Long userId);

    @Query("SELECT r FROM Routine r WHERE r.isActive = true AND r.autoRequest = true AND r.daysOfWeek LIKE CONCAT('%', :day, '%') AND r.departureTime = :time")
    List<Routine> findActiveByDayAndTime(String day, LocalTime time);
}
