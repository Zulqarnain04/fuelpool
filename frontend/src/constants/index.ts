// src/constants/index.ts
// App-wide non-color constants. Colors live in ./colors.ts.

// ---- API ----
// Expo Go runs on the phone, so 'localhost' won't reach your machine — use the LAN IP
// your phone can actually see. The phone is on Wi-Fi, so use the laptop's Wi-Fi IPv4
// (NOT 192.168.56.1 — that's a VirtualBox host-only adapter the phone can't reach).
// Run `ipconfig` and use the "Wireless LAN adapter Wi-Fi" IPv4 address.
// NOTE: the backend must bind 0.0.0.0 (Spring default) so it's reachable on this IP.
export const API_BASE_URL = 'http://10.160.36.161:8080/api';

// ---- GRAB FARE ESTIMATE ----  grabFare = BASE + distanceKm * RATE_PER_KM
export const GRAB_BASE_FARE = 2.5;
export const GRAB_RATE_PER_KM = 0.9;

// ---- CARBON FACTORS (kg CO2 per litre) ----
export const CO2_FACTOR_PETROL = 2.31; // RON95 / RON97 (IPCC standard)
export const CO2_FACTOR_DIESEL = 2.68;

// ---- MAP DEFAULTS (UTM Skudai campus) ----
export const DEFAULT_LAT = 1.5577;
export const DEFAULT_LNG = 103.6388;

// ---- CAMPUS LOCATIONS (demo pickers) ----
// Mirrors the named Spot constants in DemoController.java so demo rides line up
// with the pickup/destination chips shown in the app.
export const CAMPUS_LOCATIONS = [
  { label: 'KTDI (MA7)', lat: 1.5659, lng: 103.6334 },
  { label: 'Faculty of Computing (N28)', lat: 1.557, lng: 103.6367 },
  { label: 'UTM Main Gate', lat: 1.5588, lng: 103.6347 },
  { label: 'Kolej 9 & 10', lat: 1.5602, lng: 103.6398 },
  { label: 'Kolej Tuanku Canselor', lat: 1.5612, lng: 103.6378 },
  { label: 'Kolej Tun Fatimah', lat: 1.564, lng: 103.631 },
  { label: 'Perpustakaan Sultanah Zanariah', lat: 1.5598, lng: 103.6385 },
  { label: 'Dewan Sultan Iskandar', lat: 1.5605, lng: 103.6395 },
  { label: 'Faculty of Electrical Engineering', lat: 1.5582, lng: 103.6355 },
  { label: 'UTM Stadium', lat: 1.556, lng: 103.642 },
  { label: 'Masjid Sultan Ismail UTM', lat: 1.5615, lng: 103.636 },
  { label: 'Kolej 17', lat: 1.5598, lng: 103.642 },
  { label: 'Kolej 18', lat: 1.5605, lng: 103.6415 },
  { label: 'Skudai Town', lat: 1.5305, lng: 103.6612 },
];

// ---- FUEL TYPES (values mirror backend Vehicle.FuelType enum) ----
export const FUEL_TYPES = [
  { value: 'RON95_MARKET', label: 'RON95 (market rate)', priceKey: 'ron95' },
  { value: 'RON95_BUDI95', label: 'RON95 BUDI95 (RM1.99)', priceKey: 'ron95_budi95', maxMonthlyLitres: 300 },
  { value: 'RON97', label: 'RON97', priceKey: 'ron97' },
  { value: 'DIESEL', label: 'Diesel (Peninsular)', priceKey: 'diesel' },
  { value: 'DIESEL_EAST', label: 'Diesel (East Malaysia)', priceKey: 'diesel_eastmsia' },
] as const;

// ---- MATCHING SETTINGS ----
export const MATCHING = {
  TIME_WINDOW_MINUTES: 60, // ±60 min from requested time
  MAX_DEST_DISTANCE_METRES: 500, // destination must be within 500m
  ROUTINE_TRIGGER_MINUTES: 30, // auto-request 30 min before departure
};

// ---- RECOMMENDATION THRESHOLDS ----
export const TREND_THRESHOLD = 0.05; // price change/week to flag RISING/FALLING
export const LOW_FUEL_THRESHOLD = 25; // % remaining to trigger "fill up soon"
