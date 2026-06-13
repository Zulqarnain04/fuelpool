package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.FuelLogRequest;
import com.fuelpool.fuelpool_backend.model.FuelLog;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.service.fuel.FuelLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fuel/logs")
@RequiredArgsConstructor
public class FuelLogController {

    private final FuelLogService fuelLogService;

    @PostMapping
    public ResponseEntity<FuelLog> create(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody FuelLogRequest req) {
        return ResponseEntity.ok(fuelLogService.save(user, req));
    }

    @GetMapping
    public ResponseEntity<Page<FuelLog>> list(@AuthenticationPrincipal User user,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(fuelLogService.getLogs(user, PageRequest.of(page, size)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        fuelLogService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
