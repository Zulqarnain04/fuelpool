package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<User> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me")
    public ResponseEntity<User> updateMe(@AuthenticationPrincipal User user,
                                         @RequestBody java.util.Map<String, String> updates) {
        if (updates.containsKey("name")) user.setName(updates.get("name"));
        if (updates.containsKey("fcmToken")) user.setFcmToken(updates.get("fcmToken"));
        return ResponseEntity.ok(userRepository.save(user));
    }
}
