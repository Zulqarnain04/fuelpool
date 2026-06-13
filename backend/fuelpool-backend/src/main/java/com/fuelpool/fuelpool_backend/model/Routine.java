package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "routines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    // comma-separated: "MON,TUE,WED,THU,FRI"
    @Column(nullable = false, length = 50)
    private String daysOfWeek;

    @Column(nullable = false)
    private LocalTime departureTime;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal originLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal originLng;

    @Column(length = 200)
    private String originLabel;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal destLat;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal destLng;

    @Column(length = 200)
    private String destLabel;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private RolePreference rolePreference = RolePreference.EITHER;

    @Builder.Default
    private boolean autoRequest = false;

    @Builder.Default
    private boolean isActive = true;

    private LocalDateTime lastTriggered;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RolePreference {
        DRIVER, PASSENGER, EITHER
    }
}
