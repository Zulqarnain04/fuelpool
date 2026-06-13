package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_passengers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPassenger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false)
    private LocalDateTime tripDate;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal farePaid;

    @Column(precision = 8, scale = 4)
    private BigDecimal carbonEmittedKg;

    @Column(precision = 8, scale = 4)
    private BigDecimal carbonSavedKg;

    @Column(precision = 8, scale = 2)
    private BigDecimal savedVsSolo;

    @Column(precision = 8, scale = 2)
    private BigDecimal savedVsGrab;

    private Integer driverRating;

    private Integer passengerRatingGiven;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
