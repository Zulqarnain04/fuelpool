package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.VehicleRequest;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleRepository vehicleRepository;

    @PostMapping
    public ResponseEntity<Vehicle> create(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody VehicleRequest req) {
        // Keep exactly one primary vehicle per user: demote any existing primary first.
        if (req.isPrimary()) {
            vehicleRepository.clearPrimaryForUser(user.getId());
        }
        Vehicle v = Vehicle.builder()
                .user(user)
                .make(req.getMake())
                .model(req.getModel())
                .year(req.getYear())
                .color(req.getColor())
                .plateNumber(req.getPlateNumber())
                .tankCapacity(req.getTankCapacity())
                .currentFuelLevel(req.getTankCapacity())
                .avgEfficiency(req.getAvgEfficiency())
                .fuelType(req.getFuelType())
                .currentOdometer(req.getCurrentOdometer() != null ? req.getCurrentOdometer() : 0)
                .isPrimary(req.isPrimary())
                .build();
        return ResponseEntity.ok(vehicleRepository.save(v));
    }

    @GetMapping
    public ResponseEntity<List<Vehicle>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vehicleRepository.findByUserId(user.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Vehicle> update(@AuthenticationPrincipal User user,
                                          @PathVariable Long id,
                                          @Valid @RequestBody VehicleRequest req) {
        Vehicle v = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", id));
        if (!v.getUser().getId().equals(user.getId())) throw new BusinessException("Not your vehicle");
        v.setMake(req.getMake()); v.setModel(req.getModel()); v.setFuelType(req.getFuelType());
        v.setTankCapacity(req.getTankCapacity()); v.setAvgEfficiency(req.getAvgEfficiency());
        return ResponseEntity.ok(vehicleRepository.save(v));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        Vehicle v = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", id));
        if (!v.getUser().getId().equals(user.getId())) throw new BusinessException("Not your vehicle");
        vehicleRepository.delete(v);
        return ResponseEntity.noContent().build();
    }
}
