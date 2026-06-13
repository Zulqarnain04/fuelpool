package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUserId(Long userId);
    Optional<Vehicle> findByUserIdAndIsPrimaryTrue(Long userId);
}
