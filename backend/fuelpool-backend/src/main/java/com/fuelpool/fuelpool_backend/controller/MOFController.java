package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.model.MOFArticle;
import com.fuelpool.fuelpool_backend.repository.MOFArticleRepository;
import com.fuelpool.fuelpool_backend.service.mof.MOFScraperService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fuel/mof")
@RequiredArgsConstructor
public class MOFController {

    private final MOFArticleRepository mofArticleRepository;
    private final MOFScraperService scraperService;

    @GetMapping("/latest")
    public ResponseEntity<MOFArticle> latest() {
        return mofArticleRepository.findTopByOrderByFetchedAtDesc()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/trigger")
    public ResponseEntity<String> trigger() {
        scraperService.scrapeAndProcess();
        return ResponseEntity.ok("MOF scraper triggered");
    }
}
