# FuelPool — Full Technical Specification
> For use with Claude Code. All equations, algorithms, data sources, and backend structure included.
> Last updated: June 2026

---

## Table of Contents
1. [App Overview](#1-app-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Sources](#3-data-sources)
4. [Layer 1 — Fuel Intelligence](#4-layer-1--fuel-intelligence)
5. [Layer 2 — Seat Optimizer](#5-layer-2--seat-optimizer)
6. [Layer 3 — EcoTrack (Main Dashboard)](#6-layer-3--ecotrack-main-dashboard)
7. [App Flow](#7-app-flow)
8. [Backend Code Structure](#8-backend-code-structure)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [Dummy Data](#11-dummy-data)

---

## 1. App Overview

**FuelPool** is a Malaysian campus-focused fuel management and carpooling app with three layers:
- **L1 Fuel Intelligence** — tracks fuel prices, predicts future prices via MOF article AI analysis and historical trend, advises users when to refuel
- **L2 Seat Optimizer** — campus carpool matching with AI-powered gender-aware pairing, map navigation, routine auto-requests
- **L3 EcoTrack** — the MAIN DASHBOARD, shows carbon footprint, savings, community comparison, driving habits

**Target users:** UTM campus community (students, staff)
**Demo mode:** All external APIs replaced with dummy data. Ollama runs locally on `http://localhost:11434`.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.x, Java 17 |
| Database | MySQL (Aiven cloud) |
| ORM | Spring Data JPA + Hibernate |
| Auth | JWT (Bearer token) |
| AI | Ollama local API (`llama3.2:3b`) |
| Scheduler | Spring `@Scheduled` |
| HTML parser | Jsoup 1.17.2 |
| Frontend | React Native (Expo) — separate repo |
| Map | Google Maps Deep Link (Intent URL, no SDK needed) |
| Push notifications | Firebase Cloud Messaging (FCM) — stub for hackathon |

---

## 3. Data Sources

### 3.1 Fuel Price Historical Data
- **Source:** data.gov.my (Department of Statistics Malaysia)
- **API URL:** `https://api.data.gov.my/data-catalogue?id=fuelprice&limit=100`
- **Parquet download:** `https://storage.data.gov.my/commodities/fuelprice.parquet`
- **CSV (local copy):** `fuelprice.csv` — included in `/resources/data/`
- **License:** CC BY 4.0 — free to use
- **Format:**
```json
{
  "series_type": "level",
  "date": "2026-06-11",
  "ron95": 3.72,
  "ron97": 4.35,
  "diesel": 4.67,
  "diesel_eastmsia": 2.15,
  "ron95_budi95": 1.99,
  "ron95_skps": 2.05
}
```
- **Update frequency:** Weekly (every Wednesday, announced after 5PM)
- **NOTE:** Only rows where `series_type = "level"` contain actual prices. Rows where `series_type = "change_weekly"` contain weekly delta values — use these for trend analysis.

### 3.2 MOF Weekly Fuel Price Press Release
- **Source:** Ministry of Finance Malaysia
- **Press release page:** `https://www.mof.gov.my/portal/en/news/press-citations`
- **Alternative (Bernama):** `https://www.bernama.com` — search "harga petrol"
- **Scrape method:** Jsoup, filter anchor tags with text containing "petrol", "RON", "fuel", "minyak", "harga"
- **Fallback for demo:** Use hardcoded article string from real MOF press release

### 3.3 Dummy Traffic Data
- **Source:** Hardcoded JSON in `/resources/data/traffic_dummy.json`
- **Format:** Peak hours by route, congestion level (0–100), average delay minutes
- **No external API needed** for hackathon

### 3.4 Vehicle Database
- **Source:** Hardcoded list of Malaysian popular vehicles in `/resources/data/vehicles.json`
- **Fields:** make, model, year, tankCapacity (L), defaultEfficiency (km/L), fuelType
- **Example vehicles:** Perodua Myvi (40L tank, 16km/L), Proton Saga (40L, 15km/L), Honda City (47L, 14km/L)

---

## 4. Layer 1 — Fuel Intelligence

### 4.1 Fuel Type System

Users **must** specify their fuel type during setup (changeable anytime in profile):

| Enum Value | Display Name | Price Source | Notes |
|---|---|---|---|
| `RON95_MARKET` | RON95 (market) | `ron95` column | Non-subsidised rate |
| `RON95_BUDI95` | RON95 BUDI95 | `ron95_budi95` = RM1.99 | Eligible Malaysians only, max 300L/month |
| `RON97` | RON97 | `ron97` column | Fluctuates weekly |
| `DIESEL` | Diesel (Peninsular) | `diesel` column | |
| `DIESEL_EAST` | Diesel (East Malaysia) | `diesel_eastmsia` column | |

**BUDI95 logic:**
```
IF user.fuelType == RON95_BUDI95:
    budi_used_this_month = SUM(fuelLog.litresFilled WHERE month = current_month AND fuelType = RON95_BUDI95)
    IF budi_used_this_month < 300:
        effective_price = 1.99
    ELSE:
        effective_price = current_ron95_market_price   // switched to market rate
        notify_user("You have exceeded the 300L BUDI95 monthly limit. Market rate applies.")
ELSE:
    effective_price = current_price_for_user_fuel_type
```

### 4.2 Fuel Log (Fuelio-style)

Users log each fill-up manually. Fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | DateTime | Yes | When they filled up |
| `odometer` | Integer (km) | Yes | Current odometer reading |
| `litresFilled` | Double | Yes | Amount filled |
| `pricePerLitre` | Double | Yes (auto-calc if total given) | Current price at pump |
| `totalCost` | Double | Yes (auto-calc if per-litre given) | `pricePerLitre × litresFilled` |
| `isFullTank` | Boolean | Yes | Did they fill to full? |
| `isMissedPrevious` | Boolean | Yes | Did they miss logging last fill-up? |
| `stationName` | String | No | Free text, e.g. "Petronas Skudai" |
| `fuelType` | Enum | Yes | Pre-filled from user profile, editable |
| `notes` | String | No | Free text |

**Auto-calculations on save:**
```
distanceSinceLastFill = currentOdometer - previousOdometer

// Efficiency only calculated when BOTH fills are full tanks AND no missed fill-up
IF isFullTank == true AND previousLog.isFullTank == true AND isMissedPrevious == false:
    efficiencyThisFill = distanceSinceLastFill / litresFilled   // km/L
    update vehicle.avgEfficiency = rolling average of last 5 efficiency readings
ELSE:
    efficiencyThisFill = null   // cannot calculate accurately
    
costPerKm = totalCost / distanceSinceLastFill   // RM/km
```

**Remaining fuel estimator (live, between fill-ups):**
```
kmDrivenSinceFill = currentOdometer - lastFuelLog.odometer
fuelUsedEstimate = kmDrivenSinceFill / vehicle.avgEfficiency
remainingFuel = lastFuelLog.litresFilled - fuelUsedEstimate   // litres

// If user filled full tank:
// remainingFuel = vehicle.tankCapacity - fuelUsedEstimate

remainingPercent = (remainingFuel / vehicle.tankCapacity) × 100
remainingKm = remainingFuel × vehicle.avgEfficiency
```

> **Note:** `currentOdometer` in live mode is estimated: `lastFuelLog.odometer + (lastFuelLog.distanceSinceLastFill estimated from typical daily distance)`. For demo, use a hardcoded increment of 15km/day since last fill-up.

### 4.3 Price Trend Prediction Algorithm

**Input:** Last N weeks of fuel prices from the fuel price CSV/API (use `series_type = "level"`)
**Output:** Predicted prices for next 4 weeks + trend direction + confidence

**Step 1 — Linear Regression (Simple):**
```
// Use last 6 data points for recent trend (6 weeks)
data = last 6 weekly prices for user's fuel type
n = 6

// Assign x = [0, 1, 2, 3, 4, 5], y = price values
x_mean = 2.5
y_mean = average(data)

numerator   = SUM( (x[i] - x_mean) × (y[i] - y_mean) ) for i = 0..5
denominator = SUM( (x[i] - x_mean)^2 ) for i = 0..5

slope     = numerator / denominator    // RM change per week
intercept = y_mean - slope × x_mean

// Predict next 4 weeks
for week = 1..4:
    predicted[week] = intercept + slope × (n - 1 + week)
    predicted[week] = round(predicted[week], 2)
```

**Step 2 — Trend Direction:**
```
IF slope < -0.05:  trend = "FALLING"   // dropping more than 5 sen/week
IF slope > 0.05:   trend = "RISING"    // rising more than 5 sen/week
ELSE:              trend = "STABLE"
```

**Step 3 — Fill-Up Recommendation:**
```
remainingPercent = (from 4.2 above)

IF trend == "RISING" AND remainingPercent < 50:
    recommendation = "FILL_NOW"
    reason = "Prices trending up. Fill up before next Wednesday."

IF trend == "RISING" AND remainingPercent >= 50:
    recommendation = "FILL_SOON"
    reason = "Prices rising but tank is still above half. Monitor this week."

IF trend == "FALLING":
    recommendation = "WAIT"
    reason = "Prices trending down. Top up minimally and wait for lower prices."

IF trend == "STABLE":
    recommendation = "NORMAL"
    reason = "Prices stable. Fill up as needed."
```

### 4.4 MOF Article Scraper + Ollama Analysis

**Trigger:** `@Scheduled(cron = "0 0 17 * * WED")` — every Wednesday at 5PM

**Step 1 — Scrape:**
```java
// Jsoup scrape MOF press release page
Document doc = Jsoup.connect("https://www.mof.gov.my/portal/en/news/press-citations")
    .userAgent("Mozilla/5.0 (compatible)")
    .timeout(10000)
    .get();

Elements links = doc.select("a[href]");
for (Element link : links) {
    String text = link.text().toLowerCase();
    if (text.contains("petrol") || text.contains("ron") || 
        text.contains("fuel") || text.contains("harga") || text.contains("minyak")) {
        // Fetch full article
        String articleUrl = link.absUrl("href");
        String content = Jsoup.connect(articleUrl).get().body().text();
        analyzeWithOllama(content);
        break; // only latest article
    }
}
```

**Step 2 — Ollama Prompt:**
```
System prompt:
"You are a Malaysian fuel price analyst. Extract information from Ministry of Finance press releases. Always respond in JSON format only. No preamble, no markdown code blocks."

User prompt:
"Read this MOF press release and extract the following as JSON:
{
  \"fuelChanges\": [
    {
      \"fuelType\": \"RON97\",
      \"oldPrice\": 4.35,
      \"newPrice\": 4.45,
      \"changeAmount\": 0.10,
      \"direction\": \"INCREASE\"
    }
  ],
  \"effectiveDate\": \"2026-06-18\",
  \"mainReason\": \"Rising global crude oil prices\",
  \"userTip\": \"Consider filling up before Wednesday if you use RON97.\",
  \"affectedUsers\": \"RON97 users only. BUDI95 and RON95 unchanged.\"
}

Article text:
[ARTICLE_CONTENT]"
```

**Step 3 — Ollama API Call:**
```
POST http://localhost:11434/api/generate
{
  "model": "llama3.2:3b",
  "prompt": "[constructed prompt above]",
  "stream": false
}

Response: { "response": "{...json string...}" }
```

**Step 4 — Save + Notify:**
```
Save MOFArticle to database
Parse JSON response
For each fuelChange:
    Update FuelPrice table with new price (effective date)
Send FCM push notification to all users with affected fuel type
```

---

## 5. Layer 2 — Seat Optimizer

### 5.1 Ride Data Model

**Ride (driver posts):**
- `origin` — lat/lng of driver's starting point
- `destination` — lat/lng of final destination
- `departureTime` — when driver plans to leave
- `availableSeats` — 1 to 4
- `vehicleId` — links to driver's registered vehicle
- `status` — OPEN | FULL | IN_PROGRESS | COMPLETED | CANCELLED
- `estimatedDistanceKm` — calculated from origin to destination
- `estimatedFarePerPerson` — calculated using equation below

**RideRequest (passenger sends):**
- `pickupLat`, `pickupLng` — where passenger wants to be picked up
- `dropoffLat`, `dropoffLng` — where passenger wants to get off
- `requestedTime` — when passenger wants to travel
- `status` — PENDING | ACCEPTED | REJECTED | CANCELLED

### 5.2 Fare Calculation

```
// Per-trip fare calculation (called when ride is posted and when matched)

fuelCostForRoute = (ride.estimatedDistanceKm / vehicle.avgEfficiency) × currentFuelPrice

totalPeople = ride.confirmedPassengers + 1   // +1 for driver

farePerPerson = fuelCostForRoute / totalPeople
farePerPerson = round(farePerPerson, 2)

driverNetCost = fuelCostForRoute - (farePerPerson × confirmedPassengers)
// driverNetCost = farePerPerson (driver pays their own equal share only)

driverSavingsPercent = ((fuelCostForRoute - driverNetCost) / fuelCostForRoute) × 100

passengerSavingsVsGrab = grabEstimate - farePerPerson
passengerSavingsPercent = (passengerSavingsVsGrab / grabEstimate) × 100
```

**Grab estimate formula (approximation for Malaysia):**
```
grabEstimate = 2.50 + (distanceKm × 0.90)
// RM2.50 base + RM0.90/km (JB/campus area estimate)
// Adjust base and rate per region if needed
```

### 5.3 Carpool Matching Algorithm

**Trigger:** When a passenger submits a ride request.

**Input:** RideRequest (passenger time, pickup location, dropoff location)
**Output:** Ranked list of compatible Rides

```
Algorithm: MATCH_PASSENGER_TO_RIDES

Step 1 — Time filter:
    candidateRides = Rides WHERE:
        status == OPEN
        AND departureTime BETWEEN (requestedTime - 15 min) AND (requestedTime + 15 min)
        AND availableSeats > confirmedPassengers

Step 2 — Destination proximity filter:
    for each ride in candidateRides:
        destDistance = haversineDistance(ride.destination, passenger.dropoffLat, passenger.dropoffLng)
        IF destDistance > 500 metres: REMOVE from candidates
    
    // Haversine distance formula:
    R = 6371000   // Earth radius in metres
    lat1, lon1 = ride.destination (radians)
    lat2, lon2 = passenger.dropoff (radians)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)^2 + cos(lat1) × cos(lat2) × sin(dlon/2)^2
    c = 2 × atan2(sqrt(a), sqrt(1-a))
    distance = R × c

Step 3 — Gender safety filter:
    IF passenger.gender == FEMALE:
        for each ride in candidateRides:
            IF driver.gender == MALE:
                existingFemalePassengers = count of FEMALE confirmed passengers on ride
                IF existingFemalePassengers == 0:
                    REMOVE ride from candidates
                    // lone female cannot ride with male-only group
                // else: mixed group with at least one female is OK

Step 4 — Score and rank:
    for each ride in candidateRides:
        timeDiffMinutes = |ride.departureTime - passenger.requestedTime|
        pickupDistance = haversineDistance(ride.origin, passenger.pickupLat, passenger.pickupLng)
        seatFillRatio = (confirmedPassengers + 1) / ride.maxSeats   // how full will car be

        // Lower time diff = better, lower pickup distance = better, higher seat fill = better
        score = (1 - timeDiffMinutes/15) × 0.4
              + (1 - pickupDistance/1000) × 0.35
              + seatFillRatio × 0.25

        ride.matchScore = round(score, 3)

Step 5 — Return top 5 matches sorted by score descending
```

### 5.4 Multi-Stop Pickup Ordering (for driver)

When multiple passengers are confirmed on a ride:
```
// Nearest neighbour algorithm for pickup ordering
unvisited = list of all confirmed passenger pickup points
current = driver.origin
ordered = []

while unvisited is not empty:
    nearest = pickup point in unvisited with minimum haversineDistance(current, pickup)
    ordered.append(nearest)
    current = nearest
    remove nearest from unvisited

// Driver navigates: origin → ordered[0] → ordered[1] → ... → destination
```

### 5.5 Map Navigation (Google Maps Deep Link)

No SDK required. When user taps "Navigate" or "Start Ride", open Google Maps via URL intent:

**Android Intent URL:**
```
geo:LATITUDE,LONGITUDE?q=LATITUDE,LONGITUDE(Label)
```

**Google Maps Direction URL (works cross-platform):**
```
https://www.google.com/maps/dir/?api=1
  &origin=ORIGIN_LAT,ORIGIN_LNG
  &destination=DEST_LAT,DEST_LNG
  &waypoints=WAYPOINT1_LAT,WAYPOINT1_LNG|WAYPOINT2_LAT,WAYPOINT2_LNG
  &travelmode=driving
```

**React Native implementation:**
```javascript
import { Linking, Platform } from 'react-native';

const openGoogleMaps = (origin, destination, waypoints = []) => {
  const waypointStr = waypoints
    .map(w => `${w.lat},${w.lng}`)
    .join('|');
  
  const url = `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    (waypoints.length > 0 ? `&waypoints=${waypointStr}` : '') +
    `&travelmode=driving`;
  
  Linking.openURL(url);
};
```

This opens Google Maps app if installed, falls back to browser Maps. Same pattern as Lalamove, Grab, and most Malaysian logistics apps.

### 5.6 Routine System (Auto-Request)

Users can save routines so the app automatically posts/requests rides without manual action.

**Routine fields:**
- `name` — e.g. "Morning commute to FC"
- `daysOfWeek` — e.g. [MON, TUE, WED, THU, FRI]
- `departureTime` — e.g. "07:45"
- `originLat`, `originLng` — saved pickup location
- `destLat`, `destLng` — saved destination
- `rolePreference` — DRIVER | PASSENGER | EITHER
- `autoRequest` — boolean (if true, app auto-submits without user tapping)
- `isActive` — boolean

**Scheduler logic:**
```java
// Runs every minute
@Scheduled(cron = "0 * * * * *")
public void processRoutines() {
    LocalTime now = LocalTime.now();
    DayOfWeek today = LocalDate.now().getDayOfWeek();
    
    List<Routine> routines = routineRepo.findByDayAndTime(today, now.plusMinutes(30));
    // Trigger 30 minutes before departure so there's time to match
    
    for (Routine routine : routines) {
        if (routine.isAutoRequest()) {
            if (routine.rolePreference == PASSENGER || routine.rolePreference == EITHER) {
                // Auto-submit ride request
                rideRequestService.createFromRoutine(routine);
            }
            if (routine.rolePreference == DRIVER || routine.rolePreference == EITHER) {
                // Check if user already posted a ride today
                if (!rideService.hasPostedRideToday(routine.userId)) {
                    rideService.createFromRoutine(routine);
                }
            }
        } else {
            // Send reminder notification: "Your routine departs in 30 mins. Tap to request a ride."
            notificationService.sendRoutineReminder(routine);
        }
    }
}
```

---

## 6. Layer 3 — EcoTrack (Main Dashboard)

**This is the main home screen of the app.** When the user opens FuelPool, they land here.

### 6.1 Dashboard Cards (home screen)

The main dashboard shows these cards in order:

1. **Fuel price card** — current RON95/RON97/Diesel prices + fill-up recommendation (from L1)
2. **Nearby carpool card** — "2 rides available to Faculty of Computing in the next 30 mins" (from L2)
3. **Fuel level card** — estimated remaining fuel + remaining km (from L1, if vehicle set up)
4. **Weekly savings card** — RM saved this week via FuelPool vs driving solo (from L3 calculations)
5. **Carbon card** — CO2 avoided this week via carpooling (from L3)
6. **Community rank card** — "You are in the top 22% of EcoDrivers at UTM this week"

### 6.2 Carbon Footprint Equations

**Per trip carbon emission (when driving solo):**
```
litresUsed = tripDistanceKm / vehicle.avgEfficiency

// CO2 emission factor (IPCC standard for petrol vehicles):
CO2_FACTOR_PETROL = 2.31   // kg CO2 per litre of petrol burned
CO2_FACTOR_DIESEL = 2.68   // kg CO2 per litre of diesel burned

carbonEmittedKg = litresUsed × CO2_FACTOR   // use correct factor for fuel type
```

**Carbon saved by carpooling (passenger):**
```
// If passenger would have driven alone:
soloCarbon = (tripDistanceKm / vehicle.avgEfficiency) × CO2_FACTOR

// As a passenger, their share of emissions:
carpoolCarbon = soloCarbon / totalOccupants

// Carbon saved:
carbonSavedKg = soloCarbon - carpoolCarbon
// = soloCarbon × (1 - 1/totalOccupants)
// e.g. 4 people: saves 75% of personal carbon emissions
```

**Weekly carbon totals:**
```
weeklyCarbon = SUM(carbonEmittedKg) for all SOLO trips this week
               + SUM(carpoolCarbon) for all CARPOOL trips this week (passenger share only)

carbonSavedThisWeek = SUM(carbonSavedKg) for all CARPOOL trips this week
                    + SUM(soloCarbon) for trips taken as PASSENGER (full avoidance)

// Trees equivalent (for user-friendly display):
treesEquivalent = carbonSavedThisWeek / 0.021
// Average tree absorbs ~21g CO2/day = 0.021 kg/day
```

### 6.3 Savings Equations

**Per trip savings (passenger perspective):**
```
soloFuelCost = (tripDistanceKm / vehicle.avgEfficiency) × currentFuelPrice
grabEstimate = 2.50 + (tripDistanceKm × 0.90)

savedVsSolo = soloFuelCost - farePerPerson
savedVsGrab = grabEstimate - farePerPerson

// Monthly
monthlySavedVsGrab = SUM(savedVsGrab) for all trips this month
monthlySavedVsSolo = SUM(savedVsSolo) for all trips this month
```

**Per trip savings (driver perspective):**
```
soloFuelCost = (tripDistanceKm / vehicle.avgEfficiency) × currentFuelPrice
driverNetCost = soloFuelCost / totalOccupants   // equal share

driverSaved = soloFuelCost - driverNetCost
driverSavedPercent = (driverSaved / soloFuelCost) × 100
// = ((totalOccupants - 1) / totalOccupants) × 100
// e.g. 3 passengers + driver = 75% saved
```

**Total app savings (for "You saved RM X using FuelPool" metric):**
```
totalSaved = monthlySavedVsSolo (if user mostly drives)
           + monthlySavedVsGrab (if user mostly takes rides)
           
// Use whichever comparison is higher / more relevant to user's behaviour
// Track separately and let user toggle between comparisons in EcoTrack
```

### 6.4 Driving Habits Tracking

**Tracked via trip logs (no GPS — estimated from odometer and time):**

| Habit Metric | How Calculated | Target |
|---|---|---|
| Avg trip efficiency | `tripDistanceKm / litresUsed` | > vehicle.defaultEfficiency |
| Refuelling pattern | Days between fill-ups | Regular pattern preferred |
| BUDI95 usage % | `budi_litres / total_litres × 100` | Maximise to 300L/month |
| Carpool frequency | `carpoolTrips / totalTrips × 100` | Increase over time |
| Fuel cost trend | Month-over-month spend | Decreasing |

**Ollama habit coaching prompt (called once per week, Sunday):**
```
System: "You are a friendly fuel savings coach for a Malaysian university student. Be encouraging, specific, and brief. Max 3 sentences."

User: "Here is {user.name}'s driving data this week:
- Total trips: {totalTrips}
- Carpool trips: {carpoolTrips}  
- Solo trips: {soloTrips}
- Fuel bought: {litresFilled}L for RM {totalFuelCost}
- Average efficiency: {avgEfficiency} km/L (vehicle default: {defaultEfficiency} km/L)
- Carbon emitted: {carbonKg} kg
- Carbon saved via carpooling: {carbonSavedKg} kg
- Money saved vs driving solo: RM {savedVsSolo}
- Community rank: {rank} out of {totalUsers} at UTM

Generate a short, personalized weekly summary with one specific tip to improve next week."
```

**Expected Ollama output example:**
```
"Great week Ahmad! You shared 3 rides and saved RM 44.20 and 6.8 kg of CO2 — that's 
equivalent to not driving for 2 days. Your fuel efficiency is slightly below your Myvi's 
average; try coasting to stops instead of braking hard to squeeze out another km/L."
```

### 6.5 Community Leaderboard

```
// Weekly community rank calculation
allUsersThisWeek = EcoWeeklyStats WHERE weekStartDate = current week start

// Carbon score = lower emission + higher saving = better
for each user:
    user.ecoScore = (carbonSavedKg × 0.5) 
                  + (carpoolTrips × 5) 
                  + (savedVsSolo / 10)
                  - (soloTrips × 2)

// Rank all users by ecoScore descending
sortedUsers = sort allUsersThisWeek by ecoScore DESC
user.rank = position of user in sortedUsers
user.totalUsers = count(allUsersThisWeek)
user.percentile = ((totalUsers - rank + 1) / totalUsers) × 100

// Display: "You are in the top 22% of EcoDrivers at UTM this week"
```

---

## 7. App Flow

### 7.1 First-Time User (Onboarding)

```
1. Splash screen → Register screen
2. Register: email (campus email preferred), password, name, gender (MALE/FEMALE — used for safety matching)
3. Student ID upload (photo) → stored for driver verification
4. [OPTIONAL] Vehicle setup:
   - Select make/model from dropdown (from vehicles.json)
   - Confirm or edit: tank capacity, avg efficiency
   - Select fuel type (REQUIRED if vehicle setup done)
   - Enter current odometer reading
   → If skipped: fuel level card and efficiency calculations are hidden on dashboard
5. [OPTIONAL] Set daily route:
   - Home location (map pin or address)
   - Main destination (e.g. "Faculty of Computing")
   - Typical departure time
   → Pre-fills routine creation
6. → Dashboard (L3 EcoTrack home screen)
```

### 7.2 Returning User — Daily Flow

```
Open app → L3 EcoTrack Dashboard (home)

Option A: I want to carpool (tap "Find a Ride")
    → L2 Ride request form
    → See matched rides (ranked by score)
    → Select a ride → see driver profile, fare, route
    → Confirm → receive pickup point + Google Maps link
    → After ride → rate driver (1–5 stars) → savings logged automatically

Option B: I'm driving and want passengers (tap "Offer a Ride")
    → L2 Ride post form (route, time, seats)
    → Post ride → wait for match notifications
    → Accept/reject passenger requests
    → At departure → tap "Start Ride" → Google Maps opens with all waypoints
    → After ride → rate passengers → earnings logged

Option C: I want to check fuel prices (tap "Fuel" tab)
    → L1 Fuel Intelligence screen
    → See current prices for my fuel type
    → See price chart + 4-week prediction
    → See fill-up recommendation
    → Log a fill-up (fuel log form)

Option D: Dashboard updates automatically
    → Every Wednesday 5PM: MOF scraper runs → push notification if price changes
    → Every Sunday: weekly Ollama summary notification
    → Every time a ride is completed: EcoTrack stats updated
```

### 7.3 Routine Auto-Flow (if set up)

```
User has routine: "Weekdays 7:45AM, Kolej 17 → FC, PASSENGER, autoRequest = true"

7:15AM Monday (30 min before departure):
    Scheduler triggers
    Finds matching rides (departure 7:30–8:00AM, dest near FC)
    Auto-submits ride request on user's behalf
    Sends notification: "We've requested a ride for you. Ahmad's Myvi — RM 0.42, 7:45AM"
    
    If no match found:
    Sends notification: "No ride found for your 7:45AM commute. Driving solo today will cost RM 1.16."
```

---

## 8. Backend Code Structure

```
fuelpool-backend/
├── pom.xml
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── fuelpool/
│       │           ├── FuelPoolApplication.java
│       │           │
│       │           ├── config/
│       │           │   ├── SecurityConfig.java          // JWT filter chain, CORS
│       │           │   ├── JwtConfig.java               // secret, expiry constants
│       │           │   ├── OllamaConfig.java            // Ollama base URL, model name, RestTemplate bean
│       │           │   └── SchedulerConfig.java         // enable @Scheduled
│       │           │
│       │           ├── controller/
│       │           │   ├── AuthController.java          // POST /auth/register, POST /auth/login
│       │           │   ├── UserController.java          // GET /users/me, PUT /users/me
│       │           │   ├── VehicleController.java       // CRUD /vehicles
│       │           │   ├── FuelPriceController.java     // GET /fuel/prices, GET /fuel/trend, GET /fuel/recommendation
│       │           │   ├── FuelLogController.java       // CRUD /fuel/logs
│       │           │   ├── MOFController.java           // GET /fuel/mof/latest, POST /fuel/mof/trigger (manual trigger for demo)
│       │           │   ├── RideController.java          // POST /rides, GET /rides, GET /rides/{id}, PUT /rides/{id}/status
│       │           │   ├── RideRequestController.java   // POST /rides/{id}/request, PUT /ride-requests/{id}/status
│       │           │   ├── RoutineController.java       // CRUD /routines
│       │           │   ├── EcoTrackController.java      // GET /eco/dashboard, GET /eco/weekly, GET /eco/leaderboard
│       │           │   └── DashboardController.java     // GET /dashboard (aggregates L1+L2+L3 for home screen)
│       │           │
│       │           ├── service/
│       │           │   ├── auth/
│       │           │   │   ├── AuthService.java         // register, login, JWT generation
│       │           │   │   └── JwtService.java          // generate, validate, extract claims
│       │           │   │
│       │           │   ├── fuel/
│       │           │   │   ├── FuelPriceService.java    // load prices from CSV/API, get current price by fuel type
│       │           │   │   ├── FuelLogService.java      // save log, calculate efficiency, remaining fuel
│       │           │   │   ├── TrendPredictionService.java  // linear regression on last 6 weeks, recommendation
│       │           │   │   └── Budi95Service.java       // track monthly BUDI95 usage, check 300L limit
│       │           │   │
│       │           │   ├── mof/
│       │           │   │   ├── MOFScraperService.java   // Jsoup scrape MOF website
│       │           │   │   └── MOFArticleParser.java    // clean article text, call Ollama, parse JSON response
│       │           │   │
│       │           │   ├── ollama/
│       │           │   │   └── OllamaService.java       // POST to Ollama API, handle response, retry logic
│       │           │   │
│       │           │   ├── carpool/
│       │           │   │   ├── RideService.java         // create ride, update status, fare calculation
│       │           │   │   ├── RideRequestService.java  // submit request, accept/reject
│       │           │   │   ├── MatchingService.java     // core matching algorithm (Step 1–5 from 5.3)
│       │           │   │   ├── RouteService.java        // haversine distance, pickup ordering, Google Maps URL builder
│       │           │   │   └── FareCalculationService.java  // fare per person, driver savings, grab comparison
│       │           │   │
│       │           │   ├── routine/
│       │           │   │   └── RoutineService.java      // CRUD routines, trigger auto-request
│       │           │   │
│       │           │   ├── eco/
│       │           │   │   ├── CarbonService.java       // carbon calculations, CO2 factor constants
│       │           │   │   ├── SavingsService.java      // savings vs solo, vs Grab, monthly totals
│       │           │   │   ├── LeaderboardService.java  // eco score, rank, percentile
│       │           │   │   └── WeeklySummaryService.java // aggregate weekly stats, call Ollama for coaching tip
│       │           │   │
│       │           │   └── notification/
│       │           │       └── NotificationService.java // FCM push (stub for hackathon, just log to console)
│       │           │
│       │           ├── scheduler/
│       │           │   ├── FuelPriceScheduler.java      // @Scheduled Wed 5PM — triggers MOFScraperService
│       │           │   ├── RoutineScheduler.java        // @Scheduled every minute — checks routines 30 min ahead
│       │           │   └── WeeklySummaryScheduler.java  // @Scheduled Sunday midnight — triggers WeeklySummaryService
│       │           │
│       │           ├── model/
│       │           │   ├── User.java
│       │           │   ├── Vehicle.java
│       │           │   ├── FuelLog.java
│       │           │   ├── FuelPrice.java
│       │           │   ├── MOFArticle.java
│       │           │   ├── Ride.java
│       │           │   ├── RideRequest.java
│       │           │   ├── TripPassenger.java
│       │           │   ├── Routine.java
│       │           │   └── EcoWeeklyStats.java
│       │           │
│       │           ├── repository/
│       │           │   ├── UserRepository.java
│       │           │   ├── VehicleRepository.java
│       │           │   ├── FuelLogRepository.java
│       │           │   ├── FuelPriceRepository.java
│       │           │   ├── MOFArticleRepository.java
│       │           │   ├── RideRepository.java
│       │           │   ├── RideRequestRepository.java
│       │           │   ├── TripPassengerRepository.java
│       │           │   ├── RoutineRepository.java
│       │           │   └── EcoWeeklyStatsRepository.java
│       │           │
│       │           ├── dto/
│       │           │   ├── request/
│       │           │   │   ├── RegisterRequest.java
│       │           │   │   ├── LoginRequest.java
│       │           │   │   ├── VehicleRequest.java
│       │           │   │   ├── FuelLogRequest.java
│       │           │   │   ├── RideRequest.java
│       │           │   │   ├── RideJoinRequest.java
│       │           │   │   └── RoutineRequest.java
│       │           │   └── response/
│       │           │       ├── AuthResponse.java
│       │           │       ├── FuelPriceResponse.java
│       │           │       ├── FuelTrendResponse.java
│       │           │       ├── RefuelRecommendationResponse.java
│       │           │       ├── RideMatchResponse.java
│       │           │       ├── FareBreakdownResponse.java
│       │           │       ├── DashboardResponse.java
│       │           │       └── EcoDashboardResponse.java
│       │           │
│       │           └── exception/
│       │               ├── GlobalExceptionHandler.java
│       │               ├── ResourceNotFoundException.java
│       │               └── BusinessException.java
│       │
│       └── resources/
│           ├── application.properties
│           ├── application-dev.properties
│           └── data/
│               ├── fuelprice.csv           // from data.gov.my — historical prices
│               ├── vehicles.json           // Malaysian car database
│               ├── traffic_dummy.json      // fake traffic data
│               └── dummy_users.sql         // seed data for demo
```

---

## 9. Database Schema

```sql
-- Users
CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,         -- bcrypt hashed
    name        VARCHAR(100) NOT NULL,
    gender      ENUM('MALE','FEMALE') NOT NULL,
    student_id  VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_driver   BOOLEAN DEFAULT FALSE,
    driver_rating DECIMAL(3,2) DEFAULT 5.00,
    passenger_rating DECIMAL(3,2) DEFAULT 5.00,
    fcm_token   VARCHAR(255),                  -- for push notifications
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles (optional — linked to user)
CREATE TABLE vehicles (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    make            VARCHAR(50) NOT NULL,      -- e.g. "Perodua"
    model           VARCHAR(50) NOT NULL,      -- e.g. "Myvi"
    year            INTEGER,
    color           VARCHAR(30),
    plate_number    VARCHAR(20),
    tank_capacity   DECIMAL(5,2) NOT NULL,     -- litres
    avg_efficiency  DECIMAL(5,2) NOT NULL,     -- km/L
    fuel_type       ENUM('RON95_MARKET','RON95_BUDI95','RON97','DIESEL','DIESEL_EAST') NOT NULL,
    current_odometer INTEGER DEFAULT 0,
    is_primary      BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Fuel prices (loaded from data.gov.my CSV)
CREATE TABLE fuel_prices (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    price_date      DATE NOT NULL UNIQUE,
    ron95           DECIMAL(5,3),
    ron97           DECIMAL(5,3),
    diesel          DECIMAL(5,3),
    diesel_eastmsia DECIMAL(5,3),
    ron95_budi95    DECIMAL(5,3),
    ron95_skps      DECIMAL(5,3),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fuel logs (user fill-up entries)
CREATE TABLE fuel_logs (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    vehicle_id              BIGINT,
    log_date                DATETIME NOT NULL,
    odometer                INTEGER NOT NULL,
    litres_filled           DECIMAL(6,3) NOT NULL,
    price_per_litre         DECIMAL(5,3) NOT NULL,
    total_cost              DECIMAL(8,2) NOT NULL,
    is_full_tank            BOOLEAN NOT NULL DEFAULT TRUE,
    is_missed_previous      BOOLEAN NOT NULL DEFAULT FALSE,
    station_name            VARCHAR(100),
    fuel_type               ENUM('RON95_MARKET','RON95_BUDI95','RON97','DIESEL','DIESEL_EAST') NOT NULL,
    notes                   VARCHAR(500),
    distance_since_last     INTEGER,          -- km, calculated on save
    efficiency_this_fill    DECIMAL(5,2),     -- km/L, null if not full-to-full
    cost_per_km             DECIMAL(6,4),     -- RM/km
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- MOF articles (scraped weekly)
CREATE TABLE mof_articles (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    fetched_at      DATETIME NOT NULL,
    title           VARCHAR(500),
    source_url      VARCHAR(1000),
    raw_content     TEXT,
    ollama_analysis TEXT,                     -- raw JSON from Ollama
    parsed_changes  TEXT,                     -- JSON array of price changes
    effective_date  DATE,
    main_reason     VARCHAR(500),
    user_tip        VARCHAR(500),
    is_notified     BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rides (driver posts)
CREATE TABLE rides (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    driver_id               BIGINT NOT NULL,
    vehicle_id              BIGINT NOT NULL,
    origin_lat              DECIMAL(10,7) NOT NULL,
    origin_lng              DECIMAL(10,7) NOT NULL,
    origin_label            VARCHAR(200),
    destination_lat         DECIMAL(10,7) NOT NULL,
    destination_lng         DECIMAL(10,7) NOT NULL,
    destination_label       VARCHAR(200),
    departure_time          DATETIME NOT NULL,
    max_seats               INTEGER NOT NULL DEFAULT 3,
    confirmed_passengers    INTEGER DEFAULT 0,
    status                  ENUM('OPEN','FULL','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'OPEN',
    estimated_distance_km   DECIMAL(8,2),
    estimated_fare_per_person DECIMAL(8,2),
    fuel_cost_total         DECIMAL(8,2),
    google_maps_url         VARCHAR(2000),
    from_routine_id         BIGINT,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Ride requests (passenger sends)
CREATE TABLE ride_requests (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id         BIGINT NOT NULL,
    passenger_id    BIGINT NOT NULL,
    pickup_lat      DECIMAL(10,7) NOT NULL,
    pickup_lng      DECIMAL(10,7) NOT NULL,
    pickup_label    VARCHAR(200),
    dropoff_lat     DECIMAL(10,7) NOT NULL,
    dropoff_lng     DECIMAL(10,7) NOT NULL,
    dropoff_label   VARCHAR(200),
    status          ENUM('PENDING','ACCEPTED','REJECTED','CANCELLED') DEFAULT 'PENDING',
    fare_amount     DECIMAL(8,2),
    from_routine_id BIGINT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (passenger_id) REFERENCES users(id)
);

-- Trip passengers (completed trip record per passenger)
CREATE TABLE trip_passengers (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id                 BIGINT NOT NULL,
    passenger_id            BIGINT NOT NULL,
    driver_id               BIGINT NOT NULL,
    trip_date               DATETIME NOT NULL,
    distance_km             DECIMAL(8,2) NOT NULL,
    fare_paid               DECIMAL(8,2) NOT NULL,
    carbon_emitted_kg       DECIMAL(8,4),       -- passenger share of trip emissions
    carbon_saved_kg         DECIMAL(8,4),       -- vs driving alone
    saved_vs_solo           DECIMAL(8,2),       -- RM saved vs driving own car
    saved_vs_grab           DECIMAL(8,2),       -- RM saved vs Grab
    driver_rating           INTEGER,            -- 1-5, given by passenger
    passenger_rating_given  INTEGER,            -- 1-5, given by driver
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id)
);

-- Routines
CREATE TABLE routines (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    days_of_week    VARCHAR(50) NOT NULL,     -- comma-separated: "MON,TUE,WED,THU,FRI"
    departure_time  TIME NOT NULL,
    origin_lat      DECIMAL(10,7) NOT NULL,
    origin_lng      DECIMAL(10,7) NOT NULL,
    origin_label    VARCHAR(200),
    dest_lat        DECIMAL(10,7) NOT NULL,
    dest_lng        DECIMAL(10,7) NOT NULL,
    dest_label      VARCHAR(200),
    role_preference ENUM('DRIVER','PASSENGER','EITHER') DEFAULT 'EITHER',
    auto_request    BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    last_triggered  DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Weekly eco stats (aggregated per user per week)
CREATE TABLE eco_weekly_stats (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    week_start_date     DATE NOT NULL,
    total_trips         INTEGER DEFAULT 0,
    carpool_trips       INTEGER DEFAULT 0,
    solo_trips          INTEGER DEFAULT 0,
    total_carbon_kg     DECIMAL(10,4) DEFAULT 0,
    carbon_saved_kg     DECIMAL(10,4) DEFAULT 0,
    total_fuel_cost     DECIMAL(10,2) DEFAULT 0,
    saved_vs_solo       DECIMAL(10,2) DEFAULT 0,
    saved_vs_grab       DECIMAL(10,2) DEFAULT 0,
    eco_score           DECIMAL(10,2) DEFAULT 0,
    community_rank      INTEGER,
    total_users_ranked  INTEGER,
    ollama_summary      TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, week_start_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 10. API Endpoints

### Auth
```
POST   /api/auth/register         Body: RegisterRequest
POST   /api/auth/login            Body: LoginRequest → AuthResponse (JWT token)
```

### User & Vehicle
```
GET    /api/users/me              → UserProfile
PUT    /api/users/me              Body: UpdateUserRequest
POST   /api/vehicles              Body: VehicleRequest → Vehicle (optional setup)
GET    /api/vehicles              → List<Vehicle>
PUT    /api/vehicles/{id}         Body: VehicleRequest
DELETE /api/vehicles/{id}
```

### Fuel Intelligence (L1)
```
GET    /api/fuel/prices/current   → { ron95, ron97, diesel, ron95_budi95, ... } latest week
GET    /api/fuel/prices/history   ?weeks=12 → List<FuelPrice> last N weeks
GET    /api/fuel/trend            ?fuelType=RON97&weeks=6 → { slope, direction, predicted[4], recommendation, reason }
GET    /api/fuel/recommendation   → { action: "FILL_NOW|WAIT|NORMAL", reason, remainingFuelPct, remainingKm }
GET    /api/fuel/mof/latest       → MOFArticle (latest scraped + Ollama analysis)
POST   /api/fuel/mof/trigger      → manually trigger scraper (for demo/testing)

POST   /api/fuel/logs             Body: FuelLogRequest → FuelLog (with calculated fields)
GET    /api/fuel/logs             ?page=0&size=20 → Page<FuelLog>
GET    /api/fuel/logs/{id}        → FuelLog
DELETE /api/fuel/logs/{id}
GET    /api/fuel/stats            → { totalSpend, avgEfficiency, totalLitres, monthlyBreakdown }
```

### Seat Optimizer (L2)
```
POST   /api/rides                 Body: RidePostRequest → Ride
GET    /api/rides                 ?status=OPEN&lat=1.56&lng=103.64&radius=2000 → List<Ride>
GET    /api/rides/{id}            → Ride (with confirmed passengers)
PUT    /api/rides/{id}/cancel     → updates status to CANCELLED
PUT    /api/rides/{id}/start      → status = IN_PROGRESS, returns Google Maps URL
PUT    /api/rides/{id}/complete   → status = COMPLETED, triggers trip logging

GET    /api/rides/match           ?pickupLat=&pickupLng=&dropoffLat=&dropoffLng=&time=ISO8601 → List<RideMatchResponse> sorted by score

POST   /api/rides/{id}/request    Body: { pickupLat, pickupLng, dropoffLat, dropoffLng } → RideRequest
PUT    /api/ride-requests/{id}/accept  → driver accepts passenger
PUT    /api/ride-requests/{id}/reject  → driver rejects passenger
PUT    /api/ride-requests/{id}/cancel  → passenger cancels their request
POST   /api/rides/{id}/rate       Body: { rating: 1-5, targetUserId } → saves rating

POST   /api/routines              Body: RoutineRequest → Routine
GET    /api/routines              → List<Routine> for current user
PUT    /api/routines/{id}
DELETE /api/routines/{id}
PUT    /api/routines/{id}/toggle  → flip isActive
```

### EcoTrack Dashboard (L3)
```
GET    /api/dashboard             → DashboardResponse (aggregated L1+L2+L3 home screen data)
GET    /api/eco/weekly            ?weekOffset=0 → EcoWeeklyStats for this week (0) or past weeks
GET    /api/eco/monthly           → monthly aggregated savings, carbon, trips
GET    /api/eco/leaderboard       → List<LeaderboardEntry> top 20 + current user's position
GET    /api/eco/habits            → driving habit metrics + Ollama coaching tip
GET    /api/eco/summary           → latest Ollama weekly summary text
```

---

## 11. Dummy Data

### vehicles.json (sample entries)
```json
[
  { "make": "Perodua", "model": "Myvi", "year": 2022, "tankCapacity": 40, "defaultEfficiency": 16, "fuelType": "RON95_MARKET" },
  { "make": "Perodua", "model": "Axia", "year": 2023, "tankCapacity": 35, "defaultEfficiency": 17, "fuelType": "RON95_MARKET" },
  { "make": "Proton", "model": "Saga", "year": 2021, "tankCapacity": 40, "defaultEfficiency": 15, "fuelType": "RON95_MARKET" },
  { "make": "Proton", "model": "X50", "year": 2022, "tankCapacity": 49, "defaultEfficiency": 13, "fuelType": "RON97" },
  { "make": "Honda", "model": "City", "year": 2021, "tankCapacity": 47, "defaultEfficiency": 14, "fuelType": "RON95_MARKET" },
  { "make": "Toyota", "model": "Vios", "year": 2020, "tankCapacity": 42, "defaultEfficiency": 14, "fuelType": "RON95_MARKET" }
]
```

### Dummy users for demo (seed data)
```
User 1: Ahmad Razif, Male, Myvi RON95_BUDI95, driver, rating 4.8
User 2: Nurul Ain, Female, Axia RON95_MARKET, passenger only
User 3: Haziq Faris, Male, Proton Saga RON95_BUDI95, driver + passenger
User 4: Siti Nabilah, Female, no vehicle registered, passenger only
User 5: Luqman Hakim, Male, Honda City RON97, driver, rating 4.9

All located near UTM Skudai campus.
Demo rides posted between Kolej 17/18 ↔ Faculty of Computing ↔ Skudai town.
```

### traffic_dummy.json (sample)
```json
{
  "hotspots": [
    {
      "id": "jln_skudai_main",
      "label": "Jalan Skudai (main entrance)",
      "lat": 1.5577, "lng": 103.6388,
      "peakHours": ["07:30-09:00", "17:00-19:30"],
      "peakDays": ["MON","TUE","WED","THU","FRI"],
      "avgDelayMinutes": 15,
      "congestionLevel": 82
    },
    {
      "id": "utm_main_gate",
      "label": "UTM Main Gate",
      "lat": 1.5588, "lng": 103.6347,
      "peakHours": ["07:45-08:30", "17:30-18:30"],
      "peakDays": ["MON","TUE","WED","THU","FRI"],
      "avgDelayMinutes": 8,
      "congestionLevel": 65
    }
  ]
}
```

---

## Notes for Claude Code

1. **Always use `series_type = "level"` rows from fuelprice.csv** — the `change_weekly` rows are deltas, not prices.
2. **Ollama may be slow** — set a 30-second timeout on all Ollama HTTP calls. For demo, add a `/api/fuel/mof/trigger` endpoint that manually fires the scraper without waiting for Wednesday.
3. **BUDI95 tracking is per calendar month** — reset `budi_used_this_month` counter on the 1st of each month using a `@Scheduled` task.
4. **Matching algorithm runs synchronously** on request — no async needed for hackathon scale.
5. **Google Maps URL** must be built server-side and returned in `rides.google_maps_url` — frontend just calls `Linking.openURL()`.
6. **JWT secret** must be in `application.properties` as `jwt.secret` — never hardcode in source.
7. **All `@Scheduled` tasks must be idempotent** — safe to run twice without side effects.
8. **EcoWeeklyStats** are upserted (INSERT ... ON DUPLICATE KEY UPDATE) after each completed trip.
9. **For hackathon demo** — `NotificationService` should just `System.out.println()` the notification payload. Do not require FCM setup to demo the app.
10. **Efficiency calculation** only fires when `isFullTank == true AND previousLog.isFullTank == true AND isMissedPrevious == false`. Otherwise set `efficiencyThisFill = null`.
