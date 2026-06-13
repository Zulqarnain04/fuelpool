package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal originLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal originLng;

    @Column(length = 200)
    private String originLabel;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal destinationLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal destinationLng;

    @Column(length = 200)
    private String destinationLabel;

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Builder.Default
    @Column(nullable = false)
    private Integer maxSeats = 3;

    @Builder.Default
    private Integer confirmedPassengers = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private RideStatus status = RideStatus.OPEN;

    @Column(precision = 8, scale = 2)
    private BigDecimal estimatedDistanceKm;

    @Column(precision = 8, scale = 2)
    private BigDecimal estimatedFarePerPerson;

    @Column(precision = 8, scale = 2)
    private BigDecimal fuelCostTotal;

    @Column(length = 2000)
    private String googleMapsUrl;

    private Long fromRoutineId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RideStatus {
        OPEN, FULL, IN_PROGRESS, COMPLETED, CANCELLED
    }
}
