package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.RidePostRequest;
import com.fuelpool.fuelpool_backend.dto.response.RideMatchResponse;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.RideRequest;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.RideRepository;
import com.fuelpool.fuelpool_backend.repository.RideRequestRepository;
import com.fuelpool.fuelpool_backend.service.carpool.MatchingService;
import com.fuelpool.fuelpool_backend.service.carpool.RideService;
import com.fuelpool.fuelpool_backend.service.carpool.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;
    private final MatchingService matchingService;
    private final RouteService routeService;
    private final RideRepository rideRepository;
    private final RideRequestRepository rideRequestRepository;

    @GetMapping("/mine")
    public ResponseEntity<Map<String, Object>> myRides(@AuthenticationPrincipal User user) {
        List<Ride> asDriver = rideRepository.findByDriverIdAndStatusNot(
                user.getId(), Ride.RideStatus.CANCELLED);
        List<RideRequest> asPassenger = rideRequestRepository
                .findByPassengerIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(Map.of(
                "asDriver", asDriver,
                "asPassenger", asPassenger
        ));
    }

    @GetMapping
    public ResponseEntity<List<Ride>> list(
            @RequestParam(defaultValue = "OPEN") String status,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "5000") double radius) {

        Ride.RideStatus s = Ride.RideStatus.valueOf(status);
        List<Ride> rides = rideService.listByStatus(s);

        if (lat != null && lng != null) {
            rides = rides.stream()
                .filter(r -> routeService.haversineMetres(
                    lat, lng,
                    r.getOriginLat().doubleValue(),
                    r.getOriginLng().doubleValue()) <= radius)
                .toList();
        }
        return ResponseEntity.ok(rides);
    }

    @PostMapping
    public ResponseEntity<Ride> post(@AuthenticationPrincipal User user,
                                     @Valid @RequestBody RidePostRequest req) {
        return ResponseEntity.ok(rideService.createRide(user, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ride> get(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.findById(id));
    }

    @GetMapping("/match")
    public ResponseEntity<List<RideMatchResponse>> match(
            @AuthenticationPrincipal User user,
            @RequestParam double pickupLat,
            @RequestParam double pickupLng,
            @RequestParam double dropoffLat,
            @RequestParam double dropoffLng,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime time) {
        return ResponseEntity.ok(matchingService.match(user, pickupLat, pickupLng, dropoffLat, dropoffLng, time));
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<Ride> start(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(rideService.startRide(id, user));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Ride> complete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(rideService.completeRide(id, user));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Ride> cancel(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(rideService.cancelRide(id, user));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<Void> rate(@AuthenticationPrincipal User user,
                                     @PathVariable Long id,
                                     @RequestBody Map<String, Object> body) {
        int rating        = (Integer) body.get("rating");
        Long targetUserId = ((Number) body.get("targetUserId")).longValue();
        rideService.rateRide(id, user, targetUserId, rating);
        return ResponseEntity.ok().build();
    }
}
