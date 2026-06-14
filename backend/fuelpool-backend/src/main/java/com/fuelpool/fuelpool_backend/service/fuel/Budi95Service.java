package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.FuelLogRepository;
import com.fuelpool.fuelpool_backend.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class Budi95Service {

    private static final double BUDI95_MONTHLY_LIMIT = 300.0;

    private final FuelLogRepository fuelLogRepository;
    private final NotificationService notificationService;

    public double getBudi95UsedThisMonth(Long userId) {
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        Double used = fuelLogRepository.sumBudi95LitresThisMonth(userId, monthStart, Vehicle.FuelType.RON95_BUDI95);
        return used != null ? used : 0.0;
    }

    public boolean isOverLimit(Long userId) {
        return getBudi95UsedThisMonth(userId) >= BUDI95_MONTHLY_LIMIT;
    }

    public void checkAndNotifyLimit(Long userId) {
        double used = getBudi95UsedThisMonth(userId);
        if (used >= BUDI95_MONTHLY_LIMIT) {
            notificationService.send(userId,
                    "BUDI95 Limit Reached",
                    "You have exceeded the 300L BUDI95 monthly limit. Market rate applies.");
        }
    }

    public double getRemainingBudi95(Long userId) {
        return Math.max(0, BUDI95_MONTHLY_LIMIT - getBudi95UsedThisMonth(userId));
    }
}
