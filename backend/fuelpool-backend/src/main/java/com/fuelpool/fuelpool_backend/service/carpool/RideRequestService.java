package com.fuelpool.fuelpool_backend.service.carpool;

import com.fuelpool.fuelpool_backend.dto.request.RideJoinRequest;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.RideRequest;
import com.fuelpool.fuelpool_backend.model.Routine;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.RideRepository;
import com.fuelpool.fuelpool_backend.repository.RideRequestRepository;
import com.fuelpool.fuelpool_backend.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final RideRepository rideRepository;
    private final FareCalculationService fareService;
    private final NotificationService notificationService;

    public RideRequest submitRequest(User passenger, Long rideId, RideJoinRequest req) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride", rideId));

        if (ride.getStatus() != Ride.RideStatus.OPEN) {
            throw new BusinessException("This ride is not accepting requests");
        }
        if (ride.getDriver().getId().equals(passenger.getId())) {
            throw new BusinessException("Driver cannot request their own ride");
        }
        if (rideRequestRepository.existsByRideIdAndPassengerIdAndStatusNot(
                rideId, passenger.getId(), RideRequest.RequestStatus.CANCELLED)) {
            throw new BusinessException("You have already requested this ride");
        }

        int totalOccupants = ride.getConfirmedPassengers() + 2; // existing + this passenger + driver
        double distKm = ride.getEstimatedDistanceKm() != null ? ride.getEstimatedDistanceKm().doubleValue() : 5.0;
        BigDecimal fare = fareService.calculate(distKm, ride.getVehicle(), totalOccupants).getFarePerPerson();

        RideRequest rr = RideRequest.builder()
                .ride(ride)
                .passenger(passenger)
                .pickupLat(req.getPickupLat())
                .pickupLng(req.getPickupLng())
                .pickupLabel(req.getPickupLabel())
                .dropoffLat(req.getDropoffLat())
                .dropoffLng(req.getDropoffLng())
                .dropoffLabel(req.getDropoffLabel())
                .fareAmount(fare)
                .build();

        rideRequestRepository.save(rr);
        notificationService.send(ride.getDriver().getId(), "New Ride Request",
                passenger.getName() + " wants to join your ride.");
        return rr;
    }

    public RideRequest accept(Long requestId, User driver) {
        RideRequest rr = findAndVerifyDriver(requestId, driver);
        Ride ride = rr.getRide();

        if (ride.getConfirmedPassengers() >= ride.getMaxSeats()) {
            throw new BusinessException("Ride is already full");
        }

        rr.setStatus(RideRequest.RequestStatus.ACCEPTED);
        ride.setConfirmedPassengers(ride.getConfirmedPassengers() + 1);
        if (ride.getConfirmedPassengers() >= ride.getMaxSeats()) {
            ride.setStatus(Ride.RideStatus.FULL);
        }

        // Recalculate fare with updated occupant count
        double distKm = ride.getEstimatedDistanceKm() != null ? ride.getEstimatedDistanceKm().doubleValue() : 5.0;
        int totalOccupants = ride.getConfirmedPassengers() + 1;
        BigDecimal newFare = fareService.calculate(distKm, ride.getVehicle(), totalOccupants).getFarePerPerson();
        rr.setFareAmount(newFare);
        ride.setEstimatedFarePerPerson(newFare);
        rideRepository.save(ride);

        rideRequestRepository.save(rr);
        notificationService.send(rr.getPassenger().getId(), "Ride Accepted",
                "Your ride request was accepted. Fare: RM " + newFare);
        return rr;
    }

    public RideRequest reject(Long requestId, User driver) {
        RideRequest rr = findAndVerifyDriver(requestId, driver);
        rr.setStatus(RideRequest.RequestStatus.REJECTED);
        rideRequestRepository.save(rr);
        notificationService.send(rr.getPassenger().getId(), "Ride Request Rejected",
                "Your ride request was not accepted. Try finding another ride.");
        return rr;
    }

    public RideRequest cancel(Long requestId, User passenger) {
        RideRequest rr = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("RideRequest", requestId));
        if (!rr.getPassenger().getId().equals(passenger.getId())) {
            throw new BusinessException("Not your request");
        }
        if (rr.getStatus() == RideRequest.RequestStatus.ACCEPTED) {
            Ride ride = rr.getRide();
            ride.setConfirmedPassengers(Math.max(0, ride.getConfirmedPassengers() - 1));
            if (ride.getStatus() == Ride.RideStatus.FULL) ride.setStatus(Ride.RideStatus.OPEN);
            rideRepository.save(ride);
        }
        rr.setStatus(RideRequest.RequestStatus.CANCELLED);
        return rideRequestRepository.save(rr);
    }

    public RideRequest createFromRoutine(User passenger, Ride ride, Routine routine) {
        RideJoinRequest req = new RideJoinRequest();
        req.setPickupLat(routine.getOriginLat());
        req.setPickupLng(routine.getOriginLng());
        req.setPickupLabel(routine.getOriginLabel());
        req.setDropoffLat(routine.getDestLat());
        req.setDropoffLng(routine.getDestLng());
        req.setDropoffLabel(routine.getDestLabel());
        RideRequest rr = submitRequest(passenger, ride.getId(), req);
        rr.setFromRoutineId(routine.getId());
        return rideRequestRepository.save(rr);
    }

    private RideRequest findAndVerifyDriver(Long requestId, User driver) {
        RideRequest rr = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("RideRequest", requestId));
        if (!rr.getRide().getDriver().getId().equals(driver.getId())) {
            throw new BusinessException("You are not the driver of this ride");
        }
        return rr;
    }
}
