// src/services/api.ts
// Central API layer — all backend calls go through here
// Change BASE_URL to your Render deployment URL before demo

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ---- CONFIG ----
// Local dev:    http://192.168.x.x:8080/api   (your machine IP, not localhost — Expo Go runs on phone)
// Render prod:  https://fuelpool-api.onrender.com/api
export const BASE_URL = 'http://192.168.1.100:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- AUTH ----
export const authApi = {
  register: (data: { email: string; password: string; name: string; gender: 'MALE' | 'FEMALE' }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

// ---- FUEL INTELLIGENCE (L1) ----
export const fuelApi = {
  getCurrentPrices: () =>
    api.get('/fuel/prices/current'),

  getPriceHistory: (weeks = 12) =>
    api.get(`/fuel/prices/history?weeks=${weeks}`),

  getTrend: (fuelType: string, weeks = 6) =>
    api.get(`/fuel/trend?fuelType=${fuelType}&weeks=${weeks}`),

  getRecommendation: () =>
    api.get('/fuel/recommendation'),

  getLatestMOFArticle: () =>
    api.get('/fuel/mof/latest'),

  triggerMOFScrape: () =>
    api.post('/fuel/mof/trigger'),   // for demo: manually trigger scraper

  // Fuel log
  addLog: (data: FuelLogRequest) =>
    api.post('/fuel/logs', data),

  getLogs: (page = 0, size = 20) =>
    api.get(`/fuel/logs?page=${page}&size=${size}`),

  deleteLog: (id: number) =>
    api.delete(`/fuel/logs/${id}`),

  getFuelStats: () =>
    api.get('/fuel/stats'),
};

// ---- SEAT OPTIMIZER (L2) ----
export const carpoolApi = {
  // Rides
  postRide: (data: RidePostRequest) =>
    api.post('/rides', data),

  getNearbyRides: (lat: number, lng: number, radius = 2000) =>
    api.get(`/rides?lat=${lat}&lng=${lng}&radius=${radius}&status=OPEN`),

  getRide: (id: number) =>
    api.get(`/rides/${id}`),

  cancelRide: (id: number) =>
    api.put(`/rides/${id}/cancel`),

  startRide: (id: number) =>
    api.put(`/rides/${id}/start`),   // returns { googleMapsUrl }

  completeRide: (id: number) =>
    api.put(`/rides/${id}/complete`),

  // Matching
  findMatches: (params: MatchRequest) =>
    api.get('/rides/match', { params }),

  // Requests
  joinRide: (rideId: number, data: { pickupLat: number; pickupLng: number; dropoffLat: number; dropoffLng: number }) =>
    api.post(`/rides/${rideId}/request`, data),

  acceptRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/accept`),

  rejectRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/reject`),

  cancelRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/cancel`),

  rateUser: (rideId: number, rating: number, targetUserId: number) =>
    api.post(`/rides/${rideId}/rate`, { rating, targetUserId }),

  // Routines
  createRoutine: (data: RoutineRequest) =>
    api.post('/routines', data),

  getRoutines: () =>
    api.get('/routines'),

  updateRoutine: (id: number, data: Partial<RoutineRequest>) =>
    api.put(`/routines/${id}`, data),

  deleteRoutine: (id: number) =>
    api.delete(`/routines/${id}`),

  toggleRoutine: (id: number) =>
    api.put(`/routines/${id}/toggle`),
};

// ---- ECOTRACK DASHBOARD (L3) ----
export const ecoApi = {
  getDashboard: () =>
    api.get('/dashboard'),           // main home screen data

  getWeeklyStats: (weekOffset = 0) =>
    api.get(`/eco/weekly?weekOffset=${weekOffset}`),

  getMonthlyStats: () =>
    api.get('/eco/monthly'),

  getLeaderboard: () =>
    api.get('/eco/leaderboard'),

  getHabits: () =>
    api.get('/eco/habits'),

  getWeeklySummary: () =>
    api.get('/eco/summary'),         // Ollama-generated text
};

// ---- VEHICLE ----
export const vehicleApi = {
  addVehicle: (data: VehicleRequest) =>
    api.post('/vehicles', data),

  getVehicles: () =>
    api.get('/vehicles'),

  updateVehicle: (id: number, data: Partial<VehicleRequest>) =>
    api.put(`/vehicles/${id}`, data),
};

// ---- TYPE DEFINITIONS ----
export interface FuelLogRequest {
  logDate: string;           // ISO datetime
  odometer: number;          // km
  litresFilled: number;
  pricePerLitre?: number;    // provide this OR totalCost
  totalCost?: number;        // provide this OR pricePerLitre
  isFullTank: boolean;
  isMissedPrevious: boolean;
  stationName?: string;      // free text, optional
  fuelType: string;          // user's fuel type, pre-filled
  notes?: string;
}

export interface RidePostRequest {
  originLat: number;
  originLng: number;
  originLabel: string;
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
  departureTime: string;     // ISO datetime
  maxSeats: number;          // 1–4
  vehicleId: number;
}

export interface MatchRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  time: string;              // ISO datetime
}

export interface RoutineRequest {
  name: string;
  daysOfWeek: string;        // "MON,TUE,WED,THU,FRI"
  departureTime: string;     // "07:45"
  originLat: number;
  originLng: number;
  originLabel: string;
  destLat: number;
  destLng: number;
  destLabel: string;
  rolePreference: 'DRIVER' | 'PASSENGER' | 'EITHER';
  autoRequest: boolean;
}

export interface VehicleRequest {
  make: string;
  model: string;
  year?: number;
  color?: string;
  plateNumber?: string;
  tankCapacity: number;
  avgEfficiency: number;
  fuelType: 'RON95_MARKET' | 'RON95_BUDI95' | 'RON97' | 'DIESEL' | 'DIESEL_EAST';
  currentOdometer?: number;
}

export default api;
