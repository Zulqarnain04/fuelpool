package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByStatusAndDepartureTimeBetween(
            Ride.RideStatus status,
            LocalDateTime from,
            LocalDateTime to
    );

    @Query("SELECT COUNT(r) > 0 FROM Ride r WHERE r.driver.id = :driverId AND r.departureTime >= :dayStart AND r.departureTime < :dayEnd AND r.status != 'CANCELLED'")
    boolean existsRideByDriverToday(Long driverId, LocalDateTime dayStart, LocalDateTime dayEnd);

    List<Ride> findByDriverIdAndStatusNot(Long driverId, Ride.RideStatus status);
}
