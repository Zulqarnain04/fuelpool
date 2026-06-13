package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.RideJoinRequest;
import com.fuelpool.fuelpool_backend.model.RideRequest;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.service.carpool.RideRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class RideRequestController {

    private final RideRequestService rideRequestService;

    @PostMapping("/api/rides/{rideId}/request")
    public ResponseEntity<RideRequest> submit(@AuthenticationPrincipal User user,
                                              @PathVariable Long rideId,
                                              @Valid @RequestBody RideJoinRequest req) {
        return ResponseEntity.ok(rideRequestService.submitRequest(user, rideId, req));
    }

    @PutMapping("/api/ride-requests/{id}/accept")
    public ResponseEntity<RideRequest> accept(@AuthenticationPrincipal User user,
                                              @PathVariable Long id) {
        return ResponseEntity.ok(rideRequestService.accept(id, user));
    }

    @PutMapping("/api/ride-requests/{id}/reject")
    public ResponseEntity<RideRequest> reject(@AuthenticationPrincipal User user,
                                              @PathVariable Long id) {
        return ResponseEntity.ok(rideRequestService.reject(id, user));
    }

    @PutMapping("/api/ride-requests/{id}/cancel")
    public ResponseEntity<RideRequest> cancel(@AuthenticationPrincipal User user,
                                              @PathVariable Long id) {
        return ResponseEntity.ok(rideRequestService.cancel(id, user));
    }
}
