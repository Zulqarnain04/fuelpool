// src/constants/index.ts

// ---- API ----
// Change this to your machine's local IP when testing with Expo Go
// Expo Go runs on your phone — 'localhost' won't work, use your WiFi IP
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it
export const API_BASE_URL = 'http://192.168.1.100:8080/api';

// ---- COLORS ----
export const COLORS = {
  // Brand
  primary:    '#1D9E75',   // teal — EcoTrack green
  secondary:  '#378ADD',   // blue — Fuel Intelligence
  accent:     '#534AB7',   // purple — AI badges

  // Fuel types
  fuelGreen:  '#639922',
  fuelBlue:   '#185FA5',
  fuelAmber:  '#BA7517',
  fuelRed:    '#A32D2D',

  // Semantic
  success:    '#1D9E75',
  warning:    '#BA7517',
  danger:     '#E24B4A',
  info:       '#378ADD',

  // Neutral
  background: '#F8F9FA',
  card:       '#FFFFFF',
  border:     'rgba(0,0,0,0.08)',
  text:       '#1A1A1A',
  textMuted:  '#6B7280',
  textLight:  '#9CA3AF',
};

// ---- FUEL TYPES ----
export const FUEL_TYPES = [
  { value: 'RON95_MARKET', label: 'RON95 (market rate)',        priceKey: 'ron95' },
  { value: 'RON95_BUDI95', label: 'RON95 BUDI95 (RM1.99)',      priceKey: 'ron95_budi95', maxMonthlyLitres: 300 },
  { value: 'RON97',        label: 'RON97',                       priceKey: 'ron97' },
  { value: 'DIESEL',       label: 'Diesel (Peninsular)',         priceKey: 'diesel' },
  { value: 'DIESEL_EAST',  label: 'Diesel (East Malaysia)',      priceKey: 'diesel_eastmsia' },
];

// ---- CARBON FACTORS (kg CO2 per litre) ----
export const CO2_FACTOR = {
  petrol: 2.31,   // RON95, RON97 (IPCC standard)
  diesel: 2.68,
};

// ---- GRAB ESTIMATE ----
// Approximate Grab fare formula for JB/campus area
// grabFare = BASE + (distanceKm * RATE_PER_KM)
export const GRAB_BASE_FARE = 2.50;
export const GRAB_RATE_PER_KM = 0.90;

// ---- MAP DEFAULTS (UTM Skudai campus) ----
export const DEFAULT_LOCATION = {
  lat: 1.5577,
  lng: 103.6388,
  label: 'UTM Skudai',
};

// ---- MATCHING SETTINGS ----
export const MATCHING = {
  TIME_WINDOW_MINUTES: 15,       // ±15 min from requested time
  MAX_DEST_DISTANCE_METRES: 500, // destination must be within 500m
  ROUTINE_TRIGGER_MINUTES: 30,   // trigger auto-request 30 min before departure
};

// ---- RECOMMENDATION THRESHOLDS ----
export const TREND_THRESHOLD = 0.05;  // price change per week to trigger RISING/FALLING
export const LOW_FUEL_THRESHOLD = 25; // % remaining to trigger "fill up soon" alert

// ---- DUMMY CAMPUS LOCATIONS (for demo) ----
export const CAMPUS_LOCATIONS = [
  { label: 'Kolej 17',                      lat: 1.5598, lng: 103.6420 },
  { label: 'Kolej 18',                      lat: 1.5605, lng: 103.6415 },
  { label: 'Faculty of Computing (FC)',     lat: 1.5570, lng: 103.6367 },
  { label: 'Faculty of Civil Engineering', lat: 1.5545, lng: 103.6340 },
  { label: 'UTM Main Gate',                lat: 1.5588, lng: 103.6347 },
  { label: 'Skudai Town',                  lat: 1.5305, lng: 103.6612 },
  { label: 'Paradigm Mall JB',             lat: 1.5388, lng: 103.6658 },
];
