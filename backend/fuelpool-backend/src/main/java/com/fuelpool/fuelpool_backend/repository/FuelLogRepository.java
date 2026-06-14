package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.FuelLog;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FuelLogRepository extends JpaRepository<FuelLog, Long> {
    Page<FuelLog> findByUserIdOrderByLogDateDesc(Long userId, Pageable pageable);
    List<FuelLog> findByUserIdOrderByLogDateDesc(Long userId);
    Optional<FuelLog> findTopByUserIdOrderByLogDateDesc(Long userId);
    Optional<FuelLog> findTopByVehicleIdOrderByLogDateDesc(Long vehicleId);

    @Query("SELECT SUM(f.litresFilled) FROM FuelLog f WHERE f.user.id = :userId AND f.fuelType = :fuelType AND f.logDate >= :monthStart")
    Double sumBudi95LitresThisMonth(Long userId, LocalDateTime monthStart,
                                    @Param("fuelType") Vehicle.FuelType fuelType);

    List<FuelLog> findTop3ByUserIdAndDistanceSinceLastIsNotNullOrderByLogDateDesc(Long userId);
    List<FuelLog> findTop5ByVehicleIdAndIsFullTankTrueOrderByLogDateDesc(Long vehicleId);
    List<FuelLog> findTop5ByUserIdAndIsFullTankTrueAndEfficiencyThisFillIsNotNullOrderByLogDateDesc(Long userId);

    @Query("SELECT SUM(f.totalCost) FROM FuelLog f WHERE f.user.id = :userId AND f.logDate >= :from AND f.logDate < :to")
    Double sumTotalCostBetween(Long userId, LocalDateTime from, LocalDateTime to);

    @Modifying
    @Transactional
    void deleteAllByUserIdIn(List<Long> userIds);
}
