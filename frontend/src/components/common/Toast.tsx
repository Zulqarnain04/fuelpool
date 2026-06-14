// src/components/common/Toast.tsx
// Tiny global toast: module-level store (same shared-state pattern as useAuth)
// + a single <ToastHost /> mounted in the root layout that slides up from the
// bottom and auto-dismisses after 3s.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Info } from 'lucide-react-native';
import { FP_PRIMARY, FP_AI, CARD } from '../../constants/colors';

export type ToastKind = 'success' | 'info';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

let current: ToastState | null = null;
let nextId = 1;
const listeners = new Set<(t: ToastState | null) => void>();

function notify() {
  listeners.forEach((l) => l(current));
}

export function showToast(message: string, kind: ToastKind = 'success') {
  current = { id: nextId++, message, kind };
  notify();
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  info: (message: string) => showToast(message, 'info'),
};

// Mounted once near the root of the app — renders whatever toast is current.
export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [t, setT] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener = (next: ToastState | null) => setT(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!t) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setT(null));
    }, 3000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [t, anim]);

  if (!t) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const Icon = t.kind === 'success' ? CheckCircle2 : Info;
  const tint = t.kind === 'success' ? FP_PRIMARY : FP_AI;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + 72, opacity: anim, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Icon size={16} color={tint} />
      <Text style={styles.text} numberOfLines={2}>{t.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { color: CARD, fontSize: 13, fontWeight: '700', flex: 1 },
});
