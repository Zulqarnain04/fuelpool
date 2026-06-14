// src/services/api.ts
// Central API layer — all backend calls go through here.
// Endpoints mirror the Spring Boot controllers in
//   backend/.../com/fuelpool/fuelpool_backend/controller/  (source of truth).

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants';

export const TOKEN_KEY = 'jwt_token';
export const BASE_URL = API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- AUTH ----  (AuthController /api/auth, DemoController /api/demo)
export const authApi = {
  // → AuthResponse { token, userId, name, email, gender, isDriver }
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  // Seeds demo users/rides/eco data; returns { tokens: { 'ahmad@utm.my': '<jwt>', ... } }
  seedDemo: () =>
    api.post('/demo/seed'),

  health: () =>
    api.get('/demo/health'),
};

// ---- USER ----  (UserController /api/users)
export const userApi = {
  getMe: () =>
    api.get('/users/me'),

  // backend only persists name + fcmToken
  updateMe: (data: { name?: string; fcmToken?: string }) =>
    api.put('/users/me', data),
};

// ---- FUEL INTELLIGENCE (L1) ----  (FuelPriceController, MOFController, FuelLogController)
export const fuelApi = {
  getCurrentPrices: () =>
    api.get('/fuel/prices/current'),

  getPriceHistory: (weeks = 12) =>
    api.get(`/fuel/prices/history?weeks=${weeks}`),

  // backend only reads fuelType
  getTrend: (fuelType = 'RON95_MARKET') =>
    api.get(`/fuel/trend?fuelType=${fuelType}`),

  // v3: direction, confidence, price band, Ollama reason
  getEnhancedTrend: (fuelType = 'RON97') =>
    api.get(`/fuel/trend/enhanced?fuelType=${fuelType}`),

  getRecommendation: () =>
    api.get('/fuel/recommendation'),

  getStats: () =>
    api.get('/fuel/stats'),

  getBudi95Status: () =>
    api.get('/fuel/budi95/status'),

  getLatestMOFArticle: () =>
    api.get('/fuel/mof/latest'),

  triggerMOFScrape: () =>
    api.post('/fuel/mof/trigger'),

  // Fuel log
  addLog: (data: FuelLogRequest) =>
    api.post('/fuel/logs', data),

  // returns Spring Page<FuelLog> { content, totalElements, ... }
  getLogs: (page = 0, size = 20) =>
    api.get(`/fuel/logs?page=${page}&size=${size}`),

  getLog: (id: number) =>
    api.get(`/fuel/logs/${id}`),

  deleteLog: (id: number) =>
    api.delete(`/fuel/logs/${id}`),
};

// ---- SEAT OPTIMIZER (L2) ----  (RideController, RideRequestController, RoutineController)
export const carpoolApi = {
  postRide: (data: RidePostRequest) =>
    api.post('/rides', data),

  // GET /rides?status=&lat=&lng=&radius=  (lat/lng optional → all by status)
  getRides: (params?: { status?: string; lat?: number; lng?: number; radius?: number }) =>
    api.get('/rides', { params: { status: 'OPEN', ...params } }),

  // v3: { asDriver: Ride[], asPassenger: RideRequest[] }
  getMyRides: () =>
    api.get('/rides/mine'),

  getRide: (id: number) =>
    api.get(`/rides/${id}`),

  // returns Ride (includes googleMapsUrl once started)
  startRide: (id: number) =>
    api.put(`/rides/${id}/start`),

  completeRide: (id: number) =>
    api.put(`/rides/${id}/complete`),

  cancelRide: (id: number) =>
    api.put(`/rides/${id}/cancel`),

  rateUser: (rideId: number, rating: number, targetUserId: number) =>
    api.post(`/rides/${rideId}/rate`, { rating, targetUserId }),

  // Matching → RideMatchResponse[]
  findMatches: (params: MatchRequest) =>
    api.get('/rides/match', { params }),

  // Requests
  joinRide: (rideId: number, data: RideJoinRequest) =>
    api.post(`/rides/${rideId}/request`, data),

  acceptRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/accept`),

  rejectRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/reject`),

  cancelRequest: (requestId: number) =>
    api.put(`/ride-requests/${requestId}/cancel`),

  // Routines
  createRoutine: (data: RoutineRequest) =>
    api.post('/routines', data),

  getRoutines: () =>
    api.get('/routines'),

  updateRoutine: (id: number, data: RoutineRequest) =>
    api.put(`/routines/${id}`, data),

  deleteRoutine: (id: number) =>
    api.delete(`/routines/${id}`),

  toggleRoutine: (id: number) =>
    api.put(`/routines/${id}/toggle`),
};

// ---- ECOTRACK (L3) ----  (DashboardController /api/dashboard, EcoTrackController /api/eco)
export const ecoApi = {
  // Home aggregate (L1 + L2 + L3)
  getDashboard: () =>
    api.get('/dashboard'),

  getWeeklyStats: (weekOffset = 0) =>
    api.get(`/eco/weekly?weekOffset=${weekOffset}`),

  getMonthlyStats: () =>
    api.get('/eco/monthly'),

  getLeaderboard: () =>
    api.get('/eco/leaderboard'),

  getHabits: () =>
    api.get('/eco/habits'),

  // cached Ollama summary string for the current week
  getWeeklySummary: () =>
    api.get('/eco/summary'),

  // v3: force-generate a fresh Ollama summary
  generateSummary: () =>
    api.post('/eco/summary/generate'),
};

// ---- VEHICLE ----  (VehicleController /api/vehicles)
export const vehicleApi = {
  addVehicle: (data: VehicleRequest) =>
    api.post('/vehicles', data),

  getVehicles: () =>
    api.get('/vehicles'),

  // backend update only changes make/model/fuelType/tankCapacity/avgEfficiency
  updateVehicle: (id: number, data: VehicleRequest) =>
    api.put(`/vehicles/${id}`, data),

  deleteVehicle: (id: number) =>
    api.delete(`/vehicles/${id}`),
};

// ---- ENUMS (mirror backend) ----
export type Gender = 'MALE' | 'FEMALE';
export type FuelType = 'RON95_MARKET' | 'RON95_BUDI95' | 'RON97' | 'DIESEL' | 'DIESEL_EAST';
export type RolePreference = 'DRIVER' | 'PASSENGER' | 'EITHER';

// ---- TYPE DEFINITIONS (mirror backend request DTOs) ----
export interface RegisterRequest {
  email: string;
  password: string; // min 6 chars (backend @Size(min = 6))
  name: string;
  gender: Gender;
}

export interface AuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  gender: Gender;
  isDriver: boolean;
}

export interface FuelLogRequest {
  logDate: string; // ISO LocalDateTime
  odometer: number;
  litresFilled: number;
  pricePerLitre?: number; // provide this OR totalCost
  totalCost?: number; // provide this OR pricePerLitre
  isFullTank?: boolean; // default true
  isMissedPrevious?: boolean; // default false
  stationName?: string;
  fuelType: FuelType;
  notes?: string;
  vehicleId?: number;
}

export interface RidePostRequest {
  originLat: number;
  originLng: number;
  originLabel?: string;
  destinationLat: number;
  destinationLng: number;
  destinationLabel?: string;
  departureTime: string; // ISO LocalDateTime
  maxSeats?: number; // 1–4, default 3
  vehicleId: number;
  estimatedDistanceKm?: number;
}

export interface RideJoinRequest {
  pickupLat: number;
  pickupLng: number;
  pickupLabel?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffLabel?: string;
}

export interface MatchRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  time: string; // ISO LocalDateTime
}

export interface RoutineRequest {
  name: string;
  daysOfWeek: string; // "MON,TUE,WED,THU,FRI"
  departureTime: string; // LocalTime "07:45"
  originLat: number;
  originLng: number;
  originLabel?: string;
  destLat: number;
  destLng: number;
  destLabel?: string;
  rolePreference?: RolePreference; // default EITHER
  autoRequest?: boolean; // default false
}

export interface VehicleRequest {
  make: string;
  model: string;
  year?: number;
  color?: string;
  plateNumber?: string;
  tankCapacity: number;
  avgEfficiency: number;
  fuelType: FuelType;
  currentOdometer?: number;
  isPrimary?: boolean; // default true
}

// ---- RESPONSE SHAPES (mirror backend response DTOs / entities) ----
// BigDecimals serialize to JSON numbers, but we allow string defensively.
export type Num = number | string | null | undefined;

export interface FuelPrices {
  priceDate?: string;
  ron95?: Num;
  ron97?: Num;
  diesel?: Num;
  dieselEastMsia?: Num;
  ron95Budi95?: Num;
  ron95Skps?: Num;
}

export type RefuelAction = 'FILL_NOW' | 'FILL_SOON' | 'WAIT' | 'NORMAL';

export interface DashboardResponse {
  currentPrices?: FuelPrices;
  refuelAction?: RefuelAction | string;
  refuelReason?: string;
  remainingFuelPct?: number | null;
  remainingKm?: number | null;
  remainingLitres?: number | null;
  vehicleSetUp: boolean;
  nearbyRidesCount: number;
  nearbyRidesSummary?: string;
  weeklySavedVsSolo?: Num;
  weeklySavedVsGrab?: Num;
  weeklyCarbonSavedKg?: Num;
  treesEquivalent?: number;
  communityRank?: number | null;
  totalUsers?: number | null;
  percentile?: number | null;
  rankSummary?: string;
}

export interface EcoWeekly {
  weekStartDate?: string;
  totalTrips?: number;
  carpoolTrips?: number;
  soloTrips?: number;
  totalCarbonKg?: Num;
  carbonSavedKg?: Num;
  treesEquivalent?: number;
  totalFuelCost?: Num;
  savedVsSolo?: Num;
  savedVsGrab?: Num;
  ecoScore?: Num;
  communityRank?: number;
  totalUsersRanked?: number;
  percentile?: number;
  ollamaSummary?: string | null;
}

export interface RideUserSummary {
  id?: number;
  name?: string;
  driverRating?: Num;
  isVerified?: boolean;
  gender?: Gender;
}

export interface RideSummary {
  id: number;
  driver?: RideUserSummary;
  originLabel?: string;
  destinationLabel?: string;
  departureTime?: string;
  maxSeats?: number;
  confirmedPassengers?: number;
  estimatedFarePerPerson?: Num;
  status?: string;
  originLat?: Num;
  originLng?: Num;
  destinationLat?: Num;
  destinationLng?: Num;
}

// ---- FUEL (L1) ----
export interface EnhancedPrediction {
  prediction?: 'UP' | 'DOWN' | 'STABLE' | string;
  confidence?: number;
  nextWeekRange?: number[]; // [lower, upper]
  predictedPrice?: number;
  reason?: string; // Ollama sentence (may be slow)
  basedOn?: string;
  priceHistory?: number[]; // last weeks
  weeklyChangeSen?: number;
}

export interface FuelTrend {
  slope?: number;
  direction?: 'RISING' | 'FALLING' | 'STABLE' | string;
  predicted?: number[]; // next 4 weeks
  recommendation?: RefuelAction | string;
  reason?: string;
}

export interface RefuelRecommendation {
  action?: RefuelAction | string;
  reason?: string;
  remainingFuelPct?: number | null;
  remainingKm?: number | null;
  remainingLitres?: number | null;
  confidence?: number;
  suggestedAmount?: number;
  estimatedSavings?: number;
  daysOfRange?: number;
  behaviourScore?: number;
}

export interface Budi95Status {
  usedLitres?: number;
  limitLitres?: number;
  remainingLitres?: number;
  limitExceeded?: boolean;
  effectivePrice?: Num;
}

export interface MofArticle {
  id?: number;
  fetchedAt?: string;
  title?: string;
  sourceUrl?: string;
  rawContent?: string;
  ollamaAnalysis?: string; // JSON string: extraction (flat prices + reason + userTip + summary)
  parsedChanges?: string;
  effectiveDate?: string;
  mainReason?: string;
  userTip?: string;
  // AI Intelligence Engine fields
  aiConfidence?: number;
  articleType?: string;
  summary?: string;
  impactAnalysis?: string; // JSON: { impactLevel, estimatedCostImpact, driverAdvice, summary }
}

export interface FuelLog {
  id: number;
  logDate?: string;
  odometer?: number;
  litresFilled?: Num;
  pricePerLitre?: Num;
  totalCost?: Num;
  fullTank?: boolean; // Jackson serializes isFullTank → "fullTank"
  missedPrevious?: boolean;
  stationName?: string;
  fuelType?: FuelType;
  notes?: string;
  distanceSinceLast?: number | null;
  efficiencyThisFill?: Num | null;
  costPerKm?: Num | null;
}

export interface Vehicle {
  id: number;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  plateNumber?: string;
  fuelType?: FuelType;
  tankCapacity?: Num;
  avgEfficiency?: Num;
  currentOdometer?: number;
  primary?: boolean; // Jackson: isPrimary → "primary"
}

// Spring Data Page
export interface Page<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  last?: boolean;
}

// ---- CARPOOL (L2) ----
export interface RideMatch {
  rideId: number;
  driverName?: string;
  driverRating?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  plateNumber?: string;
  departureTime?: string;
  availableSeats?: number;
  farePerPerson?: Num;
  savedVsGrab?: Num;
  matchScore?: number;
  pickupDistanceMetres?: number;
  originLabel?: string;
  destinationLabel?: string;
}

// Full Ride entity (extends the summary used on Home with the extra fields).
export interface RideFull extends RideSummary {
  vehicle?: Vehicle;
  estimatedDistanceKm?: Num;
  fuelCostTotal?: Num;
  googleMapsUrl?: string;
  createdAt?: string;
}

export interface RideRequestFull {
  id: number;
  ride?: RideFull;
  passenger?: RideUserSummary;
  pickupLat?: Num;
  pickupLng?: Num;
  pickupLabel?: string;
  dropoffLat?: Num;
  dropoffLng?: Num;
  dropoffLabel?: string;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | string;
  fareAmount?: Num;
  createdAt?: string;
}

export interface MyRides {
  asDriver: RideFull[];
  asPassenger: RideRequestFull[];
}

export interface Routine {
  id: number;
  name?: string;
  daysOfWeek?: string; // "MON,TUE,WED,THU,FRI"
  departureTime?: string; // "07:45"
  originLat?: Num;
  originLng?: Num;
  originLabel?: string;
  destLat?: Num;
  destLng?: Num;
  destLabel?: string;
  rolePreference?: RolePreference | string;
  autoRequest?: boolean;
  active?: boolean; // Jackson: isActive → "active"
}

export default api;
