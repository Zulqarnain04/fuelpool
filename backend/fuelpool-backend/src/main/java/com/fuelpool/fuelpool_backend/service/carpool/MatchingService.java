package com.fuelpool.fuelpool_backend.service.carpool;

import com.fuelpool.fuelpool_backend.dto.response.RideMatchResponse;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.RideRequest;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.RideRepository;
import com.fuelpool.fuelpool_backend.repository.RideRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final double DEST_RADIUS_M = 500.0;
    private static final double PICKUP_RADIUS_M = 1000.0;
    private static final int TIME_WINDOW_MIN = 15;

    private final RideRepository rideRepository;
    private final RideRequestRepository rideRequestRepository;
    private final RouteService routeService;
    private final FareCalculationService fareService;

    public List<RideMatchResponse> match(User passenger,
                                         double pickupLat, double pickupLng,
                                         double dropoffLat, double dropoffLng,
                                         LocalDateTime requestedTime) {

        // Step 1 — Time filter
        List<Ride> candidates = rideRepository.findByStatusAndDepartureTimeBetween(
                Ride.RideStatus.OPEN,
                requestedTime.minusMinutes(TIME_WINDOW_MIN),
                requestedTime.plusMinutes(TIME_WINDOW_MIN)
        );

        // Filter rides with available seats
        candidates = candidates.stream()
                .filter(r -> r.getConfirmedPassengers() < r.getMaxSeats())
                .toList();

        // Step 2 — Destination proximity filter
        candidates = candidates.stream()
                .filter(r -> routeService.haversineMetres(
                        r.getDestinationLat().doubleValue(), r.getDestinationLng().doubleValue(),
                        dropoffLat, dropoffLng) <= DEST_RADIUS_M)
                .toList();

        // Step 3 — Gender safety filter
        List<Ride> safe = new ArrayList<>();
        for (Ride ride : candidates) {
            if (passenger.getGender() == User.Gender.FEMALE
                    && ride.getDriver().getGender() == User.Gender.MALE) {

                List<RideRequest> accepted = rideRequestRepository
                        .findByRideIdAndStatus(ride.getId(), RideRequest.RequestStatus.ACCEPTED);

                long femalePassengers = accepted.stream()
                        .filter(rr -> rr.getPassenger().getGender() == User.Gender.FEMALE)
                        .count();

                if (femalePassengers == 0) continue;
            }
            safe.add(ride);
        }

        // Step 4 — Score and rank
        List<RideMatchResponse> results = new ArrayList<>();
        for (Ride ride : safe) {
            long timeDiffMin = Math.abs(java.time.Duration.between(ride.getDepartureTime(), requestedTime).toMinutes());
            double pickupDist = routeService.haversineMetres(
                    ride.getOriginLat().doubleValue(), ride.getOriginLng().doubleValue(),
                    pickupLat, pickupLng);
            double seatFill = (double)(ride.getConfirmedPassengers() + 1) / ride.getMaxSeats();

            double score = (1 - timeDiffMin / 15.0) * 0.4
                    + (1 - Math.min(pickupDist, PICKUP_RADIUS_M) / PICKUP_RADIUS_M) * 0.35
                    + seatFill * 0.25;

            BigDecimal fare = ride.getEstimatedFarePerPerson();
            BigDecimal saved = fare != null && ride.getEstimatedDistanceKm() != null
                    ? fareService.grabEstimate(ride.getEstimatedDistanceKm().doubleValue()).subtract(fare)
                    : BigDecimal.ZERO;

            results.add(RideMatchResponse.builder()
                    .rideId(ride.getId())
                    .driverName(ride.getDriver().getName())
                    .driverRating(ride.getDriver().getDriverRating().doubleValue())
                    .vehicleMake(ride.getVehicle().getMake())
                    .vehicleModel(ride.getVehicle().getModel())
                    .vehicleColor(ride.getVehicle().getColor())
                    .plateNumber(ride.getVehicle().getPlateNumber())
                    .departureTime(ride.getDepartureTime())
                    .availableSeats(ride.getMaxSeats() - ride.getConfirmedPassengers())
                    .farePerPerson(fare)
                    .savedVsGrab(saved)
                    .matchScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP).doubleValue())
                    .pickupDistanceMetres(Math.round(pickupDist * 10.0) / 10.0)
                    .originLabel(ride.getOriginLabel())
                    .destinationLabel(ride.getDestinationLabel())
                    .build());
        }

        // Step 5 — Top 5 by score
        results.sort(Comparator.comparingDouble(RideMatchResponse::getMatchScore).reversed());
        return results.stream().limit(5).toList();
    }
}
