package com.fuelpool.fuelpool_backend.scheduler;

import com.fuelpool.fuelpool_backend.service.eco.WeeklySummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeeklySummaryScheduler {

    private final WeeklySummaryService weeklySummaryService;

    @Scheduled(cron = "0 0 0 * * SUN")
    public void generateWeeklySummaries() {
        log.info("WeeklySummaryScheduler: Sunday midnight — generating weekly summaries");
        weeklySummaryService.generateForAllUsers();
    }
}
