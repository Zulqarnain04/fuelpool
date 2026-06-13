package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.RidePostRequest;
import com.fuelpool.fuelpool_backend.dto.response.RideMatchResponse;
import com.fuelpool.fuelpool_backend.model.Ride;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.service.carpool.MatchingService;
import com.fuelpool.fuelpool_backend.service.carpool.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;
    private final MatchingService matchingService;

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
}
