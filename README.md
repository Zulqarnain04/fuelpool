# FuelPool 🚗⛽

> **UTM Vibeathon — AI Coding Challenge**
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

## Demo

> **Hackathon demo runs on Expo Go — scan to try live**

```
npx expo start --tunnel
```

Scan the QR code with **Expo Go** app (iOS / Android).

Backend runs on Render: `https://fuelpool-api.onrender.com`

---

## Key Numbers (real data)

- RON97 peaked at **RM 5.35** (9 Apr 2026), now declining to **RM 4.35**
- Driver with 3 passengers saves **75%** of fuel cost per trip
- Passenger saves **~95%** vs Grab for the same campus route
- Data source: [data.gov.my fuel prices](https://data.gov.my/data-catalogue/fuelprice) — 465 weekly records from 2017–2026

---

## AI Features

1. **Ollama (llama3.2:3b) — MOF article analysis**
   - Scrapes Ministry of Finance weekly press release every Wednesday 5PM
   - AI extracts: affected fuel type, new price, change amount, effective date, reason
   - Sends push notification to relevant users

2. **Trend prediction model**
   - Linear regression on last 6 weeks of price history
   - Outputs: 4-week price forecast + `FILL_NOW / WAIT / STABLE` recommendation

3. **Gender-aware carpool matching algorithm**
   - Scores rides by time proximity (±15 min), destination distance (<500m), seat fill ratio
   - Safety rule: lone female passenger only matched with female driver or mixed group

4. **Ollama — weekly personalised summary**
   - Every Sunday, generates personalised coaching message per user
   - *"You shared 3 rides this week, saved RM 44 and 6.8kg CO2. You're in the top 18% at UTM."*

5. **Driving habit coach**
   - Analyses fuel log patterns (efficiency trends, BUDI95 usage, refuelling timing)
   - Generates specific weekly tip via Ollama

---

## Tech Stack

### Frontend
- **React Native** (Expo SDK 51)
- **Expo Go** for demo (no native build needed)
- **Expo Router** — file-based navigation
- **React Native Maps** via WebView + Leaflet.js (Expo Go compatible)
- **Axios** for API calls
- **AsyncStorage** for local token storage

### Backend
- **Spring Boot 3.x** (Java 17)
- **MySQL** (Aiven Cloud)
- **Spring Data JPA** + Hibernate
- **JWT** authentication
- **Jsoup** — MOF website scraper
- **Ollama** — local LLM (llama3.2:3b)
- **Spring Scheduler** — weekly price scrape + routine auto-matching

---

## Project Structure

```
fuelpool/
├── frontend/          # Expo React Native app
│   ├── app/          # Expo Router screens
│   ├── src/
│   │   ├── components/
│   │   ├── services/  # API layer
│   │   ├── hooks/
│   │   └── constants/
│   ├── app.json
│   └── package.json
│
├── backend/           # Spring Boot API
│   ├── src/main/java/com/fuelpool/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── model/
│   │   ├── repository/
│   │   ├── dto/
│   │   └── scheduler/
│   └── pom.xml
│
├── FUELPOOL_SPEC.md   # Full technical specification
└── README.md
```

---

## Getting Started

### Backend
```bash
cd backend
# Configure application.properties (see backend/README.md)
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npx expo start
# Scan QR with Expo Go app
```

### Ollama (local AI)
```bash
ollama pull llama3.2:3b
ollama serve
# Runs on http://localhost:11434
```

---

## Data Sources

| Data | Source | URL |
|---|---|---|
| Fuel price history (2017–2026) | data.gov.my | https://api.data.gov.my/data-catalogue?id=fuelprice |
| Weekly fuel price announcements | Ministry of Finance Malaysia | https://www.mof.gov.my/portal/en/news/press-citations |
| Traffic patterns | Dummy data (campus demo) | `/backend/src/main/resources/data/traffic_dummy.json` |

---

## Team

Built solo by **[Your Name]** for UTM ASCEND 2030 Vibeathon AI Coding Challenge.

---

## License

MIT
