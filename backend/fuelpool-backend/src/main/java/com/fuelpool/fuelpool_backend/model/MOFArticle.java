package com.fuelpool.fuelpool_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mof_articles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MOFArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fetchedAt;

    @Column(length = 500)
    private String title;

    @Column(length = 1000)
    private String sourceUrl;

    @Column(columnDefinition = "TEXT")
    private String rawContent;

    @Column(columnDefinition = "TEXT")
    private String ollamaAnalysis;

    @Column(columnDefinition = "TEXT")
    private String parsedChanges;

    private LocalDate effectiveDate;

    @Column(length = 500)
    private String mainReason;

    @Column(length = 500)
    private String userTip;

    @Builder.Default
    private boolean isNotified = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
