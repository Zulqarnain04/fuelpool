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
@Table(name = "vehicles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User user;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    private Integer year;
    private String color;
    private String plateNumber;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal tankCapacity;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal avgEfficiency;

    @Column(precision = 5, scale = 2)
    private BigDecimal currentFuelLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FuelType fuelType;

    @Builder.Default
    private Integer currentOdometer = 0;

    @Builder.Default
    private boolean isPrimary = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum FuelType {
        RON95_MARKET, RON95_BUDI95, RON97, DIESEL, DIESEL_EAST
    }
}
