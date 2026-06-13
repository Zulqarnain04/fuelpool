package com.fuelpool.fuelpool_backend.dto.response;

import com.fuelpool.fuelpool_backend.model.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    private User.Gender gender;
    private boolean isDriver;
}
