// src/constants/colors.ts
// FuelPool color palette — match Figma theme.css exactly. Never hardcode hex elsewhere.

export const FP_PRIMARY = '#1D9E75'; // teal — EcoTrack, success
export const FP_PRIMARY_LIGHT = '#E1F5EE';
export const FP_SECONDARY = '#378ADD'; // blue — Fuel Intelligence
export const FP_SECONDARY_LIGHT = '#E6F1FB';
export const FP_CARPOOL = '#0F6E56'; // dark teal — Seat Optimizer
export const FP_CARPOOL_LIGHT = '#9FE1CB';
export const FP_AI = '#534AB7'; // purple — AI badges
export const FP_AI_LIGHT = '#EEEDFE';
export const FP_WARNING = '#BA7517'; // amber — alerts
export const FP_DANGER = '#E24B4A'; // red — errors

export const BACKGROUND = '#F8F9FA';
export const CARD = '#FFFFFF';
export const BORDER = '#E5E7EB';
export const TEXT_PRIMARY = '#1A1A1A';
export const TEXT_SECONDARY = '#6B7280';
export const TEXT_LIGHT = '#9CA3AF';

// Skeleton / loading placeholder tone (from Figma Loaders.tsx)
export const SKELETON = '#E2E8F0';

// Convenience aggregate (use named exports above where possible)
export const COLORS = {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_SECONDARY_LIGHT,
  FP_CARPOOL,
  FP_CARPOOL_LIGHT,
  FP_AI,
  FP_AI_LIGHT,
  FP_WARNING,
  FP_DANGER,
  BACKGROUND,
  CARD,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  SKELETON,
} as const;

export default COLORS;
