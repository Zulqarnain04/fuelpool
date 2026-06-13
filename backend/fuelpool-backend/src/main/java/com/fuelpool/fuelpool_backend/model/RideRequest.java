package com.fuelpool.fuelpool_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ride_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User passenger;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLng;

    @Column(length = 200)
    private String pickupLabel;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal dropoffLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal dropoffLng;

    @Column(length = 200)
    private String dropoffLabel;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(precision = 8, scale = 2)
    private BigDecimal fareAmount;

    private Long fromRoutineId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RequestStatus {
        PENDING, ACCEPTED, REJECTED, CANCELLED
    }
}
