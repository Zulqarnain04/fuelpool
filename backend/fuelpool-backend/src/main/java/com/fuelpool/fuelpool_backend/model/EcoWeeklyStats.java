package com.fuelpool.fuelpool_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "eco_weekly_stats",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "week_start_date"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EcoWeeklyStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User user;

    @Column(nullable = false)
    private LocalDate weekStartDate;

    @Builder.Default
    private Integer totalTrips = 0;

    @Builder.Default
    private Integer carpoolTrips = 0;

    @Builder.Default
    private Integer soloTrips = 0;

    @Builder.Default
    @Column(precision = 10, scale = 4)
    private BigDecimal totalCarbonKg = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 4)
    private BigDecimal carbonSavedKg = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal totalFuelCost = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal savedVsSolo = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal savedVsGrab = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal ecoScore = BigDecimal.ZERO;

    private Integer communityRank;
    private Integer totalUsersRanked;

    @Column(columnDefinition = "TEXT")
    private String ollamaSummary;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
