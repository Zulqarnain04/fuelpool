package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.RoutineRequest;
import com.fuelpool.fuelpool_backend.model.Routine;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.service.routine.RoutineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @PostMapping
    public ResponseEntity<Routine> create(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody RoutineRequest req) {
        return ResponseEntity.ok(routineService.create(user, req));
    }

    @GetMapping
    public ResponseEntity<List<Routine>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(routineService.getForUser(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Routine> update(@AuthenticationPrincipal User user,
                                          @PathVariable Long id,
                                          @Valid @RequestBody RoutineRequest req) {
        return ResponseEntity.ok(routineService.update(id, user, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        routineService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<Routine> toggle(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(routineService.toggle(id, user));
    }
}
