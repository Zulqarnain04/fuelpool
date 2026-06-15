package com.fuelpool.fuelpool_backend.controller;

import com.fuelpool.fuelpool_backend.model.*;
import com.fuelpool.fuelpool_backend.repository.*;
import com.fuelpool.fuelpool_backend.service.carpool.FareCalculationService;
import com.fuelpool.fuelpool_backend.service.carpool.RouteService;
import com.fuelpool.fuelpool_backend.service.eco.CarbonService;
import com.fuelpool.fuelpool_backend.service.eco.LeaderboardService;
import com.fuelpool.fuelpool_backend.service.eco.SavingsService;
import com.fuelpool.fuelpool_backend.service.fuel.FuelPriceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
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
    private final FuelPriceRepository fuelPriceRepo;
    private final PasswordEncoder passwordEncoder;
    private final FareCalculationService fareService;
    private final RouteService routeService;
    private final FuelPriceService fuelPriceService;
    private final CarbonService carbonService;
    private final SavingsService savingsService;
    private final LeaderboardService leaderboardService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "app", "FuelPool Backend"));
    }

    @PostMapping("/seed")
    @Transactional
    public ResponseEntity<Map<String, Object>> seed() {
        log.info("Demo seed triggered");

        // ---- Clear existing demo data ----
        List<String> emails = ROSTER.stream().map(Person::email).toList();
        List<User> existing = userRepo.findAllByEmailIn(emails);
        if (!existing.isEmpty()) {
            List<Long> ids = existing.stream().map(User::getId).toList();

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
        LocalDateTime now = LocalDateTime.now();

        // ---- Users ----
        Map<String, User> userMap = new LinkedHashMap<>();
        for (int i = 0; i < ROSTER.size(); i++) {
            Person p = ROSTER.get(i);
            BigDecimal driverRating = bd2(4.5 + (i % 5) * 0.1);
            BigDecimal passengerRating = bd2(4.6 + (i % 4) * 0.1);
            User u = userRepo.save(User.builder()
                .email(p.email()).password(pw).name(p.name()).gender(p.gender())
                .studentId(p.studentId()).isVerified(true)
                .isDriver(p.role() != Role.PASSENGER)
                .driverRating(driverRating).passengerRating(passengerRating)
                .build());
            userMap.put(p.email(), u);
        }

        // ---- Vehicles ----
        Map<String, Vehicle> vehicleMap = new LinkedHashMap<>();
        for (VehicleSpec spec : VEHICLES) {
            User owner = userMap.get(spec.ownerEmail());
            Vehicle v = vehicleRepo.save(Vehicle.builder()
                .user(owner).make(spec.make()).model(spec.model()).year(spec.year())
                .color(spec.color()).plateNumber(spec.plate())
                .tankCapacity(bd(spec.tankCapacity())).currentFuelLevel(bd(spec.tankCapacity()))
                .avgEfficiency(bd(spec.avgEfficiency()))
                .fuelType(spec.fuelType()).currentOdometer(spec.odometer()).isPrimary(true)
                .build());
            vehicleMap.put(spec.ownerEmail(), v);
        }

        // ---- Rides ----
        List<Ride> rides = new ArrayList<>();
        for (RideSpec spec : RIDE_SPECS) {
            rides.add(ride(spec, userMap, vehicleMap, now));
        }

        // ---- Ride requests (mix of PENDING / ACCEPTED across a few rides) ----
        addRequest(rides.get(1), userMap.get("aisyah@utm.my"), RideRequest.RequestStatus.PENDING);
        addRequest(rides.get(2), userMap.get("meiling@utm.my"), RideRequest.RequestStatus.ACCEPTED);
        addRequest(rides.get(2), userMap.get("aliya@utm.my"), RideRequest.RequestStatus.PENDING);
        addRequest(rides.get(4), userMap.get("arjun@utm.my"), RideRequest.RequestStatus.ACCEPTED);
        addRequest(rides.get(6), userMap.get("faiz@utm.my"), RideRequest.RequestStatus.ACCEPTED);

        // ---- Completed trip record (Nadia drove Kavitha, ride already finished) ----
        Ride completedRide = rides.get(7);
        User nadia = userMap.get("nadia@utm.my");
        User kavitha = userMap.get("kavitha@utm.my");
        Vehicle nadiaCar = vehicleMap.get("nadia@utm.my");
        double completedDistKm = completedRide.getEstimatedDistanceKm().doubleValue();
        var completedFare = fareService.calculate(completedDistKm, nadiaCar, 2);
        double carbonEmitted = carbonService.passengerShareCarbon(completedDistKm, nadiaCar, 2);
        double carbonSaved = carbonService.carbonSavedByPassenger(completedDistKm, nadiaCar, 2);
        BigDecimal savedVsSolo = savingsService.savedVsSolo(completedDistKm, nadiaCar, completedFare.getFarePerPerson());
        BigDecimal savedVsGrab = savingsService.savedVsGrab(completedDistKm, completedFare.getFarePerPerson());

        tripPassengerRepo.save(TripPassenger.builder()
            .ride(completedRide).passenger(kavitha).driver(nadia)
            .tripDate(now.minusDays(2).plusHours(1))
            .distanceKm(bd2(completedDistKm)).farePaid(completedFare.getFarePerPerson())
            .carbonEmittedKg(bd4(carbonEmitted)).carbonSavedKg(bd4(carbonSaved))
            .savedVsSolo(savedVsSolo).savedVsGrab(savedVsGrab)
            .build());

        // ---- Eco weekly stats: current week + 3 prior weeks for all 24 users ----
        seedEcoStats(userMap.values().stream().toList());
        leaderboardService.updateRanksForCurrentWeek();

        // ---- Fuel logs: 5 fills per vehicle spanning ~2 months ----
        seedFuelLogs(vehicleMap.values().stream().toList());

        // ---- MOF article ----
        LocalDate articleDate = LocalDate.now().minusDays(3);
        mofRepo.save(MOFArticle.builder()
            .fetchedAt(now.minusDays(3))
            .title("[DEMO] Harga Runcit Petrol RON97 dan Diesel — "
                + articleDate.format(DateTimeFormatter.ofPattern("d MMM yyyy")))
            .sourceUrl("https://www.mof.gov.my/portal/en/news/press-citations")
            .rawContent("Harga runcit RON97 kekal pada paras RM4.35 seliter bagi tempoh semasa...")
            .ollamaAnalysis("{\"fuelChanges\":[{\"fuelType\":\"RON97\",\"oldPrice\":4.35,\"newPrice\":4.35," +
                "\"changeAmount\":0.00,\"direction\":\"UNCHANGED\"}],\"effectiveDate\":\"" + articleDate + "\"," +
                "\"mainReason\":\"Harga minyak global stabil\",\"userTip\":\"Prices stable. RON97 trend suggests easing next week.\"," +
                "\"affectedUsers\":\"RON97 users. BUDI95 remains fixed at RM1.99.\"}")
            .effectiveDate(articleDate)
            .mainReason("Global crude oil prices stable")
            .userTip("Prices stable. RON97 trend suggests easing next week — consider waiting.")
            .isNotified(true).build());

        // ---- Build response ----
        List<Map<String, Object>> userList = new ArrayList<>();
        for (Person p : ROSTER) {
            Vehicle v = vehicleMap.get(p.email());
            userList.add(Map.of(
                "email", p.email(),
                "name", p.name(),
                "role", roleLabel(p.role()),
                "vehicle", v != null ? v.getMake() + " " + v.getModel() + " (" + fuelLabel(v.getFuelType()) + ")" : "None"
            ));
        }

        Map<String, Object> demoGuide = new LinkedHashMap<>();
        demoGuide.put("title", "Try the full ride lifecycle");
        demoGuide.put("password", "password123");
        demoGuide.put("passengerAccount", Map.of("email", "nurul@utm.my", "name", "Nurul Ain"));
        demoGuide.put("driverAccount", Map.of("email", "ahmad@utm.my", "name", "Ahmad Razif"));
        demoGuide.put("ride", Map.of(
            "driver", "Ahmad Razif",
            "pickupLabel", KTDI_MA7.label(), "pickupLat", KTDI_MA7.lat(), "pickupLng", KTDI_MA7.lng(),
            "dropoffLabel", FACULTY_OF_COMPUTING.label(), "dropoffLat", FACULTY_OF_COMPUTING.lat(), "dropoffLng", FACULTY_OF_COMPUTING.lng()
        ));
        demoGuide.put("steps", List.of(
            "Log in as nurul@utm.my (password123) — she's a passenger with no pending requests yet.",
            "Go to Find Rides and open Ahmad Razif's ride from " + KTDI_MA7.label() + " to " + FACULTY_OF_COMPUTING.label() + ".",
            "Tap Request to Join, keeping pickup at " + KTDI_MA7.label() + " and drop-off at " + FACULTY_OF_COMPUTING.label() + ".",
            "Log out, then log in as ahmad@utm.my (password123) — he is the driver of that ride.",
            "Open My Rides, find Nurul Ain's request under that ride, and tap Accept.",
            "Tap Start Ride to begin the trip.",
            "Tap Complete Ride to finish — this records the trip and updates the eco dashboard & leaderboard."
        ));

        log.info("Demo seed complete");

        return ResponseEntity.ok(Map.of(
            "status", "success",
            "message", "Demo data ready! " + ROSTER.size() + " accounts created — password for ALL accounts is password123. Log in manually with any account below.",
            "totalUsers", ROSTER.size(),
            "totalRides", rides.size(),
            "users", userList,
            "demoGuide", demoGuide
        ));
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private Ride ride(RideSpec spec, Map<String, User> users, Map<String, Vehicle> vehicles, LocalDateTime now) {
        User driver = users.get(spec.driverEmail());
        Vehicle vehicle = vehicles.get(spec.driverEmail());

        double originLat = Double.parseDouble(spec.origin().lat());
        double originLng = Double.parseDouble(spec.origin().lng());
        double destLat = Double.parseDouble(spec.dest().lat());
        double destLng = Double.parseDouble(spec.dest().lng());

        double distKm = routeService.haversineMetres(originLat, originLng, destLat, destLng) / 1000.0;
        int totalOccupants = spec.confirmedPassengers() + 1;
        var fare = fareService.calculate(distKm, vehicle, totalOccupants);
        String mapsUrl = routeService.buildGoogleMapsUrl(originLat, originLng, destLat, destLng, List.of());

        return rideRepo.save(Ride.builder()
            .driver(driver).vehicle(vehicle)
            .originLat(bd(spec.origin().lat())).originLng(bd(spec.origin().lng())).originLabel(spec.origin().label())
            .destinationLat(bd(spec.dest().lat())).destinationLng(bd(spec.dest().lng())).destinationLabel(spec.dest().label())
            .departureTime(now.plusMinutes(spec.departureOffsetMinutes()))
            .maxSeats(spec.maxSeats()).confirmedPassengers(spec.confirmedPassengers())
            .status(spec.status())
            .estimatedDistanceKm(bd2(distKm))
            .estimatedFarePerPerson(fare.getFarePerPerson())
            .fuelCostTotal(fare.getFuelCostTotal())
            .googleMapsUrl(mapsUrl)
            .build());
    }

    private RideRequest addRequest(Ride ride, User passenger, RideRequest.RequestStatus status) {
        double distKm = ride.getEstimatedDistanceKm().doubleValue();
        int totalOccupants = ride.getConfirmedPassengers() + 2;
        BigDecimal fare = fareService.calculate(distKm, ride.getVehicle(), totalOccupants).getFarePerPerson();

        return rideRequestRepo.save(RideRequest.builder()
            .ride(ride).passenger(passenger)
            .pickupLat(ride.getOriginLat()).pickupLng(ride.getOriginLng()).pickupLabel(ride.getOriginLabel())
            .dropoffLat(ride.getDestinationLat()).dropoffLng(ride.getDestinationLng()).dropoffLabel(ride.getDestinationLabel())
            .status(status).fareAmount(fare)
            .build());
    }

    private void seedEcoStats(List<User> users) {
        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        for (int ui = 0; ui < users.size(); ui++) {
            User u = users.get(ui);
            for (int wi = 0; wi < 4; wi++) {
                LocalDate weekStart = currentWeekStart.minusWeeks(wi);
                ecoRepo.save(randomEcoStats(u, weekStart, (long) ui * 100 + wi, wi == 0));
            }
        }
    }

    private EcoWeeklyStats randomEcoStats(User user, LocalDate weekStart, long seed, boolean isCurrentWeek) {
        Random rnd = new Random(seed);
        int total = 3 + rnd.nextInt(5);
        int carpool = rnd.nextInt(total + 1);
        int solo = total - carpool;
        double carbonTotal = total * (1.8 + rnd.nextDouble() * 1.5);
        double carbonSaved = carpool * (1.2 + rnd.nextDouble() * 1.0);
        double fuelCost = total * (3.0 + rnd.nextDouble() * 4.0);
        double savedSolo = carpool * (4.0 + rnd.nextDouble() * 6.0);
        double savedGrab = carpool * (8.0 + rnd.nextDouble() * 10.0);
        double ecoScore = Math.min(100, 40 + carpool * 8 + rnd.nextInt(10));

        var builder = EcoWeeklyStats.builder()
            .user(user).weekStartDate(weekStart)
            .totalTrips(total).carpoolTrips(carpool).soloTrips(solo)
            .totalCarbonKg(bd2(carbonTotal)).carbonSavedKg(bd2(carbonSaved))
            .totalFuelCost(bd2(fuelCost)).savedVsSolo(bd2(savedSolo)).savedVsGrab(bd2(savedGrab))
            .ecoScore(bd2(ecoScore));

        if (isCurrentWeek) {
            builder.ollamaSummary("This week: " + carpool + " of " + total + " trips shared, saving RM "
                + bd2(savedGrab) + " vs Grab and " + bd2(carbonSaved) + " kg CO2 vs driving solo.");
        }
        return builder.build();
    }

    private void seedFuelLogs(List<Vehicle> vehicles) {
        FuelPrice latestPrice = fuelPriceRepo.findTopByOrderByPriceDateDesc().orElse(null);
        LocalDateTime now = LocalDateTime.now();
        String[] stations = {"Petronas Skudai", "Shell Skudai", "BHP Skudai", "Caltex Taman Universiti", "Petron Kolej"};
        Random rnd = new Random(777);

        for (Vehicle v : vehicles) {
            double eff = v.getAvgEfficiency().doubleValue();
            BigDecimal price = latestPrice != null
                ? fuelPriceService.getPriceForFuelType(latestPrice, v.getFuelType())
                : null;
            if (price == null) price = new BigDecimal("2.05");

            int runningOdo = v.getCurrentOdometer() - 5 * 430;
            for (int i = 5; i >= 1; i--) {
                int distSinceLast = 380 + rnd.nextInt(120);
                runningOdo += distSinceLast;
                double litres = distSinceLast / eff;
                BigDecimal litresBd = bd2(litres);
                BigDecimal totalCost = bd2(litres * price.doubleValue());
                BigDecimal efficiency = bd2(eff - 0.5 + rnd.nextDouble());
                BigDecimal costPerKm = totalCost.divide(BigDecimal.valueOf(distSinceLast), 4, RoundingMode.HALF_UP);

                fuelLogRepo.save(FuelLog.builder()
                    .user(v.getUser()).vehicle(v)
                    .logDate(now.minusDays(i * 12L))
                    .odometer(runningOdo)
                    .litresFilled(litresBd)
                    .pricePerLitre(price)
                    .totalCost(totalCost)
                    .isFullTank(true).isMissedPrevious(false)
                    .fuelType(v.getFuelType())
                    .stationName(stations[(int) ((v.getId() + i) % stations.length)])
                    .distanceSinceLast(distSinceLast)
                    .efficiencyThisFill(efficiency)
                    .costPerKm(costPerKm)
                    .build());
            }
        }
    }

    private String roleLabel(Role role) {
        return switch (role) {
            case DRIVER -> "Driver";
            case PASSENGER -> "Passenger";
            case BOTH -> "Driver & Passenger";
        };
    }

    private String fuelLabel(Vehicle.FuelType type) {
        return switch (type) {
            case RON95_MARKET -> "RON95";
            case RON95_BUDI95 -> "RON95 BUDI95";
            case RON97 -> "RON97";
            case DIESEL -> "Diesel";
            case DIESEL_EAST -> "Diesel (East Malaysia)";
        };
    }

    private BigDecimal bd(String val) { return new BigDecimal(val); }
    private BigDecimal bd2(double val) { return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP); }
    private BigDecimal bd4(double val) { return BigDecimal.valueOf(val).setScale(4, RoundingMode.HALF_UP); }

    // =========================================================================
    // Nested types
    // =========================================================================

    private enum Role { DRIVER, PASSENGER, BOTH }

    private record Person(String email, String name, User.Gender gender, String studentId, Role role) {}

    private record Spot(String label, String lat, String lng) {}

    private record VehicleSpec(String ownerEmail, String make, String model, int year, String color,
                                String plate, String tankCapacity, String avgEfficiency,
                                Vehicle.FuelType fuelType, int odometer) {}

    private record RideSpec(String driverEmail, Spot origin, Spot dest, int departureOffsetMinutes,
                             int maxSeats, int confirmedPassengers, Ride.RideStatus status) {}

    // =========================================================================
    // Static demo data — all locations are real spots inside UTM Skudai campus
    // =========================================================================

    private static final Spot KTDI_MA7 = new Spot("KTDI (MA7)", "1.5659000", "103.6334000");
    private static final Spot FACULTY_OF_COMPUTING = new Spot("Faculty of Computing (N28)", "1.5570000", "103.6367000");
    private static final Spot MAIN_GATE = new Spot("UTM Main Gate", "1.5588000", "103.6347000");
    private static final Spot KOLEJ_9_10 = new Spot("Kolej 9 & 10", "1.5602000", "103.6398000");
    private static final Spot KTC = new Spot("Kolej Tuanku Canselor", "1.5612000", "103.6378000");
    private static final Spot KTF = new Spot("Kolej Tun Fatimah", "1.5640000", "103.6310000");
    private static final Spot PSZ = new Spot("Perpustakaan Sultanah Zanariah", "1.5598000", "103.6385000");
    private static final Spot DSI = new Spot("Dewan Sultan Iskandar", "1.5605000", "103.6395000");
    private static final Spot FKE = new Spot("Faculty of Electrical Engineering", "1.5582000", "103.6355000");
    private static final Spot STADIUM = new Spot("UTM Stadium", "1.5560000", "103.6420000");
    private static final Spot MASJID = new Spot("Masjid Sultan Ismail UTM", "1.5615000", "103.6360000");
    private static final Spot KOLEJ_17 = new Spot("Kolej 17", "1.5598000", "103.6420000");
    private static final Spot KOLEJ_18 = new Spot("Kolej 18", "1.5605000", "103.6415000");

    private static final List<Person> ROSTER = List.of(
        new Person("ahmad@utm.my",    "Ahmad Razif",     User.Gender.MALE,   "A22EC0001", Role.DRIVER),
        new Person("nurul@utm.my",    "Nurul Ain",       User.Gender.FEMALE, "A22EC0002", Role.PASSENGER),
        new Person("haziq@utm.my",    "Haziq Faris",     User.Gender.MALE,   "A22EC0003", Role.BOTH),
        new Person("siti@utm.my",     "Siti Nabilah",    User.Gender.FEMALE, "A22EC0004", Role.PASSENGER),
        new Person("luqman@utm.my",   "Luqman Hakim",    User.Gender.MALE,   "A22EC0005", Role.DRIVER),
        new Person("aisyah@utm.my",   "Aisyah Humaira",  User.Gender.FEMALE, "A22EC0006", Role.PASSENGER),
        new Person("farid@utm.my",    "Farid Iskandar",  User.Gender.MALE,   "A22EC0007", Role.DRIVER),
        new Person("meiling@utm.my",  "Mei Ling Tan",    User.Gender.FEMALE, "A22EC0008", Role.PASSENGER),
        new Person("danish@utm.my",   "Danish Aiman",    User.Gender.MALE,   "A22EC0009", Role.BOTH),
        new Person("aliya@utm.my",    "Wan Aliya",       User.Gender.FEMALE, "A22EC0010", Role.PASSENGER),
        new Person("zulkifli@utm.my", "Zulkifli Hashim", User.Gender.MALE,   "A22EC0011", Role.DRIVER),
        new Person("hannah@utm.my",   "Hannah Yusof",    User.Gender.FEMALE, "A22EC0012", Role.BOTH),
        new Person("arjun@utm.my",    "Arjun Kumar",     User.Gender.MALE,   "A22EC0013", Role.PASSENGER),
        new Person("nadia@utm.my",    "Nadia Rahman",    User.Gender.FEMALE, "A22EC0014", Role.DRIVER),
        new Person("faiz@utm.my",     "Faiz Othman",     User.Gender.MALE,   "A22EC0015", Role.PASSENGER),
        new Person("syafiqah@utm.my", "Syafiqah Zainal", User.Gender.FEMALE, "A22EC0016", Role.BOTH),
        new Person("razak@utm.my",    "Razak Ibrahim",   User.Gender.MALE,   "A22EC0017", Role.DRIVER),
        new Person("weijie@utm.my",   "Lim Wei Jie",     User.Gender.MALE,   "A22EC0018", Role.PASSENGER),
        new Person("amirul@utm.my",   "Amirul Hadi",     User.Gender.MALE,   "A22EC0019", Role.BOTH),
        new Person("farah@utm.my",    "Farah Diana",     User.Gender.FEMALE, "A22EC0020", Role.DRIVER),
        new Person("kavitha@utm.my",  "Kavitha Selvam",  User.Gender.FEMALE, "A22EC0021", Role.PASSENGER),
        new Person("hafiz@utm.my",    "Hafiz Rosli",     User.Gender.MALE,   "A22EC0022", Role.BOTH),
        new Person("izzati@utm.my",   "Izzati Sofea",    User.Gender.FEMALE, "A22EC0023", Role.PASSENGER),
        new Person("bryan@utm.my",    "Bryan Anak Jawa", User.Gender.MALE,   "A22EC0024", Role.DRIVER)
    );

    private static final List<VehicleSpec> VEHICLES = List.of(
        new VehicleSpec("ahmad@utm.my",    "Perodua", "Myvi",    2022, "Silver", "JKK 1234", "40", "16", Vehicle.FuelType.RON95_BUDI95, 45230),
        new VehicleSpec("haziq@utm.my",    "Proton",  "Saga",    2021, "Blue",   "JKM 9101", "40", "15", Vehicle.FuelType.RON95_BUDI95, 33000),
        new VehicleSpec("luqman@utm.my",   "Honda",   "City",    2021, "Black",  "JKN 1122", "47", "14", Vehicle.FuelType.RON97,        28500),
        new VehicleSpec("farid@utm.my",    "Perodua", "Axia",    2020, "White",  "JKP 3344", "33", "18", Vehicle.FuelType.RON95_BUDI95, 52000),
        new VehicleSpec("danish@utm.my",   "Toyota",  "Vios",    2019, "Red",    "JKQ 5566", "42", "13", Vehicle.FuelType.RON95_BUDI95, 67000),
        new VehicleSpec("zulkifli@utm.my", "Proton",  "X50",     2022, "Grey",   "JKR 7788", "45", "14", Vehicle.FuelType.RON97,        22000),
        new VehicleSpec("hannah@utm.my",   "Perodua", "Bezza",   2021, "White",  "JKS 9900", "38", "17", Vehicle.FuelType.RON95_BUDI95, 38000),
        new VehicleSpec("nadia@utm.my",    "Honda",   "Civic",   2020, "Black",  "JKT 1011", "50", "12", Vehicle.FuelType.RON97,        48000),
        new VehicleSpec("syafiqah@utm.my", "Perodua", "Myvi",    2023, "Red",    "JKU 1213", "40", "16", Vehicle.FuelType.RON95_BUDI95, 12000),
        new VehicleSpec("razak@utm.my",    "Toyota",  "Hilux",   2019, "Silver", "JKV 1415", "80", "9",  Vehicle.FuelType.DIESEL,       85000),
        new VehicleSpec("amirul@utm.my",   "Proton",  "Persona", 2020, "Blue",   "JKW 1617", "45", "15", Vehicle.FuelType.RON95_BUDI95, 41000),
        new VehicleSpec("farah@utm.my",    "Mazda",   "3",       2021, "White",  "JKX 1819", "51", "13", Vehicle.FuelType.RON97,        25000),
        new VehicleSpec("hafiz@utm.my",    "Perodua", "Alza",    2022, "Silver", "JKY 2021", "43", "13", Vehicle.FuelType.RON95_BUDI95, 18000),
        new VehicleSpec("bryan@utm.my",    "Nissan",  "Almera",  2021, "Grey",   "JKZ 2223", "42", "16", Vehicle.FuelType.RON97,        30000)
    );

    private static final List<RideSpec> RIDE_SPECS = List.of(
        // 0: HERO RIDE — Ahmad, KTDI (MA7) -> Faculty of Computing (N28), OPEN, no requests (reserved for the guided demo)
        new RideSpec("ahmad@utm.my",    KTDI_MA7,    FACULTY_OF_COMPUTING, 30, 3, 0, Ride.RideStatus.OPEN),
        // 1: Haziq, Kolej 17 -> Faculty of Computing — 1 PENDING request (Aisyah)
        new RideSpec("haziq@utm.my",    KOLEJ_17,    FACULTY_OF_COMPUTING, 45, 3, 0, Ride.RideStatus.OPEN),
        // 2: Luqman, Main Gate -> PSZ — ACCEPTED (Mei Ling) + PENDING (Wan Aliya)
        new RideSpec("luqman@utm.my",   MAIN_GATE,   PSZ,                  20, 4, 1, Ride.RideStatus.OPEN),
        // 3: Farid, Kolej Tun Fatimah -> Faculty of Electrical Engineering
        new RideSpec("farid@utm.my",    KTF,         FKE,                  60, 3, 0, Ride.RideStatus.OPEN),
        // 4: Danish, Kolej Tuanku Canselor -> Dewan Sultan Iskandar — ACCEPTED (Arjun)
        new RideSpec("danish@utm.my",   KTC,         DSI,                  15, 3, 1, Ride.RideStatus.OPEN),
        // 5: Zulkifli, Kolej 9 & 10 -> Stadium
        new RideSpec("zulkifli@utm.my", KOLEJ_9_10,  STADIUM,              40, 3, 0, Ride.RideStatus.OPEN),
        // 6: Hannah, PSZ -> Faculty of Computing — IN_PROGRESS, ACCEPTED (Faiz)
        new RideSpec("hannah@utm.my",   PSZ,         FACULTY_OF_COMPUTING, -15, 3, 1, Ride.RideStatus.IN_PROGRESS),
        // 7: Nadia, Masjid Sultan Ismail -> Main Gate — COMPLETED (Kavitha was the passenger)
        new RideSpec("nadia@utm.my",    MASJID,      MAIN_GATE,            -2880, 3, 1, Ride.RideStatus.COMPLETED),
        // 8: Syafiqah, Kolej 17 -> PSZ
        new RideSpec("syafiqah@utm.my", KOLEJ_17,    PSZ,                  50, 3, 0, Ride.RideStatus.OPEN),
        // 9: Razak, Kolej 18 -> Main Gate
        new RideSpec("razak@utm.my",    KOLEJ_18,    MAIN_GATE,            35, 2, 0, Ride.RideStatus.OPEN),
        // 10: Amirul, Faculty of Electrical Engineering -> Kolej Tun Fatimah
        new RideSpec("amirul@utm.my",   FKE,         KTF,                  55, 3, 0, Ride.RideStatus.OPEN),
        // 11: Farah, Stadium -> Kolej Tuanku Canselor
        new RideSpec("farah@utm.my",    STADIUM,     KTC,                  70, 3, 0, Ride.RideStatus.OPEN),
        // 12: Hafiz, Dewan Sultan Iskandar -> Kolej 9 & 10
        new RideSpec("hafiz@utm.my",    DSI,         KOLEJ_9_10,           18, 4, 0, Ride.RideStatus.OPEN),
        // 13: Bryan, Main Gate -> Kolej 17
        new RideSpec("bryan@utm.my",    MAIN_GATE,   KOLEJ_17,             28, 3, 0, Ride.RideStatus.OPEN)
    );
}
