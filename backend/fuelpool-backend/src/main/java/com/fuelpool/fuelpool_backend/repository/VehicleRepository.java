package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUserId(Long userId);

    // Safe even if bad data left a user with >1 primary (LIMIT 1, no NonUniqueResult).
    Optional<Vehicle> findFirstByUserIdAndIsPrimaryTrue(Long userId);

    // Demote all of a user's vehicles before saving a new primary (one-primary invariant).
    @Modifying
    @Transactional
    @Query("UPDATE Vehicle v SET v.isPrimary = false WHERE v.user.id = :userId")
    void clearPrimaryForUser(Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserIdIn(List<Long> userIds);
}
