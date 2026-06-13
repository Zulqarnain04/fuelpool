package com.fuelpool.fuelpool_backend.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class Budi95ResetScheduler {

    // BUDI95 monthly usage is calculated live from FuelLog records filtered by month start,
    // so no state to reset — this scheduler just logs confirmation for ops visibility.
    @Scheduled(cron = "0 0 0 1 * *")
    public void logMonthlyReset() {
        log.info("Budi95ResetScheduler: New month started — BUDI95 monthly quota resets automatically (calculated from logs)");
    }
}
