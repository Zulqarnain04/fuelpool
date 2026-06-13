# FuelPool Backend — Gap Report
> Scanned against uploaded v1 zip. Covers Spring Boot 4.1 + Java 21 breaking changes, missing endpoints, and bugs.

---

## Priority 0 — Breaking (fix before first `mvn spring-boot:run`)

### P0-1 · OllamaConfig.java — RestTemplate → RestClient

`RestTemplate` auto-configuration is removed in Spring Boot 4.x. App crashes at startup.

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

    @Value("${ollama.base-url}") private String baseUrl;
    @Value("${ollama.model}")    private String model;
    @Value("${ollama.timeout}")  private int timeout;

    public String getBaseUrl() { return baseUrl; }
    public String getModel()   { return model; }

    @Bean
    public RestClient ollamaRestClient() {
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

### P0-2 · OllamaService.java — RestTemplate → RestClient

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

### P0-3 · SecurityConfig.java — CORS crash + missing demo permitAll

`allowCredentials(true)` + `allowedOriginPatterns("*")` throws `IllegalArgumentException` in Spring Security 7.
`/api/demo/**` also missing from permitAll — seed endpoint returns 403.

**Replace full `SecurityConfig.java`:**

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
                .requestMatchers("/api/auth/**", "/api/demo/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception {
        return c.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(false);           // JWT Bearer — no cookies needed
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://192.168.*.*:*",                  // Expo Go on local WiFi
            "exp://*",                               // Expo Go native
            "https://*.onrender.com"
        ));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### P0-4 · User.java — password serialized in API responses

Every `GET /api/users/me` leaks the bcrypt hash. Add `@JsonIgnore` to password and all
`UserDetails` override methods.

```java
// Add these imports to User.java
import com.fasterxml.jackson.annotation.JsonIgnore;

// Change password field:
@Column(nullable = false)
@JsonIgnore
private String password;

// Add @JsonIgnore to all UserDetails override methods:
@Override @JsonIgnore public Collection<? extends GrantedAuthority> getAuthorities() { return List.of(); }
@Override @JsonIgnore public boolean isAccountNonExpired()     { return true; }
@Override @JsonIgnore public boolean isAccountNonLocked()      { return true; }
@Override @JsonIgnore public boolean isCredentialsNonExpired() { return true; }
@Override @JsonIgnore public boolean isEnabled()               { return true; }
@Override @JsonIgnore public String  getUsername()             { return email; }
```

### P0-5 · All entity files — @ManyToOne lazy serialization crash

Every `@ManyToOne(fetch = FetchType.LAZY)` will throw `InvalidDefinitionException`
when Jackson tries to serialize the Hibernate proxy. Apply to every `@ManyToOne`
field in all entities.

```java
// Pattern — add @JsonIgnoreProperties to EVERY @ManyToOne field:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
private User user;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "vehicle_id")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
private Vehicle vehicle;
```

**Apply to these files:**

| File | Fields |
|---|---|
| `FuelLog.java` | `user`, `vehicle` |
| `Ride.java` | `driver`, `vehicle` |
| `RideRequest.java` | `ride`, `passenger` |
| `TripPassenger.java` | `ride`, `passenger`, `driver` |
| `Routine.java` | `user` |
| `EcoWeeklyStats.java` | `user` |

---

## Priority 1 — Missing (needed for demo to function)

### P1-1 · DemoController.java — create new file

Frontend calls `POST /api/demo/seed` on first launch to populate all demo data
and receive JWT tokens for each demo user. Without this the app shows empty screens.

```java
package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.model.*;
import com.fuelpool.fuelpool_backend.repository.*;
import com.fuelpool.fuelpool_backend.service.auth.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
@Slf4j
public class DemoController {

    private final UserRepository userRepo;
    private final VehicleRepository vehicleRepo;
    private final RideRepository rideRepo;
    private final EcoWeeklyStatsRepository ecoRepo;
    private final FuelLogRepository fuelLogRepo;
    private final MOFArticleRepository mofRepo;
    private final TripPassengerRepository tripPassengerRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "app", "FuelPool Backend"));
    }

    @PostMapping("/seed")
    @Transactional
    public ResponseEntity<Map<String, Object>> seed() {
        log.info("Demo seed triggered");

        // Clear existing demo data
        List<String> emails = List.of(
            "ahmad@utm.my","nurul@utm.my","haziq@utm.my","siti@utm.my","luqman@utm.my"
        );
        List<User> existing = userRepo.findAllByEmailIn(emails);
        if (!existing.isEmpty()) {
            List<Long> ids = existing.stream().map(User::getId).toList();
            tripPassengerRepo.deleteAllByDriverIdIn(ids);
            tripPassengerRepo.deleteAllByPassengerIdIn(ids);
            ecoRepo.deleteAllByUserIdIn(ids);
            fuelLogRepo.deleteAllByUserIdIn(ids);
            rideRepo.deleteAllByDriverIdIn(ids);
            vehicleRepo.deleteAllByUserIdIn(ids);
            mofRepo.deleteAll(mofRepo.findAll().stream()
                .filter(m -> m.getTitle() != null && m.getTitle().startsWith("[DEMO]"))
                .toList());
            userRepo.deleteAll(existing);
        }

        String pw = passwordEncoder.encode("password123");

        // Create users
        User ahmad  = userRepo.save(user("ahmad@utm.my",  pw, "Ahmad Razif",  User.Gender.MALE,   "A22EC0001", true,  "4.80"));
        User nurul  = userRepo.save(user("nurul@utm.my",  pw, "Nurul Ain",    User.Gender.FEMALE, "A22EC0002", false, "5.00"));
        User haziq  = userRepo.save(user("haziq@utm.my",  pw, "Haziq Faris",  User.Gender.MALE,   "A22EC0003", true,  "4.60"));
        User siti   = userRepo.save(user("siti@utm.my",   pw, "Siti Nabilah", User.Gender.FEMALE, "A22EC0004", false, "5.00"));
        User luqman = userRepo.save(user("luqman@utm.my", pw, "Luqman Hakim", User.Gender.MALE,   "A22EC0005", true,  "4.90"));

        // Create vehicles
        Vehicle ahmadCar = vehicleRepo.save(Vehicle.builder()
            .user(ahmad).make("Perodua").model("Myvi").year(2022).color("Silver")
            .plateNumber("JKK 1234").tankCapacity(bd("40")).avgEfficiency(bd("16"))
            .fuelType(Vehicle.FuelType.RON95_BUDI95).currentOdometer(45230).isPrimary(true).build());

        Vehicle haziqCar = vehicleRepo.save(Vehicle.builder()
            .user(haziq).make("Proton").model("Saga").year(2021).color("Blue")
            .plateNumber("JKM 9101").tankCapacity(bd("40")).avgEfficiency(bd("15"))
            .fuelType(Vehicle.FuelType.RON95_BUDI95).currentOdometer(33000).isPrimary(true).build());

        vehicleRepo.save(Vehicle.builder()
            .user(luqman).make("Honda").model("City").year(2021).color("Black")
            .plateNumber("JKN 1122").tankCapacity(bd("47")).avgEfficiency(bd("14"))
            .fuelType(Vehicle.FuelType.RON97).currentOdometer(28500).isPrimary(true).build());

        // Create open rides (next 25-45 mins)
        LocalDateTime now = LocalDateTime.now();

        Ride rideA = rideRepo.save(Ride.builder()
            .driver(ahmad).vehicle(ahmadCar)
            .originLat(bd("1.5598")).originLng(bd("103.6420")).originLabel("Kolej 17")
            .destinationLat(bd("1.5570")).destinationLng(bd("103.6367"))
            .destinationLabel("Faculty of Computing")
            .departureTime(now.plusMinutes(25)).maxSeats(3).confirmedPassengers(1)
            .status(Ride.RideStatus.OPEN)
            .estimatedDistanceKm(bd("2.10")).estimatedFarePerPerson(bd("0.39"))
            .fuelCostTotal(bd("1.16"))
            .googleMapsUrl("https://www.google.com/maps/dir/?api=1&origin=1.5598,103.6420&destination=1.5570,103.6367&travelmode=driving")
            .build());

        rideRepo.save(Ride.builder()
            .driver(haziq).vehicle(haziqCar)
            .originLat(bd("1.5605")).originLng(bd("103.6415")).originLabel("Kolej 18")
            .destinationLat(bd("1.5588")).destinationLng(bd("103.6347"))
            .destinationLabel("UTM Main Gate")
            .departureTime(now.plusMinutes(45)).maxSeats(3).confirmedPassengers(0)
            .status(Ride.RideStatus.OPEN)
            .estimatedDistanceKm(bd("1.80")).estimatedFarePerPerson(bd("0.35"))
            .fuelCostTotal(bd("1.06"))
            .googleMapsUrl("https://www.google.com/maps/dir/?api=1&origin=1.5605,103.6415&destination=1.5588,103.6347&travelmode=driving")
            .build());

        // Eco weekly stats (current week)
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        ecoRepo.save(ecoStats(ahmad,  weekStart, 4, 3, 1, "2.31", "6.93", "29.76", "44.64", "127.40", "71.50", 3,  89,
            "Great week Ahmad! You shared 3 rides, saved RM 44.64 and 6.93kg CO₂. Ranked #3 on UTM EcoDrivers."));
        ecoRepo.save(ecoStats(nurul,  weekStart, 3, 3, 0, "1.73", "5.19", "0.00",  "33.48", "95.55",  "68.20", 7,  89,
            "Nurul, zero solo trips this week — amazing! 3 shared rides saved you RM 95.55 vs Grab."));
        ecoRepo.save(ecoStats(haziq,  weekStart, 5, 2, 3, "4.62", "3.46", "44.65", "22.40", "60.30",  "42.80", 22, 89,
            "3 solo trips is holding you back Haziq. Try enabling auto-request on your morning routine."));
        ecoRepo.save(ecoStats(siti,   weekStart, 4, 4, 0, "2.31", "6.93", "0.00",  "44.64", "127.40", "78.30", 1,  89,
            "Siti, you're #1 EcoDriver at UTM this week! 4 of 4 trips shared. Zero solo driving."));
        ecoRepo.save(ecoStats(luqman, weekStart, 3, 2, 1, "3.46", "5.19", "29.76", "33.48", "85.10",  "58.60", 12, 89,
            "Good week Luqman. Carrying 2 passengers on Tuesday saved you RM 22 in fuel alone."));

        // Fuel logs for Ahmad (past 4 weeks)
        fuelLogRepo.save(FuelLog.builder().user(ahmad).vehicle(ahmadCar)
            .logDate(now.minusWeeks(4)).odometer(44820)
            .litresFilled(bd("35.50")).pricePerLitre(bd("1.99")).totalCost(bd("70.65"))
            .isFullTank(true).isMissedPrevious(false).fuelType(Vehicle.FuelType.RON95_BUDI95)
            .stationName("Petronas Skudai").distanceSinceLast(510)
            .efficiencyThisFill(bd("14.37")).costPerKm(bd("0.1385")).build());

        fuelLogRepo.save(FuelLog.builder().user(ahmad).vehicle(ahmadCar)
            .logDate(now.minusWeeks(2)).odometer(45050)
            .litresFilled(bd("30.10")).pricePerLitre(bd("1.99")).totalCost(bd("59.90"))
            .isFullTank(true).isMissedPrevious(false).fuelType(Vehicle.FuelType.RON95_BUDI95)
            .stationName("Shell Skudai").distanceSinceLast(430)
            .efficiencyThisFill(bd("14.29")).costPerKm(bd("0.1394")).build());

        fuelLogRepo.save(FuelLog.builder().user(ahmad).vehicle(ahmadCar)
            .logDate(now.minusDays(3)).odometer(45230)
            .litresFilled(bd("25.80")).pricePerLitre(bd("1.99")).totalCost(bd("51.34"))
            .isFullTank(false).isMissedPrevious(false).fuelType(Vehicle.FuelType.RON95_BUDI95)
            .stationName("BHP Skudai").distanceSinceLast(180)
            .efficiencyThisFill(null).costPerKm(bd("0.2852")).build());

        // Completed trip record
        tripPassengerRepo.save(TripPassenger.builder()
            .ride(rideA).passenger(nurul).driver(ahmad)
            .tripDate(now.minusDays(1)).distanceKm(bd("2.10")).farePaid(bd("0.39"))
            .carbonEmittedKg(bd("0.15")).carbonSavedKg(bd("0.45"))
            .savedVsSolo(bd("0.77")).savedVsGrab(bd("4.39")).build());

        // MOF article
        mofRepo.save(MOFArticle.builder()
            .fetchedAt(LocalDateTime.now().minusDays(3))
            .title("[DEMO] Harga Runcit Petrol RON97 dan Diesel — 11 Jun 2026")
            .sourceUrl("https://www.mof.gov.my/portal/en/news/press-citations")
            .rawContent("Harga runcit RON97 kekal pada paras RM4.35 seliter bagi tempoh 11 Jun 2026...")
            .ollamaAnalysis("{\"fuelChanges\":[{\"fuelType\":\"RON97\",\"oldPrice\":4.35,\"newPrice\":4.35," +
                "\"changeAmount\":0.00,\"direction\":\"UNCHANGED\"}],\"effectiveDate\":\"2026-06-11\"," +
                "\"mainReason\":\"Harga minyak global stabil\",\"userTip\":\"Prices stable. RON97 trend suggests easing next week.\"," +
                "\"affectedUsers\":\"RON97 users. BUDI95 remains fixed at RM1.99.\"}")
            .effectiveDate(LocalDate.now().minusDays(3))
            .mainReason("Global crude oil prices stable")
            .userTip("Prices stable. RON97 trend suggests easing next week — consider waiting.")
            .isNotified(true).build());

        // Return JWT tokens for all demo users
        Map<String, String> tokens = new LinkedHashMap<>();
        tokens.put("ahmad@utm.my",  jwtService.generateToken(ahmad));
        tokens.put("nurul@utm.my",  jwtService.generateToken(nurul));
        tokens.put("haziq@utm.my",  jwtService.generateToken(haziq));
        tokens.put("siti@utm.my",   jwtService.generateToken(siti));
        tokens.put("luqman@utm.my", jwtService.generateToken(luqman));

        log.info("Demo seed complete");

        return ResponseEntity.ok(Map.of(
            "status", "success",
            "message", "Demo data ready. Password for all accounts: password123",
            "tokens", tokens,
            "openRides", 2,
            "users", List.of(
                Map.of("email","ahmad@utm.my",  "name","Ahmad Razif",  "role","Driver",    "vehicle","Myvi RON95 BUDI95"),
                Map.of("email","nurul@utm.my",  "name","Nurul Ain",    "role","Passenger", "vehicle","None"),
                Map.of("email","haziq@utm.my",  "name","Haziq Faris",  "role","Driver",    "vehicle","Saga RON95 BUDI95"),
                Map.of("email","siti@utm.my",   "name","Siti Nabilah", "role","Passenger", "vehicle","None"),
                Map.of("email","luqman@utm.my", "name","Luqman Hakim", "role","Driver",    "vehicle","City RON97")
            )
        ));
    }

    // Helpers
    private User user(String email, String pw, String name, User.Gender gender,
                      String studentId, boolean isDriver, String rating) {
        return User.builder().email(email).password(pw).name(name).gender(gender)
            .studentId(studentId).isVerified(true).isDriver(isDriver)
            .driverRating(bd(rating)).passengerRating(bd("5.00")).build();
    }

    private EcoWeeklyStats ecoStats(User user, LocalDate week, int total, int carpool, int solo,
            String carbon, String saved, String fuelCost, String vsSolo, String vsGrab,
            String score, int rank, int totalUsers, String summary) {
        return EcoWeeklyStats.builder().user(user).weekStartDate(week)
            .totalTrips(total).carpoolTrips(carpool).soloTrips(solo)
            .totalCarbonKg(bd(carbon)).carbonSavedKg(bd(saved))
            .totalFuelCost(bd(fuelCost)).savedVsSolo(bd(vsSolo)).savedVsGrab(bd(vsGrab))
            .ecoScore(bd(score)).communityRank(rank).totalUsersRanked(totalUsers)
            .ollamaSummary(summary).build();
    }

    private BigDecimal bd(String val) { return new BigDecimal(val); }
}
```

### P1-2 · RideController.java — Add `GET /api/rides` list

Carpool map screen has no data without this.

```java
// Add to RideController.java

@GetMapping
public ResponseEntity<List<Ride>> list(
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(defaultValue = "5000") double radius,
        @RequestParam(defaultValue = "OPEN") String status) {

    Ride.RideStatus s = Ride.RideStatus.valueOf(status);
    List<Ride> rides = rideRepository.findByStatus(s);

    if (lat != null && lng != null) {
        rides = rides.stream()
            .filter(r -> routeService.haversineMetres(
                lat, lng,
                r.getOriginLat().doubleValue(),
                r.getOriginLng().doubleValue()) <= radius)
            .toList();
    }
    return ResponseEntity.ok(rides);
}
```

---

## Priority 2 — Missing (needed for full feature screens)

### P2-1 · FuelLogController.java — Add `GET /api/fuel/logs/{id}`

```java
@GetMapping("/{id}")
public ResponseEntity<FuelLog> get(@AuthenticationPrincipal User user, @PathVariable Long id) {
    return ResponseEntity.ok(fuelLogService.findById(id, user));
}

// Add to FuelLogService.java:
public FuelLog findById(Long id, User user) {
    FuelLog log = fuelLogRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("FuelLog", id));
    if (!log.getUser().getId().equals(user.getId()))
        throw new BusinessException("Not your log");
    return log;
}
```

### P2-2 · FuelPriceController.java — Add `GET /api/fuel/stats`

```java
@GetMapping("/stats")
public ResponseEntity<Map<String, Object>> stats(@AuthenticationPrincipal User user) {
    List<FuelLog> logs = fuelLogRepository.findByUserIdOrderByLogDateDesc(user.getId());

    double totalSpend  = logs.stream().mapToDouble(l -> l.getTotalCost().doubleValue()).sum();
    double totalLitres = logs.stream().mapToDouble(l -> l.getLitresFilled().doubleValue()).sum();

    OptionalDouble avgEff = logs.stream()
        .filter(l -> l.getEfficiencyThisFill() != null)
        .mapToDouble(l -> l.getEfficiencyThisFill().doubleValue())
        .average();

    Map<String, Double> monthly = logs.stream()
        .collect(Collectors.groupingBy(
            l -> l.getLogDate().format(DateTimeFormatter.ofPattern("yyyy-MM")),
            Collectors.summingDouble(l -> l.getTotalCost().doubleValue())
        ));

    Map<String, Object> result = new HashMap<>();
    result.put("totalSpend",       Math.round(totalSpend * 100.0) / 100.0);
    result.put("totalLitres",      Math.round(totalLitres * 100.0) / 100.0);
    result.put("avgEfficiency",    avgEff.isPresent() ? Math.round(avgEff.getAsDouble() * 10.0) / 10.0 : null);
    result.put("monthlyBreakdown", monthly);
    return ResponseEntity.ok(result);
}
```

### P2-3 · FuelPriceController.java — Add `GET /api/fuel/budi95/status`

```java
@GetMapping("/budi95/status")
public ResponseEntity<Map<String, Object>> budi95Status(@AuthenticationPrincipal User user) {
    double used = budi95Service.getBudi95UsedThisMonth(user.getId());
    Map<String, Object> result = new HashMap<>();
    result.put("usedLitres",      Math.round(used * 10.0) / 10.0);
    result.put("limitLitres",     300);
    result.put("remainingLitres", Math.round(Math.max(0, 300 - used) * 10.0) / 10.0);
    result.put("limitExceeded",   budi95Service.hasExceededLimit(user.getId()));
    result.put("effectivePrice",  budi95Service.getEffectivePrice(user.getId()));
    return ResponseEntity.ok(result);
}
```

### P2-4 · EcoTrackController.java — Add `GET /api/eco/monthly`

```java
@GetMapping("/monthly")
public ResponseEntity<Map<String, Object>> monthly(@AuthenticationPrincipal User user) {
    LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
    LocalDate monthEnd   = monthStart.plusMonths(1).minusDays(1);

    List<EcoWeeklyStats> weeks = statsRepository
        .findByUserIdAndWeekStartDateBetween(user.getId(), monthStart, monthEnd);

    Map<String, Object> result = new HashMap<>();
    result.put("month",              monthStart.format(DateTimeFormatter.ofPattern("MMMM yyyy")));
    result.put("totalSavedVsSolo",   weeks.stream().mapToDouble(w -> w.getSavedVsSolo().doubleValue()).sum());
    result.put("totalSavedVsGrab",   weeks.stream().mapToDouble(w -> w.getSavedVsGrab().doubleValue()).sum());
    result.put("totalCarbonSavedKg", weeks.stream().mapToDouble(w -> w.getCarbonSavedKg().doubleValue()).sum());
    result.put("totalCarpoolTrips",  weeks.stream().mapToInt(EcoWeeklyStats::getCarpoolTrips).sum());
    return ResponseEntity.ok(result);
}
```

### P2-5 · EcoTrackController.java — Add `GET /api/eco/habits`

```java
@GetMapping("/habits")
public ResponseEntity<Map<String, Object>> habits(@AuthenticationPrincipal User user) {
    Vehicle vehicle = vehicleRepository.findFirstByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);

    List<FuelLog> logs = fuelLogRepository
        .findTop5ByUserIdAndIsFullTankTrueAndEfficiencyThisFillIsNotNullOrderByLogDateDesc(user.getId());

    List<Double> efficiencies = logs.stream()
        .map(l -> l.getEfficiencyThisFill().doubleValue()).toList();

    double avgEff     = efficiencies.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    double defaultEff = vehicle != null ? vehicle.getAvgEfficiency().doubleValue() : 0;
    String status     = avgEff >= defaultEff ? "GOOD" : avgEff >= defaultEff * 0.85 ? "AVERAGE" : "BELOW";

    LocalDate weekStart   = LocalDate.now().with(DayOfWeek.MONDAY);
    EcoWeeklyStats week   = statsRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
        .orElse(EcoWeeklyStats.builder().build());

    int total   = week.getTotalTrips()   != null ? week.getTotalTrips()   : 0;
    int carpool = week.getCarpoolTrips() != null ? week.getCarpoolTrips() : 0;

    Map<String, Object> result = new HashMap<>();
    result.put("avgEfficiencyKmPerL",       Math.round(avgEff * 10.0) / 10.0);
    result.put("vehicleDefaultEfficiency",  defaultEff);
    result.put("efficiencyTrend",           efficiencies);
    result.put("efficiencyStatus",          status);
    result.put("carpoolRatePercent",        total > 0 ? Math.round((double) carpool / total * 100) : 0);
    result.put("carpoolTripsThisWeek",      carpool);
    result.put("totalTripsThisWeek",        total);

    // BUDI95 usage (only if user has BUDI95 vehicle)
    if (vehicle != null && vehicle.getFuelType() == Vehicle.FuelType.RON95_BUDI95) {
        double used = budi95Service.getBudi95UsedThisMonth(user.getId());
        Map<String, Object> budi = new HashMap<>();
        budi.put("usedLitres",      Math.round(used * 10.0) / 10.0);
        budi.put("limitLitres",     300);
        budi.put("remainingLitres", Math.round(Math.max(0, 300 - used) * 10.0) / 10.0);
        budi.put("limitExceeded",   used >= 300);
        result.put("budi95", budi);
    }
    return ResponseEntity.ok(result);
}
```

### P2-6 · RideController.java — Add `POST /api/rides/{id}/rate`

```java
@PostMapping("/{id}/rate")
public ResponseEntity<Void> rate(@AuthenticationPrincipal User user,
                                  @PathVariable Long id,
                                  @RequestBody Map<String, Object> body) {
    int rating        = (Integer) body.get("rating");           // 1-5
    Long targetUserId = ((Number) body.get("targetUserId")).longValue();
    rideService.rateRide(id, user, targetUserId, rating);
    return ResponseEntity.ok().build();
}

// Add to RideService.java:
public void rateRide(Long rideId, User rater, Long targetUserId, int rating) {
    TripPassenger trip = tripPassengerRepository.findByRideIdAndPassengerId(rideId, targetUserId)
        .or(() -> tripPassengerRepository.findByRideIdAndDriverId(rideId, targetUserId))
        .orElseThrow(() -> new ResourceNotFoundException("Trip", rideId));

    if (trip.getDriver().getId().equals(rater.getId())) {
        trip.setPassengerRatingGiven(rating);
        User p = trip.getPassenger();
        p.setPassengerRating(rollingAvg(p.getPassengerRating(), rating));
        userRepository.save(p);
    } else {
        trip.setDriverRating(rating);
        User d = trip.getDriver();
        d.setDriverRating(rollingAvg(d.getDriverRating(), rating));
        userRepository.save(d);
    }
    tripPassengerRepository.save(trip);
}

private BigDecimal rollingAvg(BigDecimal current, int newVal) {
    double v = current.doubleValue() * 0.8 + newVal * 0.2;
    return BigDecimal.valueOf(Math.round(v * 100.0) / 100.0);
}
```

---

## Priority 3 — Bugs

### P3-1 · FuelPriceService.java — `getLastNPrices(n)` ignores n

```java
// Current — always returns 6 regardless of n:
public List<FuelPrice> getLastNPrices(int n) {
    return fuelPriceRepository.findTop6ByOrderByPriceDateDesc(); // hardcoded
}

// Fix — use PageRequest:
public List<FuelPrice> getLastNPrices(int n) {
    return fuelPriceRepository.findByPriceDateBeforeOrderByPriceDateDesc(
        LocalDate.now().plusDays(1), PageRequest.of(0, n)
    ).getContent();
}

// Add to FuelPriceRepository.java:
Page<FuelPrice> findByPriceDateBeforeOrderByPriceDateDesc(LocalDate date, Pageable pageable);
```

### P3-2 · fuelprice.csv missing from classpath

Loader looks for `classpath:data/fuelprice.csv` but file is not in the zip.
Copy `fuelprice.csv` into `src/main/resources/data/`.

### P3-3 · application.yaml — enable virtual threads

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

---

## Missing Repository Methods

Add these — all needed by the new endpoints and DemoController:

```java
// UserRepository.java
List<User> findAllByEmailIn(List<String> emails);

// RideRepository.java
List<Ride> findByStatus(Ride.RideStatus status);
@Modifying @Transactional void deleteAllByDriverIdIn(List<Long> ids);

// VehicleRepository.java
Optional<Vehicle> findFirstByUserIdAndIsPrimaryTrue(Long userId);
@Modifying @Transactional void deleteAllByUserIdIn(List<Long> ids);

// FuelLogRepository.java
List<FuelLog> findByUserIdOrderByLogDateDesc(Long userId);
List<FuelLog> findTop5ByUserIdAndIsFullTankTrueAndEfficiencyThisFillIsNotNullOrderByLogDateDesc(Long userId);
@Modifying @Transactional void deleteAllByUserIdIn(List<Long> ids);

// EcoWeeklyStatsRepository.java
List<EcoWeeklyStats> findByUserIdAndWeekStartDateBetween(Long userId, LocalDate from, LocalDate to);
@Modifying @Transactional void deleteAllByUserIdIn(List<Long> ids);

// TripPassengerRepository.java
Optional<TripPassenger> findByRideIdAndPassengerId(Long rideId, Long passengerId);
Optional<TripPassenger> findByRideIdAndDriverId(Long rideId, Long driverId);
@Modifying @Transactional void deleteAllByDriverIdIn(List<Long> ids);
@Modifying @Transactional void deleteAllByPassengerIdIn(List<Long> ids);
```

---

## Checklist

```
Priority 0 — fix before running
[ ] OllamaConfig.java        → replace RestTemplate with RestClient
[ ] OllamaService.java       → replace RestTemplate with RestClient
[ ] SecurityConfig.java      → fix CORS + add /api/demo/** to permitAll
[ ] User.java                → @JsonIgnore on password + UserDetails methods
[ ] All 6 entity files       → @JsonIgnoreProperties on every @ManyToOne

Priority 1 — needed for demo
[ ] DemoController.java      → create new file (full code above)
[ ] RideController.java      → add GET /api/rides list endpoint
[ ] fuelprice.csv            → copy into src/main/resources/data/

Priority 2 — full feature coverage
[ ] FuelLogController.java   → GET /api/fuel/logs/{id}
[ ] FuelPriceController.java → GET /api/fuel/stats
[ ] FuelPriceController.java → GET /api/fuel/budi95/status
[ ] EcoTrackController.java  → GET /api/eco/monthly
[ ] EcoTrackController.java  → GET /api/eco/habits
[ ] RideController.java      → POST /api/rides/{id}/rate

Priority 3 — bugs
[ ] FuelPriceService.java    → fix getLastNPrices(n) ignores n
[ ] application.yaml         → spring.threads.virtual.enabled: true
[ ] All new repo methods     → add @Modifying @Transactional to deletes
```
