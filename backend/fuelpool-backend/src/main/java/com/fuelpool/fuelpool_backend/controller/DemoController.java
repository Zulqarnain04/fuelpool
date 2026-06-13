package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.UserRepository;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
public class DemoController {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "FuelPool Demo"));
    }

    @PostMapping("/seed")
    @Transactional
    public ResponseEntity<Map<String, Object>> seed() {
        List<String> created = new ArrayList<>();
        String rawPassword = "password123";

        record UserSeed(String email, String name, User.Gender gender, String studentId,
                        boolean isDriver, double driverRating, double passengerRating) {}

        List<UserSeed> users = List.of(
            new UserSeed("ahmad@utm.my",  "Ahmad Razif",  User.Gender.MALE,   "A22EC0001", true,  4.80, 5.00),
            new UserSeed("nurul@utm.my",  "Nurul Ain",    User.Gender.FEMALE, "A22EC0002", false, 5.00, 4.90),
            new UserSeed("haziq@utm.my",  "Haziq Faris",  User.Gender.MALE,   "A22EC0003", true,  4.60, 4.70),
            new UserSeed("siti@utm.my",   "Siti Nabilah", User.Gender.FEMALE, "A22EC0004", false, 5.00, 4.80),
            new UserSeed("luqman@utm.my", "Luqman Hakim", User.Gender.MALE,   "A22EC0005", true,  4.90, 5.00)
        );

        for (UserSeed seed : users) {
            if (!userRepository.existsByEmail(seed.email())) {
                User user = User.builder()
                        .email(seed.email())
                        .password(passwordEncoder.encode(rawPassword))
                        .name(seed.name())
                        .gender(seed.gender())
                        .studentId(seed.studentId())
                        .isVerified(true)
                        .isDriver(seed.isDriver())
                        .driverRating(BigDecimal.valueOf(seed.driverRating()))
                        .passengerRating(BigDecimal.valueOf(seed.passengerRating()))
                        .build();
                userRepository.save(user);
                created.add("user:" + seed.email());
            }
        }

        record VehicleSeed(String ownerEmail, String make, String model, int year,
                           String color, String plate, double tank, double efficiency,
                           Vehicle.FuelType fuelType, int odometer) {}

        List<VehicleSeed> vehicles = List.of(
            new VehicleSeed("ahmad@utm.my",  "Perodua", "Myvi", 2022, "Silver", "JKK1234", 40.0, 16.0, Vehicle.FuelType.RON95_BUDI95, 45230),
            new VehicleSeed("nurul@utm.my",  "Perodua", "Axia", 2023, "White",  "JKL5678", 35.0, 17.0, Vehicle.FuelType.RON95_MARKET, 12400),
            new VehicleSeed("haziq@utm.my",  "Proton",  "Saga", 2021, "Blue",   "JKM9101", 40.0, 15.0, Vehicle.FuelType.RON95_BUDI95, 33000),
            new VehicleSeed("luqman@utm.my", "Honda",   "City", 2021, "Black",  "JKN1122", 47.0, 14.0, Vehicle.FuelType.RON97,         28500)
        );

        for (VehicleSeed seed : vehicles) {
            userRepository.findByEmail(seed.ownerEmail()).ifPresent(owner -> {
                boolean alreadyHasVehicle = !vehicleRepository.findByUserId(owner.getId()).isEmpty();
                if (!alreadyHasVehicle) {
                    Vehicle vehicle = Vehicle.builder()
                            .user(owner)
                            .make(seed.make())
                            .model(seed.model())
                            .year(seed.year())
                            .color(seed.color())
                            .plateNumber(seed.plate())
                            .tankCapacity(BigDecimal.valueOf(seed.tank()))
                            .avgEfficiency(BigDecimal.valueOf(seed.efficiency()))
                            .fuelType(seed.fuelType())
                            .currentOdometer(seed.odometer())
                            .isPrimary(true)
                            .build();
                    vehicleRepository.save(vehicle);
                    created.add("vehicle:" + seed.plate());
                }
            });
        }

        return ResponseEntity.ok(Map.of(
            "seeded", created,
            "count", created.size(),
            "message", created.isEmpty() ? "Demo data already present" : "Seed complete"
        ));
    }
}
