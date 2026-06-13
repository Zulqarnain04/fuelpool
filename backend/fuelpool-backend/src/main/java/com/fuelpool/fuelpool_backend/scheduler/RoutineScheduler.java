package com.fuelpool.fuelpool_backend.scheduler;

import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.Routine;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.RideRepository;
import com.fuelpool.fuelpool_backend.repository.RoutineRepository;
import com.fuelpool.fuelpool_backend.service.carpool.MatchingService;
import com.fuelpool.fuelpool_backend.service.carpool.RideRequestService;
import com.fuelpool.fuelpool_backend.service.carpool.RideService;
import com.fuelpool.fuelpool_backend.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RoutineScheduler {

    private final RoutineRepository routineRepository;
    private final MatchingService matchingService;
    private final RideRequestService rideRequestService;
    private final RideService rideService;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 * * * * *")
    public void processRoutines() {
        LocalTime triggerTime = LocalTime.now().plusMinutes(30).withSecond(0).withNano(0);
        DayOfWeek today = LocalDate.now().getDayOfWeek();
        String dayAbbr = today.name().substring(0, 3); // MON, TUE, etc.

        List<Routine> routines = routineRepository.findActiveByDayAndTime(dayAbbr, triggerTime);

        for (Routine routine : routines) {
            User user = routine.getUser();
            try {
                if (routine.isAutoRequest()) {
                    handleAutoRequest(routine, user);
                } else {
                    notificationService.sendRoutineReminder(user.getId(), routine.getName(),
                            routine.getDepartureTime().toString());
                }
            } catch (Exception e) {
                log.warn("Routine processing failed for routine {}: {}", routine.getId(), e.getMessage());
            }
        }
    }

    private void handleAutoRequest(Routine routine, User user) {
        if (routine.getRolePreference() == Routine.RolePreference.PASSENGER
                || routine.getRolePreference() == Routine.RolePreference.EITHER) {

            var matches = matchingService.match(user,
                    routine.getOriginLat().doubleValue(), routine.getOriginLng().doubleValue(),
                    routine.getDestLat().doubleValue(), routine.getDestLng().doubleValue(),
                    LocalDate.now().atTime(routine.getDepartureTime()));

            if (!matches.isEmpty()) {
                var best = matches.get(0);
                Ride ride = rideService.findById(best.getRideId());
                rideRequestService.createFromRoutine(user, ride, routine);
                notificationService.send(user.getId(), "Ride Auto-Requested",
                        "We've requested a ride for you. " + best.getDriverName() +
                        "'s " + best.getVehicleMake() + " — RM " + best.getFarePerPerson() +
                        ", " + ride.getDepartureTime().toLocalTime());
            } else {
                notificationService.send(user.getId(), "No Ride Found",
                        "No ride found for your " + routine.getDepartureTime() + " commute. You'll be driving solo today.");
            }
        }

        if ((routine.getRolePreference() == Routine.RolePreference.DRIVER
                || routine.getRolePreference() == Routine.RolePreference.EITHER)
                && !rideService.hasPostedRideToday(user.getId())) {
            log.info("Routine DRIVER auto-post not yet implemented (requires vehicle selection logic)");
        }
    }
}
