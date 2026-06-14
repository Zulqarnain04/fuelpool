package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.RideRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {
    List<RideRequest> findByRideIdAndStatus(Long rideId, RideRequest.RequestStatus status);
    List<RideRequest> findByPassengerIdOrderByCreatedAtDesc(Long passengerId);
    boolean existsByRideIdAndPassengerIdAndStatusNot(Long rideId, Long passengerId, RideRequest.RequestStatus status);

    // Used by the demo seeder to clear child rows before deleting rides/users.
    @Modifying
    @Transactional
    void deleteByRideIdIn(List<Long> rideIds);

    @Modifying
    @Transactional
    void deleteByPassengerIdIn(List<Long> passengerIds);
}
