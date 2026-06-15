// src/components/common/DemoModeBanner.tsx
// Small floating "DEMO MODE" pill shown to the 24 seeded demo accounts.
// Mounted once at the app root so it overlays every screen.

import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cpu } from 'lucide-react-native';
import useAuth from '../../hooks/useAuth';
import { FP_AI, FP_AI_LIGHT } from '../../constants/colors';

const DEMO_EMAILS = new Set([
  'ahmad@utm.my',
  'nurul@utm.my',
  'haziq@utm.my',
  'siti@utm.my',
  'luqman@utm.my',
  'aisyah@utm.my',
  'farid@utm.my',
  'meiling@utm.my',
  'danish@utm.my',
  'aliya@utm.my',
  'zulkifli@utm.my',
  'hannah@utm.my',
  'arjun@utm.my',
  'nadia@utm.my',
  'faiz@utm.my',
  'syafiqah@utm.my',
  'razak@utm.my',
  'weijie@utm.my',
  'amirul@utm.my',
  'farah@utm.my',
  'kavitha@utm.my',
  'hafiz@utm.my',
  'izzati@utm.my',
  'bryan@utm.my',
]);

export default function DemoModeBanner() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (!user?.email || !DEMO_EMAILS.has(user.email)) return null;

  return (
    <Pressable
      style={[styles.pill, { top: insets.top + 6 }]}
      onPress={() =>
        Alert.alert(
          'Demo Mode',
          "You're signed in as a seeded demo account. All rides, fuel logs, and eco stats shown are sample data for showcasing FuelPool.",
        )
      }
      accessibilityRole="button"
      accessibilityLabel="Demo mode active. Tap for details."
    >
      <Cpu size={11} color={FP_AI} />
      <Text style={styles.text}>DEMO MODE</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FP_AI_LIGHT,
    borderWidth: 1,
    borderColor: 'rgba(83,74,183,0.25)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    color: FP_AI,
    letterSpacing: 0.6,
  },
});
