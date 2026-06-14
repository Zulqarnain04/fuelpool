# FRONTEND_FLOW.md — Updates from Figma Reference
> Corrections found after reviewing Information_Architecture_for_FuelPool.zip
> Apply these on top of the original FRONTEND_FLOW.md

---

## 1. Bottom Navigation — CORRECTED

The original spec had 4 tabs: Home, Fuel, Carpool, Profile.
The Figma shows: **Home | Fuel | Ride | Eco** (no Profile tab).

| Tab | Icon | Route | What it shows |
|---|---|---|---|
| Home | House | `/(tabs)/home` | Aggregated dashboard — L1+L2+L3 combined |
| Fuel | Droplet | `/(tabs)/fuel` | Fuel Intelligence L1 detail |
| Ride | Users | `/(tabs)/ride` | Seat Optimizer L2 with map |
| Eco | Leaf | `/(tabs)/eco` | EcoTrack detailed stats L3 |

**Profile** is NOT a tab. It is accessed by tapping the avatar in the Home greeting card. Routes to `app/profile/index.tsx` as a stack screen.

---

## 2. Home Screen Content — CORRECTED

The Home tab IS the main EcoTrack dashboard. It shows ALL three layers:
- L1: fuel price strip + refuel recommendation + AI alert
- L2: nearby carpool matches + "See all rides" link
- L3: weekly impact stats + AI coaching tip + eco rank

The "Eco" tab shows the DETAILED EcoTrack view: leaderboard, habits, monthly stats, driving analysis.

Updated S-07 content order (from Figma):
1. Greeting card (gradient, with quick stats pills)
2. Fuel alert (dismissible, only if action ≠ NORMAL)
3. Fuel level card (only if vehicle set up)
4. Weekly impact 2×2 grid + SVG bar chart
5. AI weekly insight card (dark FP_AI gradient)
6. Nearby carpool matches (2 cards)
7. Current fuel prices strip (3 chips)

---

## 3. Fuel Intelligence Screens — UPDATED

The Figma shows 4 internal sub-screens within the Fuel tab (NOT separate Expo Router routes):

| Sub-screen | How to reach |
|---|---|
| Fuel Overview | Default on tab load |
| MOF Article Detail | Tap MOF teaser card in Overview |
| Add Fuel Log | Tap FAB (+) in Overview |
| Fuel Log History | Tap "View history" link or after saving log |

Navigation between sub-screens is via **internal React state** (not Expo Router navigation), since these are closely related views within the same tab.

---

## 4. 4 States for Every Screen — CONFIRMED from Figma

The Figma explicitly shows 4 states for EVERY screen. Claude Code must implement all 4:

| State | Description |
|---|---|
| `default` | Data loaded, normal usage |
| `loading` | Animated skeleton placeholders (NOT a spinner) |
| `empty` | First-time user or no data yet — with CTA to add data |
| `error` | Network/API failure — with retry button + cached data if available |

Skeleton pattern (from Figma Loaders.tsx): gray `#E2E8F0` animated rectangles with pulse opacity animation, same dimensions as the real content they replace.

---

## 5. Carpool Map Screen — UPDATED

The Ride tab has a fixed structure:
- Top **50% of screen**: Leaflet map via WebView (green markers = open rides, blue = user)
- Bottom **50%**: tab strip with 3 sub-tabs:
  - **Find Ride** — passenger view, search + results
  - **Offer Ride** — driver view, post a ride CTA + my active rides
  - **My Rides** — GET /api/rides/mine (asDriver + asPassenger combined)

Post a ride opens as a **bottom sheet Modal**, not a separate screen.

---

## 6. Authentication Screen Updates — from Figma

Exact Figma screens for auth:

| Screen | Key visual notes |
|---|---|
| Splash | FP_PRIMARY full screen, white logo box, animated spinner at bottom |
| Login | White screen, logo row at top, error state shows red password border + error message |
| Register | Gender selector is TWO pill buttons (Male/Female) — critical for carpool safety |
| Welcome | FP_PRIMARY full screen + spring-animated white success circle |
| Vehicle Setup | 2-step progress bar, auto-fills efficiency from vehicle database |
| Route Setup | Dot-connector route visual (blue dot → red dot with line) |

Register screen: gender selection is **required**, shown as two large pill buttons below the password field with note "Used for safe carpool matching only".

---

## 7. Design Tokens — Match Figma Exactly

From `theme.css` in the Figma zip:

```
--fp-primary:         #1D9E75  (EcoTrack green)
--fp-primary-light:   #E1F5EE
--fp-secondary:       #378ADD  (Fuel blue)
--fp-secondary-light: #E6F1FB
--fp-carpool:         #0F6E56  (Seat Optimizer dark teal)
--fp-carpool-light:   #9FE1CB
--fp-ai:              #534AB7  (AI badges purple)
--fp-ai-light:        #EEEDFE
--fp-warning:         #BA7517  (alerts amber)
--fp-danger:          #E24B4A  (errors red)
--fp-background:      #F8F9FA
```

AI badge (from AIBadges.tsx):
- Background: FP_AI_LIGHT (#EEEDFE)
- Text color: FP_AI (#534AB7)
- Border: FP_AI/20 (20% opacity)
- Shadow: 0 0 10px rgba(83,74,183,0.1)
- Icon: Cpu (lucide), 10px
- Text: 10px bold uppercase tracking-wider

---

## 8. Animation Library

The Figma uses `motion/react` (Framer Motion v12+). In React Native:
- Use `react-native-reanimated` (bundled with Expo SDK 51, works in Expo Go)
- For simple animations: `Animated` from React Native core
- For the skeleton pulse: `Animated.loop(Animated.sequence([...]))` with opacity
- For card hover/press effects: `Pressable` with scale animation via `Animated.spring()`

---

## 9. Charts — Pure SVG (No chart library)

The Figma implements ALL charts as pure SVG (no recharts, no chart-kit):
- Price trend: custom SVG line chart with area fill
- Weekly savings: simple bar chart SVG
- Monthly spend: bar chart SVG
- Donut chart: SVG arc paths

In React Native: use `react-native-svg` (bundled with Expo) for all charts.
Do NOT use `react-native-chart-kit` or `recharts` — they're not needed and add bundle size.

---

## 10. New Screens Added by v3 Features

Add these screens to the flow:

| Screen | Route | Trigger |
|---|---|---|
| Enhanced Price Prediction | Within Fuel tab | "View detailed analysis" link |
| AI Refuel Advisor Detail | Modal or bottom sheet | Tap recommendation card on Home |
| Routine List | `app/routines/index.tsx` | From Ride tab header icon |
| Add/Edit Routine | `app/routines/new.tsx` | FAB on routines list |

The Enhanced Prediction screen (`GET /api/fuel/trend/enhanced`) shows:
- Prediction direction + confidence circle (% text in center)
- Price range [lower - upper] as a band on the chart
- Ollama-generated reason sentence
- "Based on X-week linear regression + MOF context" footer

---

## Summary of Changes vs Original FRONTEND_FLOW.md

| Area | Original | Updated |
|---|---|---|
| Bottom tabs | Home, Fuel, Carpool, Profile | Home, Fuel, Ride, Eco |
| Profile access | 4th tab | Tap avatar on Home |
| Fuel sub-screens | Separate routes | Internal state within Fuel tab |
| Carpool map | Mentioned briefly | Detailed WebView + Leaflet spec |
| Animation library | Not specified | react-native-reanimated |
| Charts library | react-native-chart-kit implied | react-native-svg (pure SVG) |
| Loading state | Spinner | Skeleton placeholders (no spinner) |
| State count | 3 (default/loading/error) | 4 (+ empty state for new users) |
