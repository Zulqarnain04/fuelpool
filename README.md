# FuelPool 🚗⛽

> **UTM ASCEND 2030 Vibeathon — AI Coding Challenge**
> Smart fuel management + campus carpooling powered by AI

---

## The Problem

Every day in Malaysia, **4 out of 5 car seats go to waste.** At the same time, drivers struggle to manage rising fuel costs with no clear guidance on when to refuel, which routes waste the most fuel, or how their habits impact their wallet and the environment.

FuelPool tackles both problems in one app.

---

## Solution

FuelPool is a **campus-first smart mobility app** with three AI-powered layers:

| Layer | Feature | What it does |
|---|---|---|
| L1 | **Fuel Intelligence** | Tracks Malaysian fuel prices, predicts next week's RON97/RON95 price using AI analysis of MOF press releases + historical data, tells you exactly when to fill up |
| L2 | **Seat Optimizer** | Matches UTM campus users for carpooling with gender-aware AI matching, auto-routine scheduling, and Google Maps navigation |
| L3 | **EcoTrack Dashboard** | Main home screen — tracks carbon footprint, fuel savings, driving habits, and community leaderboard |

---

## Tech Stack

### Frontend (`frontend/`)
- **React Native** (Expo SDK 56, New Architecture, React 19, TypeScript 6)
- **Expo Go** — runs the full app with no native build
- **Expo Router** — file-based navigation
- **react-native-webview + Leaflet.js** for maps (Expo Go compatible)
- **Axios** for API calls, **expo-secure-store** for the JWT token

### Backend (`backend/fuelpool-backend/`)
- **Spring Boot 3** (Java 21, Maven)
- **MySQL** + Spring Data JPA / Hibernate (`ddl-auto: update` — schema is created/updated automatically)
- **JWT** authentication
- **Jsoup** — MOF website scraper
- **Ollama** (llama3.2:3b) — local LLM for AI summaries, MOF impact analysis and weekly coaching
- **Spring Scheduler** — weekly fuel-price scrape + routine auto-matching

---

## Project Structure

```
fuelpool-repo/
├── backend/
│   └── fuelpool-backend/             # Spring Boot API (Maven, ./mvnw)
│       ├── src/main/java/com/fuelpool/fuelpool_backend/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── model/
│       │   ├── repository/
│       │   └── dto/
│       ├── src/main/resources/
│       │   ├── application.yaml      # DB / JWT / Ollama config (env-var driven)
│       │   └── data/                 # dummy_users.sql, fuelprice.csv, vehicles.json
│       └── pom.xml
│
├── frontend/                          # Expo React Native app
│   ├── app/                            # Expo Router screens (file-based routes)
│   └── src/
│       ├── components/
│       ├── services/api.ts             # API layer
│       ├── constants/                  # API_BASE_URL, design tokens, etc.
│       └── hooks/
│
├── fuelprice.csv                       # Historical fuel price dataset
└── FUELPOOL_SPEC.md                    # Full technical specification
```

---

## Setup

### Prerequisites
- **Java 21** (JDK)
- **Node.js 18+** and npm
- **MySQL 8** running locally
- *(Optional, for AI features)* **Ollama** with the `llama3.2:3b` model
- **Expo Go** app on your phone (iOS/Android) — the app runs in Expo Go, no native build needed

### 1. Backend (Spring Boot)

```bash
cd backend/fuelpool-backend

# create the database (one-time)
mysql -u root -p -e "CREATE DATABASE fuelpool"

# set your MySQL password (required — no default; PowerShell: $env:DB_PASSWORD="...")
export DB_PASSWORD=your_mysql_password

./mvnw spring-boot:run
# Runs on http://localhost:8080 — schema is created/updated automatically
```

Other config (env vars, all optional with defaults from `application.yaml`):

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/fuelpool` | JDBC URL |
| `DB_USERNAME` | `root` | MySQL user |
| `DB_PASSWORD` | *(required, no default)* | MySQL password |
| `JWT_SECRET` | built-in dev secret | JWT signing key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |

### 2. Seed demo data (recommended)

Load 5 demo users + their vehicles:
```bash
mysql -u root -p fuelpool < src/main/resources/data/dummy_users.sql
```

All demo accounts use password **`password123`**:

| Email | Name | Role |
|---|---|---|
| ahmad@utm.my | Ahmad Razif | Driver |
| nurul@utm.my | Nurul Ain | Passenger |
| haziq@utm.my | Haziq Faris | Driver |
| siti@utm.my | Siti Nabilah | Passenger |
| luqman@utm.my | Luqman Hakim | Driver |

With the backend running, seed demo rides + eco stats:
```bash
curl -X POST http://localhost:8080/api/demo/seed
```
Re-run this any time you want fresh "departing soon" demo rides for the **Find Ride** flow.

### 3. Ollama (optional — powers AI summaries & MOF analysis)

```bash
ollama pull llama3.2:3b
ollama serve
# Runs on http://localhost:11434
```
Without Ollama running, the rest of the app still works — AI summary/insight features just won't generate text.

### 4. Frontend (Expo)

```bash
cd frontend
npm install --legacy-peer-deps
```

Update `src/constants/index.ts` → `API_BASE_URL` to your machine's **LAN IP** (not `localhost`) — Expo Go runs on your phone over Wi-Fi and can't reach `localhost` on your laptop:
```ts
export const API_BASE_URL = 'http://<your-lan-ip>:8080/api';
```
Find your LAN IP with `ipconfig` (Windows) / `ifconfig` (macOS/Linux) — use the Wi-Fi adapter's IPv4 address. The backend binds `0.0.0.0` by default, so it's reachable on that IP.

```bash
npx expo start
# Scan the QR code with the Expo Go app
```

### 5. Let others on the same Wi-Fi connect too

`npx expo start` runs in **LAN mode by default** — the QR code it prints works for **any device on the same Wi-Fi network**, not just yours. Once your laptop is set up, anyone on the same Wi-Fi can:

1. Open **Expo Go** on their phone
2. Scan the QR code shown in your terminal (or shown on the Expo Dev Tools page in your browser)
3. The app loads and talks to **your** backend automatically via the `API_BASE_URL` you set in step 4 — no setup needed on their end

For this to work, two things must be reachable from other devices on the Wi-Fi:

- **Port 8081** (Metro/Expo bundler) — for loading the app itself
- **Port 8080** (Spring Boot backend) — for API calls

Windows Firewall often blocks these from other devices by default. If others can scan the QR but the app gets stuck loading, or loads but can't reach the backend, allow both ports (run as Administrator):

```powershell
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
New-NetFirewallRule -DisplayName "FuelPool Backend 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

> ⚠️ Your laptop's LAN IP is DHCP-assigned and **can change** (new Wi-Fi connection, reboot, etc.). If it changes, `API_BASE_URL` in `src/constants/index.ts` goes stale and **everyone** loses backend access — re-run `ipconfig` / `Get-NetIPAddress` (Wi-Fi adapter IPv4), update `API_BASE_URL`, and reload the app on all devices (shake → Reload, or press `r` in the Expo terminal).

---

## Usage

1. Open the app in Expo Go and **register** a new account, or **log in** with one of the demo accounts above.
2. On first login, complete onboarding — add a vehicle (fuel type, tank capacity, average efficiency).
3. **Home** — combined dashboard: fuel level/refuel advice, nearby carpool matches, weekly eco summary.
4. **Fuel** — current Malaysian fuel prices, price trend/forecast, log a fill-up, and MOF price-update articles with AI impact analysis.
5. **Ride** — map of nearby rides; **Find** a ride as a passenger, **Offer** a ride as a driver, and **My Rides** to manage requests and active trips.
6. **Eco** — weekly carbon savings, eco score, campus leaderboard, driving habits, and "Log a solo trip" for non-carpool trips.

For a guided two-account walkthrough using the seeded demo data, log in as `nurul@utm.my` (passenger) on one device and `ahmad@utm.my` (driver) on another to try the full request → accept → start → complete ride flow, then check that both accounts' **Eco** tabs update.

---

## Key Numbers (real data)

- RON97 peaked at **RM 5.35** (9 Apr 2026), now declining to **RM 4.35**
- Driver with 3 passengers saves **75%** of fuel cost per trip
- Passenger saves **~95%** vs Grab for the same campus route
- Data source: [data.gov.my fuel prices](https://data.gov.my/data-catalogue/fuelprice) — 465 weekly records from 2017–2026

---

## AI Features

1. **Ollama (llama3.2:3b) — MOF article analysis**
   - Scrapes Ministry of Finance weekly press releases
   - AI extracts: affected fuel type, new price, change amount, effective date, reason, and a plain-English impact summary for a typical student commute
   - Sends push notification to relevant users

2. **Trend prediction model**
   - Linear regression on last 6 weeks of price history
   - Outputs: 4-week price forecast + `FILL_NOW / WAIT / STABLE` recommendation

3. **Gender-aware carpool matching algorithm**
   - Scores rides by time proximity (±60 min), destination distance (<500m), and seat-fill ratio
   - Safety rule: a lone female passenger may join a male driver's ride only as the first passenger or alongside an existing female passenger

4. **Ollama — weekly personalised summary**
   - Generates a personalised coaching message per user from their week's driving
   - *"You shared 3 rides this week, saved RM 44 and 6.8kg CO2. You're in the top 18% at UTM."*

5. **Driving habit coach**
   - Analyses fuel log patterns (efficiency trends, BUDI95 usage, refuelling timing)
   - Generates a specific weekly tip via Ollama

---

## Data Sources

| Data | Source | URL |
|---|---|---|
| Fuel price history (2017–2026) | data.gov.my | https://api.data.gov.my/data-catalogue?id=fuelprice |
| Weekly fuel price announcements | Ministry of Finance Malaysia | https://www.mof.gov.my/portal/en/news/press-citations |

---

## License

MIT
