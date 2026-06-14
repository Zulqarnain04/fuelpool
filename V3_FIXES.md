# FuelPool v3 — Full Fix + Feature List
> Covers original bug fixes + 3 new AI features + manual weekly summary trigger

---

## Overview

| # | Type | File(s) | Priority |
|---|---|---|---|
| 1 | Bug | `RideController.java` | 🔴 High |
| 2 | Bug | `FuelLogRepository.java` + `Budi95Service.java` | 🔴 High |
| 3 | Bug | `RoutineScheduler.java` | 🟡 Medium |
| 4 | Bug | `RoutineRepository.java` | 🟢 Low |
| 5 | Cleanup | `traffic_dummy.json` | 🟢 Low |
| 6 | Feature | AI Refuelling Advisor (fix broken recommendation) | 🔴 High |
| 7 | Feature | AI MOF Classification + Extraction | 🔴 High |
| 8 | Feature | AI Price Prediction Enhancement | 🟡 Medium |
| 9 | Feature | Manual Weekly Summary Trigger | 🟡 Medium |

---

## Fix 1 — Add `GET /api/rides/mine`

**File:** `RideController.java`

```java
// Add to field injections:
private final RideRequestRepository rideRequestRepository;

// Add method:
@GetMapping("/mine")
public ResponseEntity<Map<String, Object>> myRides(@AuthenticationPrincipal User user) {
    List<Ride> asDriver = rideRepository.findByDriverIdAndStatusNot(
        user.getId(), Ride.RideStatus.CANCELLED);
    List<RideRequest> asPassenger = rideRequestRepository
        .findByPassengerIdOrderByCreatedAtDesc(user.getId());
    return ResponseEntity.ok(Map.of(
        "asDriver", asDriver,
        "asPassenger", asPassenger
    ));
}
```

---

## Fix 2 — BUDI95 @Query hardcoded string

**File A — `FuelLogRepository.java`:**

```java
// REMOVE:
@Query("SELECT SUM(f.litresFilled) FROM FuelLog f WHERE f.user.id = :userId AND f.fuelType = 'RON95_BUDI95' AND f.logDate >= :monthStart")
Double sumBudi95LitresThisMonth(Long userId, LocalDateTime monthStart);

// ADD:
@Query("SELECT SUM(f.litresFilled) FROM FuelLog f WHERE f.user.id = :userId AND f.fuelType = :fuelType AND f.logDate >= :monthStart")
Double sumBudi95LitresThisMonth(Long userId, LocalDateTime monthStart,
                                 @Param("fuelType") Vehicle.FuelType fuelType);
```

**File B — `Budi95Service.java`:**

```java
// FIND:
Double used = fuelLogRepository.sumBudi95LitresThisMonth(userId, monthStart);
// REPLACE:
Double used = fuelLogRepository.sumBudi95LitresThisMonth(userId, monthStart, Vehicle.FuelType.RON95_BUDI95);
```

---

## Fix 3 — Remove driver auto-post TODO log

**File:** `RoutineScheduler.java` — delete this entire block:

```java
// DELETE:
if ((routine.getRolePreference() == Routine.RolePreference.DRIVER
        || routine.getRolePreference() == Routine.RolePreference.EITHER)
        && !rideService.hasPostedRideToday(user.getId())) {
    log.info("Routine DRIVER auto-post not yet implemented (requires vehicle selection logic)");
}
```

---

## Fix 4 — RoutineRepository LIKE CONCAT

**File:** `RoutineRepository.java`

```java
// FIND:   AND r.daysOfWeek LIKE %:day%
// REPLACE: AND r.daysOfWeek LIKE CONCAT('%', :day, '%')
```

---

## Fix 5 — Delete traffic_dummy.json

```bash
rm backend/fuelpool-backend/src/main/resources/data/traffic_dummy.json
```

---

## Fix 6 — AI Refuelling Advisor

**Problem:** `getRecommendation()` always returns `"NORMAL"`. The main case study feature is broken.

**3 files to change + 1 new DTO field + 1 new repo method.**

### 6A — Update `RefuelRecommendationResponse.java`

```java
@Data @Builder
public class RefuelRecommendationResponse {
    private String  action;           // FILL_NOW | FILL_SOON | WAIT | NORMAL
    private String  reason;           // Ollama-generated sentence
    private Double  remainingFuelPct;
    private Double  remainingKm;
    private Double  remainingLitres;
    private Integer confidence;       // NEW — 0-100
    private Double  suggestedAmount;  // NEW — litres to fill
    private Double  estimatedSavings; // NEW — RM saved by acting now
    private Double  daysOfRange;      // NEW — days of fuel remaining
    private Integer behaviourScore;   // NEW — efficiency vs vehicle default
}
```

### 6B — Update `OllamaService.java` — add temperature support

Replace existing `generate()` with two overloads:

```java
// Default: 0.4 temperature for narrative/coaching text
public String generate(String systemPrompt, String userPrompt) {
    return generate(systemPrompt, userPrompt, 0.4);
}

// Explicit temperature — 0.0 for structured JSON, 0.3 for focused text
public String generate(String systemPrompt, String userPrompt, double temperature) {
    String fullPrompt = "System: " + systemPrompt + "\n\nUser: " + userPrompt;
    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", ollamaConfig.getModel());
    requestBody.put("prompt", fullPrompt);
    requestBody.put("stream", false);
    requestBody.put("options", Map.of("temperature", temperature)); // ADD THIS LINE
    // ... rest of existing RestClient call unchanged
}
```

### 6C — Rewrite `getRecommendation()` in `FuelLogService.java`

Add injections:
```java
private final TrendPredictionService trendPredictionService;
private final OllamaService ollamaService;
private final FuelPriceRepository fuelPriceRepository;
```

Replace the method:

```java
public RefuelRecommendationResponse getRecommendation(User user) {
    Vehicle vehicle = vehicleRepository.findByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);

    Vehicle.FuelType fuelType = vehicle != null ? vehicle.getFuelType() : Vehicle.FuelType.RON97;
    var trend = trendPredictionService.predict(fuelType);
    double slope = trend.getSlope();

    if (vehicle == null) {
        return RefuelRecommendationResponse.builder()
            .action(trend.getRecommendation()).reason(trend.getReason())
            .confidence(computeConfidence(slope)).build();
    }

    FuelLog lastLog = fuelLogRepository
        .findTopByVehicleIdOrderByLogDateDesc(vehicle.getId()).orElse(null);

    if (lastLog == null) {
        return RefuelRecommendationResponse.builder()
            .action(trend.getRecommendation())
            .reason(trend.getReason() + " Log your first fill-up to get fuel level estimates.")
            .confidence(computeConfidence(slope)).build();
    }

    double tankCapacity = vehicle.getTankCapacity().doubleValue();
    double efficiency   = vehicle.getAvgEfficiency().doubleValue();
    long   daysSince    = ChronoUnit.DAYS.between(
        lastLog.getLogDate().toLocalDate(), LocalDate.now());
    double dailyKm      = computeDailyKmEstimate(user.getId());
    double fuelUsed     = (daysSince * dailyKm) / efficiency;
    double remaining    = Math.max(0,
        (lastLog.isFullTank() ? tankCapacity : lastLog.getLitresFilled().doubleValue()) - fuelUsed);
    double remainPct    = (remaining / tankCapacity) * 100;
    double remainKm     = remaining * efficiency;
    double daysOfRange  = dailyKm > 0 ? remainKm / dailyKm : 0;
    int behaviourScore  = (int) Math.min(100, Math.round((efficiency / 16.0) * 100));

    double currentPrice      = getCurrentPrice(fuelType);
    double predictedNextWeek = trend.getPredicted().isEmpty() ? currentPrice : trend.getPredicted().get(0);

    String action;
    double suggestedAmount;
    double estimatedSavings;

    if (remainPct < 20) {
        action = "FILL_NOW";
        suggestedAmount = round(tankCapacity - remaining);
        estimatedSavings = 0;
    } else if ("RISING".equals(trend.getDirection()) && remainPct < 60) {
        action = "FILL_NOW";
        suggestedAmount = round(tankCapacity - remaining);
        estimatedSavings = round(Math.max(0, predictedNextWeek - currentPrice) * suggestedAmount);
    } else if ("FALLING".equals(trend.getDirection()) && remainPct > 30) {
        action = "WAIT";
        double litresFor3Days = (3 * dailyKm) / efficiency;
        suggestedAmount = round(Math.max(0, litresFor3Days - remaining));
        estimatedSavings = round(Math.max(0, currentPrice - predictedNextWeek) * (tankCapacity - remaining));
    } else if (remainPct < 40) {
        action = "FILL_SOON";
        suggestedAmount = round(tankCapacity * 0.75 - remaining);
        estimatedSavings = 0;
    } else {
        action = "NORMAL";
        suggestedAmount = 0;
        estimatedSavings = 0;
    }

    String reason = generateRefuelReason(action, remaining, remainKm, dailyKm,
        daysOfRange, trend.getDirection(), slope, currentPrice,
        predictedNextWeek, suggestedAmount, estimatedSavings, fuelType.name());

    return RefuelRecommendationResponse.builder()
        .action(action)
        .reason(reason != null ? reason : trend.getReason())
        .remainingFuelPct(round(remainPct))
        .remainingKm(round(remainKm))
        .remainingLitres(round(remaining))
        .confidence(computeConfidence(slope))
        .suggestedAmount(Math.max(0, suggestedAmount))
        .estimatedSavings(estimatedSavings)
        .daysOfRange(round(daysOfRange))
        .behaviourScore(behaviourScore)
        .build();
}

private double round(double v) { return Math.round(v * 10.0) / 10.0; }

private double computeDailyKmEstimate(Long userId) {
    List<FuelLog> logs = fuelLogRepository
        .findTop3ByUserIdAndDistanceSinceLastIsNotNullOrderByLogDateDesc(userId);
    if (logs.isEmpty()) return 22.0;
    return logs.stream()
        .mapToDouble(l -> l.getDistanceSinceLast() != null && l.getDistanceSinceLast() > 0
            ? l.getDistanceSinceLast() / 14.0 : 22.0)
        .average().orElse(22.0);
}

private int computeConfidence(double slope) {
    int c = 65;
    double abs = Math.abs(slope);
    if (abs > 0.20) c += 15;
    else if (abs > 0.10) c += 10;
    else if (abs > 0.05) c += 5;
    return Math.min(95, Math.max(40, c));
}

private double getCurrentPrice(Vehicle.FuelType fuelType) {
    return fuelPriceRepository.findTopByOrderByPriceDateDesc()
        .map(p -> { BigDecimal v = fuelPriceService.getPriceForFuelType(p, fuelType);
                    return v != null ? v.doubleValue() : 4.35; })
        .orElse(4.35);
}

private String generateRefuelReason(String action, double remaining, double remainKm,
        double dailyKm, double daysOfRange, String direction, double slope,
        double currentPrice, double predictedPrice, double suggestedAmount,
        double savings, String fuelType) {
    String prompt = String.format(
        "A Malaysian driver has %.1fL of %s remaining (%.0f km, ~%.1f days at %.0f km/day). " +
        "Price trend: %s (%.1f sen/week). Current: RM %.2f, next week: RM %.2f. " +
        "Recommendation: %s — fill %.1fL, estimated savings RM %.2f. " +
        "Write ONE sentence. Use specific numbers. Max 20 words.",
        remaining, fuelType, remainKm, daysOfRange, dailyKm,
        direction, slope * 100, currentPrice, predictedPrice,
        action, suggestedAmount, savings);
    return ollamaService.generate(
        "You are a concise Malaysian fuel advisor. One sentence only.", prompt, 0.3);
}
```

### 6D — Add to `FuelLogRepository.java`

```java
List<FuelLog> findTop3ByUserIdAndDistanceSinceLastIsNotNullOrderByLogDateDesc(Long userId);
```

---

## Fix 7 — AI MOF Classification + Extraction

**Problem:** Keyword matching breaks when MOF changes page layout. Ollama classifies by meaning.

### 7A — Replace `MOFScraperService.java`

```java
@Service @RequiredArgsConstructor @Slf4j
public class MOFScraperService {

    private static final String MOF_URL = "https://www.mof.gov.my/portal/en/news/press-citations";
    private final MOFArticleParser articleParser;

    public void scrapeAndProcess() {
        try {
            Document doc = Jsoup.connect(MOF_URL)
                .userAgent("Mozilla/5.0 (compatible; FuelPool/1.0)")
                .timeout(10_000).get();

            int checked = 0;
            for (Element link : doc.select("a[href]")) {
                if (checked >= 5) break;
                String href = link.absUrl("href");
                if (href.isBlank() || !href.contains("mof.gov.my")) continue;

                try {
                    String content = Jsoup.connect(href)
                        .userAgent("Mozilla/5.0").timeout(10_000)
                        .get().body().text();
                    String truncated = content.length() > 1500 ? content.substring(0, 1500) : content;

                    boolean wasFuel = articleParser.classifyAndSave(link.text(), href, truncated);
                    if (wasFuel) { log.info("Fuel article saved: {}", link.text()); return; }
                    checked++;
                } catch (Exception e) {
                    log.warn("Failed to fetch {}: {}", href, e.getMessage());
                }
            }
            log.warn("No fuel article found in top 5 articles");
        } catch (Exception e) {
            log.error("MOF scrape failed: {}", e.getMessage());
            useFallbackArticle();
        }
    }

    private void useFallbackArticle() {
        String fallback = "Kementerian Kewangan Malaysia mengumumkan harga runcit minyak " +
            "minggu 12 Jun 2026. RON95 kekal RM 2.05, RON97 naik 10 sen kepada RM 4.45, " +
            "diesel kekal RM 2.15. Berkuat kuasa 12 Jun 2026.";
        articleParser.classifyAndSave("Harga Runcit Minyak (Demo)", MOF_URL, fallback);
    }
}
```

### 7B — Replace `MOFArticleParser.java`

```java
@Service @RequiredArgsConstructor @Slf4j
public class MOFArticleParser {

    private final OllamaService ollamaService;
    private final MOFArticleRepository mofArticleRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT =
        "You are a Malaysian government document classifier and data extractor. " +
        "Respond ONLY with valid JSON. No markdown, no text outside the JSON.";

    private static final String USER_PROMPT =
        "Read this article. Is it an official Malaysian Ministry of Finance fuel price announcement?\n\n" +
        "Reply ONLY with this JSON:\n" +
        "{\n" +
        "  \"isFuelAnnouncement\": true or false,\n" +
        "  \"effectiveDate\": \"YYYY-MM-DD or null\",\n" +
        "  \"ron95\": number or null,\n" +
        "  \"ron97\": number or null,\n" +
        "  \"diesel\": number or null,\n" +
        "  \"dieselEastMalaysia\": number or null,\n" +
        "  \"budi95\": number or null,\n" +
        "  \"reason\": \"one sentence or null\",\n" +
        "  \"userTip\": \"one actionable sentence for Malaysian drivers or null\"\n" +
        "}\n\n" +
        "If isFuelAnnouncement is false, all other fields must be null.\n\nArticle:\n";

    /** @return true if article was a fuel announcement and was saved */
    public boolean classifyAndSave(String title, String url, String content) {
        // temperature 0 — deterministic JSON extraction, no randomness in numbers
        String response = ollamaService.generate(SYSTEM_PROMPT, USER_PROMPT + content, 0.0);
        if (response == null) { log.warn("Ollama returned null for: {}", title); return false; }

        try {
            JsonNode node = objectMapper.readTree(sanitize(response));

            if (!node.path("isFuelAnnouncement").asBoolean(false)) {
                log.debug("'{}' → not a fuel announcement", title);
                return false;
            }

            MOFArticle article = MOFArticle.builder()
                .fetchedAt(LocalDateTime.now()).title(title).sourceUrl(url)
                .rawContent(content).ollamaAnalysis(response)
                .parsedChanges(buildChanges(node))
                .mainReason(node.path("reason").asText(null))
                .userTip(node.path("userTip").asText(null))
                .isNotified(false).build();

            String dateStr = node.path("effectiveDate").asText(null);
            if (dateStr != null && !dateStr.equals("null") && !dateStr.isBlank()) {
                try { article.setEffectiveDate(LocalDate.parse(dateStr)); }
                catch (Exception ignored) {}
            }

            mofArticleRepository.save(article);
            notificationService.sendToAll("⛽ Fuel Price Update",
                article.getUserTip() != null ? article.getUserTip() : "Check the latest fuel prices.");
            return true;

        } catch (Exception e) {
            log.warn("Parse failed for '{}': {}", title, e.getMessage()); return false;
        }
    }

    private String buildChanges(JsonNode n) {
        return String.format("[{\"ron95\":%s,\"ron97\":%s,\"diesel\":%s,\"dieselEastMalaysia\":%s,\"budi95\":%s}]",
            val(n,"ron95"), val(n,"ron97"), val(n,"diesel"), val(n,"dieselEastMalaysia"), val(n,"budi95"));
    }
    private String val(JsonNode n, String f) {
        return n.path(f).isMissingNode() || n.path(f).isNull() ? "null" : n.path(f).toString();
    }
    private String sanitize(String raw) {
        return raw.replaceAll("(?s)```json\\s*","").replaceAll("```","").trim();
    }
}
```

---

## Fix 8 — AI Price Prediction Enhancement

**New endpoint:** `GET /api/fuel/trend/enhanced` — extends the existing `/trend` with price range, variance, and an Ollama-generated reason. Existing `/trend` stays unchanged.

### 8A — Create `EnhancedPredictionResponse.java`

```java
package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder; import lombok.Data; import java.util.List;

@Data @Builder
public class EnhancedPredictionResponse {
    private String       prediction;      // "UP" | "DOWN" | "STABLE"
    private int          confidence;      // 0-100
    private List<Double> nextWeekRange;   // [lower, upper] in RM
    private double       predictedPrice;  // midpoint RM
    private String       reason;          // Ollama sentence
    private String       basedOn;         // transparency field
    private List<Double> priceHistory;    // last 6 weeks for frontend chart
    private double       weeklyChangeSen; // slope × 100 (sen/week)
}
```

### 8B — Add `predictEnhanced()` to `TrendPredictionService.java`

Add injections:
```java
private final OllamaService ollamaService;
private final MOFArticleRepository mofArticleRepository;
```

Add method:

```java
public EnhancedPredictionResponse predictEnhanced(Vehicle.FuelType fuelType) {
    List<FuelPrice> recent = fuelPriceService.getLastNPrices(6);
    List<Double> prices = new ArrayList<>();
    for (int i = recent.size() - 1; i >= 0; i--) {
        BigDecimal p = fuelPriceService.getPriceForFuelType(recent.get(i), fuelType);
        if (p != null) prices.add(p.doubleValue());
    }

    if (prices.size() < 2) {
        return EnhancedPredictionResponse.builder()
            .prediction("STABLE").confidence(40).nextWeekRange(List.of(0.0, 0.0))
            .predictedPrice(0).reason("Insufficient data.").basedOn("< 2 weeks of data")
            .priceHistory(prices).weeklyChangeSen(0).build();
    }

    // Linear regression
    int n = prices.size();
    double xMean = (n - 1) / 2.0, yMean = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    double num = 0, den = 0;
    for (int i = 0; i < n; i++) { num += (i - xMean) * (prices.get(i) - yMean); den += Math.pow(i - xMean, 2); }
    double slope = den == 0 ? 0 : num / den;
    double predicted = BigDecimal.valueOf(yMean - slope * xMean + slope * n).setScale(2, RoundingMode.HALF_UP).doubleValue();

    // Price range via variance
    double variance = prices.stream().mapToDouble(p -> Math.pow(p - yMean, 2)).average().orElse(0);
    double uncertainty = Math.sqrt(variance) * 1.5;
    double lower = BigDecimal.valueOf(Math.max(0, predicted - uncertainty)).setScale(2, RoundingMode.HALF_UP).doubleValue();
    double upper = BigDecimal.valueOf(predicted + uncertainty).setScale(2, RoundingMode.HALF_UP).doubleValue();

    // Confidence
    int c = 65;
    double abs = Math.abs(slope);
    if (abs > 0.20) c += 15; else if (abs > 0.10) c += 10; else if (abs > 0.05) c += 5;
    c += Math.min(10, prices.size() * 2);
    if (variance < 0.01) c += 10; else if (variance > 0.10) c -= 10;
    c = Math.min(95, Math.max(40, c));

    String direction = slope < -0.05 ? "DOWN" : slope > 0.05 ? "UP" : "STABLE";
    String mofContext = mofArticleRepository.findTopByOrderByFetchedAtDesc()
        .map(a -> a.getMainReason() != null ? a.getMainReason() : "No recent MOF update")
        .orElse("No recent MOF update");

    String prompt = String.format(
        "Malaysian %s fuel last 6 weeks (oldest→newest): %s. " +
        "Trend: %s at %.1f sen/week. Predicted next week: RM %.2f (range RM %.2f–%.2f). " +
        "MOF context: %s. " +
        "Write ONE sentence explaining this trend for a Malaysian driver. " +
        "Mention direction and main reason. Max 25 words.",
        fuelType.name(), prices, direction, slope * 100, predicted, lower, upper, mofContext);

    String reason = ollamaService.generate(
        "You are a concise Malaysian fuel price analyst.", prompt, 0.3);

    return EnhancedPredictionResponse.builder()
        .prediction(direction).confidence(c)
        .nextWeekRange(List.of(lower, upper)).predictedPrice(predicted)
        .reason(reason != null ? reason : "Trend based on last " + n + " weeks of data.")
        .basedOn(n + "-week linear regression + MOF context")
        .priceHistory(prices)
        .weeklyChangeSen(BigDecimal.valueOf(slope * 100).setScale(2, RoundingMode.HALF_UP).doubleValue())
        .build();
}
```

### 8C — Add endpoint to `FuelPriceController.java`

```java
@GetMapping("/trend/enhanced")
public ResponseEntity<EnhancedPredictionResponse> enhancedTrend(
        @RequestParam(defaultValue = "RON97") String fuelType) {
    return ResponseEntity.ok(
        trendService.predictEnhanced(Vehicle.FuelType.valueOf(fuelType)));
}
```

---

## Fix 9 — Manual Weekly Summary Trigger

### 9A — Update `WeeklySummaryService.java`

```java
// CHANGE private → public:
public void generateForUser(EcoWeeklyStats stats) {
    // existing implementation unchanged
}

// ADD new public entry point:
public String generateForCurrentUser(User user) {
    LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
    EcoWeeklyStats stats = statsRepository
        .findByUserIdAndWeekStartDate(user.getId(), weekStart)
        .orElseThrow(() -> new BusinessException(
            "No weekly stats yet. Complete a trip or run POST /api/demo/seed first."));
    generateForUser(stats);
    return stats.getOllamaSummary();
}
```

### 9B — Add endpoint to `EcoTrackController.java`

Add injection:
```java
private final WeeklySummaryService weeklySummaryService;
```

Add method:
```java
@PostMapping("/summary/generate")
public ResponseEntity<Map<String, Object>> generateSummary(@AuthenticationPrincipal User user) {
    String summary = weeklySummaryService.generateForCurrentUser(user);
    return ResponseEntity.ok(Map.of(
        "summary", summary != null ? summary : "Could not generate summary. Check Ollama is running.",
        "generatedAt", LocalDateTime.now().toString(),
        "model", "llama3.2:3b"
    ));
}
```

---

## New Endpoints Added in v3

| Method | Path | What it does |
|---|---|---|
| GET | `/api/rides/mine` | My rides as driver + passenger |
| GET | `/api/fuel/trend/enhanced` | Price prediction with range, confidence, Ollama reason |
| POST | `/api/eco/summary/generate` | Trigger Ollama coaching tip live |

---

## New AI Calls After v3

| Trigger | Temperature | Ollama role |
|---|---|---|
| `POST /api/fuel/mof/trigger` | 0.0 | Classify article + extract prices as JSON |
| `GET /api/fuel/recommendation` | 0.3 | One-sentence refuel advice using calculated numbers |
| `GET /api/fuel/trend/enhanced` | 0.3 | One-sentence trend explanation |
| `POST /api/eco/summary/generate` | 0.4 | Personalised weekly coaching paragraph |
| Sunday scheduler | 0.4 | Same as above, all users |

Temperature 0.0 = deterministic (for numbers). Temperature 0.3-0.4 = natural variation (for text).

---

## Full Checklist

```
Bug fixes
[ ] RideController.java                   → add GET /api/rides/mine
[ ] FuelLogRepository.java                → BUDI95 @Query enum param
[ ] Budi95Service.java                    → update call to pass enum
[ ] RoutineScheduler.java                 → remove driver TODO log
[ ] RoutineRepository.java                → LIKE CONCAT fix
[ ] traffic_dummy.json                    → delete

AI Refuelling Advisor (Fix 6)
[ ] RefuelRecommendationResponse.java     → add 5 new fields
[ ] OllamaService.java                    → add temperature param
[ ] FuelLogService.java                   → rewrite getRecommendation()
[ ] FuelLogRepository.java                → add findTop3ByUserId...DistanceSinceLast...

AI MOF Classification (Fix 7)
[ ] MOFScraperService.java                → scrape multiple articles, no keyword filter
[ ] MOFArticleParser.java                 → classifyAndSave() with Ollama + temperature 0

AI Price Prediction (Fix 8)
[ ] EnhancedPredictionResponse.java       → create new DTO
[ ] TrendPredictionService.java           → add predictEnhanced() + inject OllamaService
[ ] FuelPriceController.java              → add GET /api/fuel/trend/enhanced

Manual Weekly Summary (Fix 9)
[ ] WeeklySummaryService.java             → make generateForUser() public, add generateForCurrentUser()
[ ] EcoTrackController.java               → add POST /api/eco/summary/generate
```
