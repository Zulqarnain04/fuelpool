# Spring Boot 4.1 + Java 21 — Compatibility Fixes
> Applied to FuelPool backend. Fix these before running or the app will break.

---

## Issues Found

| # | File | Problem | Severity |
|---|---|---|---|
| 1 | `OllamaConfig.java` | `RestTemplate` deprecated + removed path in SB4 | 🔴 Breaking |
| 2 | `OllamaService.java` | Uses `RestTemplate` — must switch to `RestClient` | 🔴 Breaking |
| 3 | `OllamaConfig.java` | `SimpleClientHttpRequestFactory` int-timeout API deprecated | 🟡 Warning |
| 4 | `SecurityConfig.java` | `allowCredentials(true)` + wildcard pattern rejected in Spring Security 7 | 🔴 Breaking |
| 5 | `SecurityConfig.java` | `/api/demo/**` not in `permitAll` | 🔴 Breaking (demo won't work) |
| 6 | `User.java` | `password` field serialized in API responses | 🔴 Security + breaks login |
| 7 | All entity `@ManyToOne` fields | Lazy load → Jackson `LazyInitializationException` on serialize | 🟡 Runtime error |
| 8 | `DemoController.java` (new) | `@Transactional` missing on seed method | 🟡 Data integrity |
| 9 | Repository bulk deletes (new) | Missing `@Modifying @Transactional` | 🟡 Runtime error |
| 10 | `application.yaml` | Virtual threads not enabled (Java 21 feature, free perf) | 🟢 Optional |

---

## Fix 1 + 2 + 3 — Replace `RestTemplate` with `RestClient`

`RestTemplate` is deprecated in Spring Framework 7 (Spring Boot 4.x) and will be removed.
`RestClient` is the replacement — same synchronous behaviour, modern API.

**`OllamaConfig.java` — full replacement:**

```java
package com.fuelpool.fuelpool_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class OllamaConfig {

    @Value("${ollama.base-url}")
    private String baseUrl;

    @Value("${ollama.model}")
    private String model;

    @Value("${ollama.timeout}")
    private int timeout;   // milliseconds from yaml

    public String getBaseUrl() { return baseUrl; }
    public String getModel()   { return model; }

    @Bean
    public RestClient ollamaRestClient() {
        // JdkClientHttpRequestFactory uses Java 21's built-in HttpClient
        // Duration-based timeout — replaces deprecated int-based setters
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeout))
                .build();

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
    }
}
```

**`OllamaService.java` — full replacement:**

```java
package com.fuelpool.fuelpool_backend.service.ollama;

import com.fuelpool.fuelpool_backend.config.OllamaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OllamaService {

    private final OllamaConfig ollamaConfig;
    private final RestClient ollamaRestClient;

    public String generate(String systemPrompt, String userPrompt) {
        String fullPrompt = "System: " + systemPrompt + "\n\nUser: " + userPrompt;

        // Use HashMap, not Map.of() — allows null values from Ollama response
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", ollamaConfig.getModel());
        requestBody.put("prompt", fullPrompt);
        requestBody.put("stream", false);

        try {
            Map<String, Object> response = ollamaRestClient
                    .post()
                    .uri("/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
        } catch (Exception e) {
            log.warn("Ollama call failed: {}", e.getMessage());
        }
        return null;
    }
}
```

---

## Fix 4 + 5 — SecurityConfig CORS + Demo Endpoint

Two issues in one file:
- `allowCredentials(true)` + `allowedOriginPatterns("*")` is rejected by Spring Security 7
- `/api/demo/**` not in `permitAll` so demo seed will return 403

**`SecurityConfig.java` — full replacement:**

```java
package com.fuelpool.fuelpool_backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/**",    // login, register
                    "/api/demo/**"     // seed + health — no auth for demo
                ).permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // FIX: allowCredentials(true) + wildcard is rejected in Spring Security 7
        // We use JWT Bearer tokens — no cookies needed, so credentials = false
        config.setAllowCredentials(false);

        // Allow Expo Go (LAN IP), localhost, and Render
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://192.168.*.*:*",    // Expo Go on local WiFi
            "exp://*",                  // Expo Go native protocol
            "https://*.onrender.com"    // Render deployment
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

---

## Fix 6 — User.java: hide password + fix serialization

When `GET /api/users/me` returns a `User`, Jackson serializes the `password` field.
That's a security leak and breaks the auth flow on the frontend.

**Add to `User.java`:**

```java
// Add these imports
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

// On the password field:
@Column(nullable = false)
@JsonIgnore                // NEVER serialize password in any response
private String password;

// UserDetails methods that clutter JSON output — ignore them all
@Override @JsonIgnore public Collection<? extends GrantedAuthority> getAuthorities() { return List.of(); }
@Override @JsonIgnore public boolean isAccountNonExpired()  { return true; }
@Override @JsonIgnore public boolean isAccountNonLocked()   { return true; }
@Override @JsonIgnore public boolean isCredentialsNonExpired() { return true; }
@Override @JsonIgnore public boolean isEnabled()            { return true; }
@Override @JsonIgnore public String getUsername()           { return email; }
```

---

## Fix 7 — Lazy relationship serialization

Every entity with `@ManyToOne(fetch = FetchType.LAZY)` will throw
`com.fasterxml.jackson.databind.exc.InvalidDefinitionException` when Jackson
tries to serialize the Hibernate proxy object.

**Add `@JsonIgnoreProperties` to every `@ManyToOne` field across all entities:**

```java
// Example in FuelLog.java, Ride.java, RideRequest.java, etc.
// Add to EVERY @ManyToOne field:

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
private User user;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "vehicle_id")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
private Vehicle vehicle;
```

**Files that need this fix — every `@ManyToOne` in:**
- `FuelLog.java` → `user`, `vehicle`
- `Ride.java` → `driver`, `vehicle`
- `RideRequest.java` → `ride`, `passenger`
- `TripPassenger.java` → `ride`, `passenger`, `driver`
- `Routine.java` → `user`
- `EcoWeeklyStats.java` → `user`

---

## Fix 8 — DemoController: add @Transactional

The seed method does ~20 database operations. Without `@Transactional`,
a failure halfway through leaves partial data in the database.

```java
// Add to DemoController.java seed method:
import org.springframework.transaction.annotation.Transactional;

@PostMapping("/seed")
@Transactional   // ← add this
public ResponseEntity<Map<String, Object>> seed() {
    // ...
}
```

---

## Fix 9 — Repository bulk deletes need @Modifying @Transactional

Spring Data JPA `delete` derived queries need `@Modifying` + `@Transactional`
in Spring Boot 4.x — without them you get `UnsupportedOperationException`.

**Add to every bulk delete method in repositories:**

```java
// Example in TripPassengerRepository.java:
@Modifying
@Transactional
void deleteAllByDriverIdIn(List<Long> driverIds);

@Modifying
@Transactional
void deleteAllByPassengerIdIn(List<Long> passengerIds);

// Same pattern in:
// EcoWeeklyStatsRepository   → deleteAllByUserIdIn
// FuelLogRepository          → deleteAllByUserIdIn
// RideRepository             → deleteAllByDriverIdIn
// VehicleRepository          → deleteAllByUserIdIn
```

---

## Fix 10 — Enable virtual threads (Java 21 bonus)

One line in `application.yaml`. Spring Boot 4.x + Java 21 virtual threads
handle concurrent requests with a fraction of the memory of platform threads.
Free performance — just enable it.

```yaml
# Add to application.yaml under spring:
spring:
  threads:
    virtual:
      enabled: true
```

---

## Updated `application.yaml` — full file with all fixes applied

```yaml
spring:
  application:
    name: fuelpool-backend

  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/fuelpool}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:}
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

  threads:
    virtual:
      enabled: true   # Java 21 virtual threads — free concurrency boost

jwt:
  secret: ${JWT_SECRET:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}
  expiration: 86400000

ollama:
  base-url: ${OLLAMA_BASE_URL:http://localhost:11434}
  model: llama3.2:3b
  timeout: 30000   # milliseconds

server:
  port: 8080
```

---

## What Does NOT Need Changing

These parts of the codebase are already Spring Boot 4.1 + Java 21 compatible:

| File | Why It's Fine |
|---|---|
| `JwtService.java` | Uses JJWT 0.12.3 new API (`Jwts.builder().subject()`, `.verifyWith()`) ✅ |
| `JwtAuthFilter.java` | Standard `OncePerRequestFilter` — unchanged in SB4 ✅ |
| `AuthService.java` | No deprecated APIs ✅ |
| All `@Scheduled` schedulers | Unchanged in SB4 ✅ |
| All `@Repository` interfaces | Spring Data JPA API unchanged ✅ |
| All `@Entity` models | JPA / Hibernate API unchanged ✅ |
| `GlobalExceptionHandler.java` | `@ControllerAdvice` unchanged ✅ |
| `FuelPriceService.java` (CSV loader) | `CommandLineRunner` unchanged ✅ |
| `MatchingService.java` | Pure Java logic, no framework APIs ✅ |

---

## Order to Apply Fixes

1. `OllamaConfig.java` — replace RestTemplate with RestClient
2. `OllamaService.java` — replace RestTemplate with RestClient  
3. `SecurityConfig.java` — fix CORS + add `/api/demo/**` to permitAll
4. `User.java` — add `@JsonIgnore` on password + UserDetails methods
5. All entity files — add `@JsonIgnoreProperties` on `@ManyToOne` fields
6. `application.yaml` — add `spring.threads.virtual.enabled: true`
7. All new repository methods — add `@Modifying @Transactional`
8. `DemoController.java` — add `@Transactional` on seed method
