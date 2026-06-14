// src/components/fuel/fuelMeta.ts — display metadata per fuel type.
import type { FuelType, FuelPrices } from '../../services/api';
import {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_SECONDARY_LIGHT,
  FP_WARNING,
  FP_AI,
} from '../../constants/colors';

export interface FuelMeta {
  label: string;
  color: string;
  bg: string;
  priceKey: keyof FuelPrices;
  subsidised: boolean;
}

export const FUEL_META: Record<FuelType, FuelMeta> = {
  RON95_MARKET: { label: 'RON95', color: FP_SECONDARY, bg: FP_SECONDARY_LIGHT, priceKey: 'ron95', subsidised: false },
  RON95_BUDI95: { label: 'BUDI95', color: FP_PRIMARY, bg: FP_PRIMARY_LIGHT, priceKey: 'ron95Budi95', subsidised: true },
  RON97: { label: 'RON97', color: FP_WARNING, bg: '#FBF3E6', priceKey: 'ron97', subsidised: false },
  DIESEL: { label: 'Diesel', color: FP_SECONDARY, bg: FP_SECONDARY_LIGHT, priceKey: 'diesel', subsidised: true },
  DIESEL_EAST: { label: 'Diesel E.M.', color: FP_AI, bg: '#EEEDFE', priceKey: 'dieselEastMsia', subsidised: true },
};

// Order shown in the fuel-type selector.
export const FUEL_ORDER: FuelType[] = ['RON95_MARKET', 'RON95_BUDI95', 'RON97', 'DIESEL', 'DIESEL_EAST'];
