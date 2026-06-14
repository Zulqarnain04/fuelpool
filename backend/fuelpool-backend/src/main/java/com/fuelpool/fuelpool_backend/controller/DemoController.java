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
    private final RideRequestRepository rideRequestRepo;
    private final RoutineRepository routineRepo;
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
            "ahmad@utm.my", "nurul@utm.my", "haziq@utm.my", "siti@utm.my", "luqman@utm.my"
        );
        List<User> existing = userRepo.findAllByEmailIn(emails);
        if (!existing.isEmpty()) {
            List<Long> ids = existing.stream().map(User::getId).toList();

            // Delete child rows before their parents (rides/users) to satisfy FK
            // constraints. ride_requests and routines were previously missed.
            tripPassengerRepo.deleteAllByDriverIdIn(ids);
            tripPassengerRepo.deleteAllByPassengerIdIn(ids);

            List<Long> rideIds = rideRepo.findByDriverIdIn(ids).stream().map(Ride::getId).toList();
            if (!rideIds.isEmpty()) rideRequestRepo.deleteByRideIdIn(rideIds);
            rideRequestRepo.deleteByPassengerIdIn(ids);
            routineRepo.deleteByUserIdIn(ids);

            ecoRepo.deleteAllByUserIdIn(ids);
            fuelLogRepo.deleteAllByUserIdIn(ids);
            rideRepo.deleteAllByDriverIdIn(ids);
            vehicleRepo.deleteAllByUserIdIn(ids);
            mofRepo.deleteAll(mofRepo.findAll().stream()
                .filter(m -> m.getTitle() != null && m.getTitle().startsWith("[DEMO]"))
                .toList());
            userRepo.deleteAll(existing);

            // Force the deletes to hit the DB now. Without this, Hibernate flushes
            // all INSERTs before DELETEs at commit, so re-inserting the same demo
            // emails below collides with the not-yet-deleted rows (duplicate key).
            userRepo.flush();
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

        // Create open rides (departing in 25–45 min)
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
                Map.of("email", "ahmad@utm.my",  "name", "Ahmad Razif",  "role", "Driver",    "vehicle", "Myvi RON95 BUDI95"),
                Map.of("email", "nurul@utm.my",  "name", "Nurul Ain",    "role", "Passenger", "vehicle", "None"),
                Map.of("email", "haziq@utm.my",  "name", "Haziq Faris",  "role", "Driver",    "vehicle", "Saga RON95 BUDI95"),
                Map.of("email", "siti@utm.my",   "name", "Siti Nabilah", "role", "Passenger", "vehicle", "None"),
                Map.of("email", "luqman@utm.my", "name", "Luqman Hakim", "role", "Driver",    "vehicle", "City RON97")
            )
        ));
    }

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
