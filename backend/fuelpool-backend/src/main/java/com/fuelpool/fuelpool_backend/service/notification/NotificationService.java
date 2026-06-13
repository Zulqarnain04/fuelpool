package com.fuelpool.fuelpool_backend.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationService {

    public void send(Long userId, String title, String body) {
        log.info("[FCM] → userId={} | title='{}' | body='{}'", userId, title, body);
    }

    public void sendToAll(String title, String body) {
        log.info("[FCM BROADCAST] | title='{}' | body='{}'", title, body);
    }

    public void sendRoutineReminder(Long userId, String routineName, String departureTime) {
        send(userId, "Routine Reminder",
                "Your routine '" + routineName + "' departs in 30 mins at " + departureTime + ". Tap to request a ride.");
    }
}
