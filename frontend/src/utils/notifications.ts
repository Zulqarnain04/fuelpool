// src/utils/notifications.ts
// Lightweight "what's new" check using AsyncStorage as a local last-seen
// cache — the backend has no persisted-notifications endpoint, so we diff
// against the latest eco weekly summary / MOF article on each app start.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_WEEK = '@fuelpool/lastSeenEcoWeek';
const KEY_MOF = '@fuelpool/lastSeenMofId';

export interface PendingNotification {
  message: string;
  target: '/(tabs)/eco' | '/(tabs)/fuel';
}

interface EcoWeeklyLike {
  weekStartDate?: string;
  ollamaSummary?: string | null;
}

export async function checkPendingNotification(
  eco: EcoWeeklyLike | null,
  mofId?: number,
): Promise<PendingNotification | null> {
  try {
    const [lastWeek, lastMofRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_WEEK),
      AsyncStorage.getItem(KEY_MOF),
    ]);
    const lastMof = lastMofRaw != null ? Number(lastMofRaw) : null;

    if (mofId != null && lastMof != null && mofId !== lastMof) {
      return { message: 'Fuel prices were just updated by MOF — tap to see what changed.', target: '/(tabs)/fuel' };
    }
    if (eco?.weekStartDate && eco.ollamaSummary && lastWeek != null && eco.weekStartDate !== lastWeek) {
      return { message: 'Your weekly eco summary is ready — tap to view your impact.', target: '/(tabs)/eco' };
    }
    return null;
  } catch {
    return null;
  }
}

export async function markNotificationsSeen(eco: EcoWeeklyLike | null, mofId?: number): Promise<void> {
  try {
    if (eco?.weekStartDate) await AsyncStorage.setItem(KEY_WEEK, eco.weekStartDate);
    if (mofId != null) await AsyncStorage.setItem(KEY_MOF, String(mofId));
  } catch {
    /* ignore */
  }
}
