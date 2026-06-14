// src/utils/format.ts — small numeric/currency helpers (BigDecimals arrive as number|string).
export const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

export const rm = (v: unknown, decimals = 2): string => `RM ${num(v).toFixed(decimals)}`;

export const initialsOf = (name?: string): string => {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
};
