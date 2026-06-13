package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUserId(Long userId);
    Optional<Vehicle> findByUserIdAndIsPrimaryTrue(Long userId);
    Optional<Vehicle> findFirstByUserIdAndIsPrimaryTrue(Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserIdIn(List<Long> userIds);
}
