# FuelPool Spec — v2 Changes
> Diff against FUELPOOL_SPEC.md (v1). Only modified sections listed.
> Apply these on top of v1. Everything not listed is unchanged.

---

## Section 2 · Tech Stack — update Java version note

| Layer | Technology |
|---|---|
| Backend | Spring Boot **4.1.x**, Java **21** |
| HTTP client | **RestClient** (replaces deprecated RestTemplate) |
| All other rows | unchanged |

---

## Section 3 · Data Sources — remove item 3.3

**DELETE section 3.3 entirely.** `traffic_dummy.json` is removed.

> Reason: UTM campus has negligible traffic congestion. The feature adds no real value and the matching algorithm never used traffic data anyway.

Renumber: old 3.4 (Vehicle Database) → new **3.3**.

---

## Section 5.3 · Matching Algorithm Step 4 — update score comment

Replace the comment line in Step 4:

```
// BEFORE:
// Lower time diff = better, lower pickup distance = better, higher seat fill = better

// AFTER:
// No traffic scoring — UTM campus has negligible congestion
// Lower time diff = better, lower pickup distance = better, higher seat fill = better
```

Score weights unchanged:
```
score = (1 - timeDiffMinutes/15) × 0.40
      + (1 - pickupDistance/1000) × 0.35
      + seatFillRatio × 0.25
```

---

## Section 8 · Backend Code Structure — remove traffic file

In the `resources/data/` tree, remove `traffic_dummy.json`. The line becomes:

```
└── resources/data/
    ├── fuelprice.csv           ← copy from repo root into here (CSV loader needs it)
    ├── vehicles.json
    └── dummy_users.sql         ← used by DemoController, not spring.sql.init
```

---

## Section 10 · API Endpoints — add missing endpoints

Add these to the existing endpoint table:

```
# Auth — unchanged

# Fuel Intelligence (L1) — add:
GET    /api/fuel/logs/{id}         → FuelLog (single)
GET    /api/fuel/stats             → { totalSpend, totalLitres, avgEfficiency, monthlyBreakdown }
GET    /api/fuel/budi95/status     → { usedLitres, limitLitres, remainingLitres, limitExceeded, effectivePrice }

# Seat Optimizer (L2) — add:
GET    /api/rides                  ?status=OPEN&lat=&lng=&radius=5000 → List<Ride> (map markers)
POST   /api/rides/{id}/rate        Body: { rating: 1-5, targetUserId } → 200 OK

# EcoTrack (L3) — add:
GET    /api/eco/monthly            → { month, totalSavedVsSolo, totalSavedVsGrab, totalCarbonSavedKg, totalCarpoolTrips }
GET    /api/eco/habits             → { avgEfficiencyKmPerL, efficiencyTrend[], efficiencyStatus, carpoolRatePercent, budi95? }

# Demo — new controller, no auth required:
POST   /api/demo/seed              → { status, tokens{email→jwt}, users[], openRides }
GET    /api/demo/health            → { status: "ok", app: "FuelPool Backend" }
```

---

## Section 11 · Dummy Data — remove traffic_dummy.json block

Delete the `traffic_dummy.json` sample JSON block entirely.
Keep `vehicles.json` and dummy users sections unchanged.

---

## New Section · Notes for Claude Code — Spring Boot 4.1 additions

Append to the existing notes list:

```
11. RestTemplate is removed in Spring Boot 4.x — use RestClient everywhere.
    OllamaConfig creates a RestClient bean (not RestTemplate).
    OllamaService injects RestClient (not RestTemplate).
    JdkClientHttpRequestFactory + Java 21 HttpClient handles timeouts.

12. CORS: allowCredentials(false) — we use JWT Bearer tokens, not cookies.
    allowedOriginPatterns must NOT use wildcard when credentials = true (Spring Security 7 rejects it).

13. @JsonIgnore on User.password and all UserDetails override methods.
    Without this, every API response leaks the bcrypt hash.

14. @JsonIgnoreProperties({"hibernateLazyInitializer","handler"}) on every @ManyToOne field
    in every entity. Without this, Jackson crashes on Hibernate proxies at runtime.

15. @Modifying @Transactional required on all Spring Data JPA bulk delete methods
    (deleteAllBy..., deleteAll...). Derived delete without @Modifying throws UnsupportedOperationException.

16. DemoController at /api/demo/** is permit-all in SecurityConfig.
    /api/demo/seed must be called without Authorization header.
    Returns JWT tokens for all 5 demo users so frontend can auto-login any of them.

17. spring.threads.virtual.enabled: true in application.yaml — free Java 21 virtual thread concurrency.

18. fuelprice.csv must be in src/main/resources/data/ for the CommandLineRunner to find it.
    Copy from repo root into that folder before first run.
```

---

## Change Log

| Version | Date | Changes |
|---|---|---|
| v1 | Jun 13 2026 | Initial spec |
| v2 | Jun 14 2026 | Remove traffic congestion feature; add SB4.1+Java21 compatibility notes; add missing endpoints (demo seed, /api/rides list, fuel stats, budi95 status, eco monthly, eco habits, rate ride); document fuelprice.csv placement |
