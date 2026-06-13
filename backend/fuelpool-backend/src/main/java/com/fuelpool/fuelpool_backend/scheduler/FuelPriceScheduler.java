package com.fuelpool.fuelpool_backend.scheduler;

import com.fuelpool.fuelpool_backend.service.mof.MOFScraperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FuelPriceScheduler {

    private final MOFScraperService scraperService;

    @Scheduled(cron = "0 0 17 * * WED")
    public void scrapeWeeklyFuelPrice() {
        log.info("FuelPriceScheduler: Wednesday 5PM — triggering MOF scraper");
        scraperService.scrapeAndProcess();
    }
}
