package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.RideRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {
    List<RideRequest> findByRideIdAndStatus(Long rideId, RideRequest.RequestStatus status);
    List<RideRequest> findByPassengerIdOrderByCreatedAtDesc(Long passengerId);
    boolean existsByRideIdAndPassengerIdAndStatusNot(Long rideId, Long passengerId, RideRequest.RequestStatus status);
}
