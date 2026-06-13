package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fuel_prices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate priceDate;

    @Column(precision = 5, scale = 3)
    private BigDecimal ron95;

    @Column(precision = 5, scale = 3)
    private BigDecimal ron97;

    @Column(precision = 5, scale = 3)
    private BigDecimal diesel;

    @Column(name = "diesel_eastmsia", precision = 5, scale = 3)
    private BigDecimal dieselEastMsia;

    @Column(name = "ron95_budi95", precision = 5, scale = 3)
    private BigDecimal ron95Budi95;

    @Column(name = "ron95_skps", precision = 5, scale = 3)
    private BigDecimal ron95Skps;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
