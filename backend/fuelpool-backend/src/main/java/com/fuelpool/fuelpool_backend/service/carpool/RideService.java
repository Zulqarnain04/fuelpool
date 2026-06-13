package com.fuelpool.fuelpool_backend.service.carpool;

import com.fuelpool.fuelpool_backend.dto.request.RidePostRequest;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.*;
import com.fuelpool.fuelpool_backend.repository.*;
import com.fuelpool.fuelpool_backend.service.eco.CarbonService;
import com.fuelpool.fuelpool_backend.service.eco.SavingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final VehicleRepository vehicleRepository;
    private final RideRequestRepository rideRequestRepository;
    private final TripPassengerRepository tripPassengerRepository;
    private final EcoWeeklyStatsRepository ecoWeeklyStatsRepository;
    private final FareCalculationService fareService;
    private final RouteService routeService;
    private final CarbonService carbonService;
    private final SavingsService savingsService;

    public Ride createRide(User driver, RidePostRequest req) {
        Vehicle vehicle = vehicleRepository.findById(req.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", req.getVehicleId()));

        if (!vehicle.getUser().getId().equals(driver.getId())) {
            throw new BusinessException("Vehicle does not belong to this user");
        }

        double distKm = req.getEstimatedDistanceKm() != null
                ? req.getEstimatedDistanceKm().doubleValue() : 5.0;

        var fareBreakdown = fareService.calculate(distKm, vehicle, 1);

        String mapsUrl = routeService.buildGoogleMapsUrl(
                req.getOriginLat().doubleValue(), req.getOriginLng().doubleValue(),
                req.getDestinationLat().doubleValue(), req.getDestinationLng().doubleValue(),
                List.of()
        );

        Ride ride = Ride.builder()
                .driver(driver)
                .vehicle(vehicle)
                .originLat(req.getOriginLat())
                .originLng(req.getOriginLng())
                .originLabel(req.getOriginLabel())
                .destinationLat(req.getDestinationLat())
                .destinationLng(req.getDestinationLng())
                .destinationLabel(req.getDestinationLabel())
                .departureTime(req.getDepartureTime())
                .maxSeats(req.getMaxSeats())
                .estimatedDistanceKm(req.getEstimatedDistanceKm())
                .estimatedFarePerPerson(fareBreakdown.getFarePerPerson())
                .fuelCostTotal(fareBreakdown.getFuelCostTotal())
                .googleMapsUrl(mapsUrl)
                .build();

        return rideRepository.save(ride);
    }

    public Ride startRide(Long rideId, User driver) {
        Ride ride = findAndVerifyDriver(rideId, driver);
        if (ride.getStatus() != Ride.RideStatus.OPEN && ride.getStatus() != Ride.RideStatus.FULL) {
            throw new BusinessException("Ride cannot be started in status: " + ride.getStatus());
        }

        List<RideRequest> accepted = rideRequestRepository.findByRideIdAndStatus(rideId, RideRequest.RequestStatus.ACCEPTED);

        // Rebuild Google Maps URL with actual pickup waypoints ordered by nearest-neighbour
        List<RideRequest> ordered = routeService.orderPickups(
                ride.getOriginLat().doubleValue(), ride.getOriginLng().doubleValue(), accepted);

        String mapsUrl = routeService.buildGoogleMapsUrl(
                ride.getOriginLat().doubleValue(), ride.getOriginLng().doubleValue(),
                ride.getDestinationLat().doubleValue(), ride.getDestinationLng().doubleValue(),
                ordered);

        ride.setGoogleMapsUrl(mapsUrl);
        ride.setStatus(Ride.RideStatus.IN_PROGRESS);
        return rideRepository.save(ride);
    }

    public Ride completeRide(Long rideId, User driver) {
        Ride ride = findAndVerifyDriver(rideId, driver);
        if (ride.getStatus() != Ride.RideStatus.IN_PROGRESS) {
            throw new BusinessException("Ride is not in progress");
        }

        ride.setStatus(Ride.RideStatus.COMPLETED);
        rideRepository.save(ride);

        // Log trip for each accepted passenger
        List<RideRequest> accepted = rideRequestRepository.findByRideIdAndStatus(rideId, RideRequest.RequestStatus.ACCEPTED);
        int totalOccupants = accepted.size() + 1;
        double distKm = ride.getEstimatedDistanceKm() != null ? ride.getEstimatedDistanceKm().doubleValue() : 5.0;

        for (RideRequest rr : accepted) {
            var fare = fareService.calculate(distKm, ride.getVehicle(), totalOccupants);
            double carbonSaved = carbonService.carbonSavedByPassenger(distKm, ride.getVehicle(), totalOccupants);
            double carbonEmitted = carbonService.passengerShareCarbon(distKm, ride.getVehicle(), totalOccupants);
            BigDecimal savedVsSolo = savingsService.savedVsSolo(distKm, ride.getVehicle(), fare.getFarePerPerson());
            BigDecimal savedVsGrab = savingsService.savedVsGrab(distKm, fare.getFarePerPerson());

            TripPassenger tp = TripPassenger.builder()
                    .ride(ride)
                    .passenger(rr.getPassenger())
                    .driver(driver)
                    .tripDate(LocalDateTime.now())
                    .distanceKm(BigDecimal.valueOf(distKm))
                    .farePaid(fare.getFarePerPerson())
                    .carbonEmittedKg(BigDecimal.valueOf(carbonEmitted).setScale(4, RoundingMode.HALF_UP))
                    .carbonSavedKg(BigDecimal.valueOf(carbonSaved).setScale(4, RoundingMode.HALF_UP))
                    .savedVsSolo(savedVsSolo)
                    .savedVsGrab(savedVsGrab)
                    .build();

            tripPassengerRepository.save(tp);
            savingsService.upsertWeeklyStats(rr.getPassenger(), tp);
        }

        return ride;
    }

    public Ride cancelRide(Long rideId, User driver) {
        Ride ride = findAndVerifyDriver(rideId, driver);
        if (ride.getStatus() == Ride.RideStatus.COMPLETED) {
            throw new BusinessException("Cannot cancel a completed ride");
        }
        ride.setStatus(Ride.RideStatus.CANCELLED);
        return rideRepository.save(ride);
    }

    public boolean hasPostedRideToday(Long userId) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        return rideRepository.existsRideByDriverToday(userId, start, end);
    }

    public Ride findById(Long id) {
        return rideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ride", id));
    }

    private Ride findAndVerifyDriver(Long rideId, User driver) {
        Ride ride = findById(rideId);
        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new BusinessException("You are not the driver of this ride");
        }
        return ride;
    }
}
