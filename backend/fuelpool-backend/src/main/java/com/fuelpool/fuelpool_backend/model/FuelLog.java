package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fuel_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(nullable = false)
    private LocalDateTime logDate;

    @Column(nullable = false)
    private Integer odometer;

    @Column(nullable = false, precision = 6, scale = 3)
    private BigDecimal litresFilled;

    @Column(nullable = false, precision = 5, scale = 3)
    private BigDecimal pricePerLitre;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal totalCost;

    @Builder.Default
    @Column(nullable = false)
    private boolean isFullTank = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean isMissedPrevious = false;

    private String stationName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Vehicle.FuelType fuelType;

    @Column(length = 500)
    private String notes;

    private Integer distanceSinceLast;

    @Column(precision = 5, scale = 2)
    private BigDecimal efficiencyThisFill;

    @Column(precision = 6, scale = 4)
    private BigDecimal costPerKm;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
