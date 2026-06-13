package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.dto.request.LoginRequest;
import com.fuelpool.fuelpool_backend.dto.request.RegisterRequest;
import com.fuelpool.fuelpool_backend.dto.response.AuthResponse;
import com.fuelpool.fuelpool_backend.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
