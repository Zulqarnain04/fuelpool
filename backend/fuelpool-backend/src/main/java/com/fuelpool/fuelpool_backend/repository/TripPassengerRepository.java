package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.TripPassenger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripPassengerRepository extends JpaRepository<TripPassenger, Long> {
    List<TripPassenger> findByPassengerIdAndTripDateBetween(Long passengerId, LocalDateTime from, LocalDateTime to);
    List<TripPassenger> findByDriverIdAndTripDateBetween(Long driverId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT COUNT(t) FROM TripPassenger t WHERE t.passenger.id = :userId AND t.tripDate >= :from AND t.tripDate < :to")
    long countCarpoolTrips(Long userId, LocalDateTime from, LocalDateTime to);
}
