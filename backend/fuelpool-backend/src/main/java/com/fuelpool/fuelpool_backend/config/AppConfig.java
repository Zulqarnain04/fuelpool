package com.fuelpool.fuelpool_backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fuelpool.fuelpool_backend.service.auth.AuthService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;

@Configuration
public class AppConfig {

    @Bean
    public UserDetailsService userDetailsService(AuthService authService) {
        return authService;
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
