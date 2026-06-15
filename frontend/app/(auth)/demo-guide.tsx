// app/(auth)/demo-guide.tsx
// Shown after "Use Demo Data" — seeds the backend, then shows the generated
// accounts and a guided walkthrough for the request -> accept -> start ->
// complete ride lifecycle. The user logs in manually from here.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CircleCheck, User as UserIcon, Car } from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_SECONDARY_LIGHT,
  FP_AI,
  FP_AI_LIGHT,
  BACKGROUND,
  CARD,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  FP_DANGER,
} from '../../src/constants/colors';

interface DemoUser {
  email: string;
  name: string;
  role: string;
  vehicle: string;
}

interface DemoGuide {
  title: string;
  password: string;
  passengerAccount: { email: string; name: string };
  driverAccount: { email: string; name: string };
  ride: {
    driver: string;
    pickupLabel: string;
    dropoffLabel: string;
  };
  steps: string[];
}

interface SeedResponse {
  message: string;
  totalUsers: number;
  totalRides: number;
  users: DemoUser[];
  demoGuide: DemoGuide;
}

function roleColors(role: string): { bg: string; text: string } {
  if (role === 'Driver') return { bg: FP_PRIMARY_LIGHT, text: FP_PRIMARY };
  if (role === 'Passenger') return { bg: FP_SECONDARY_LIGHT, text: FP_SECONDARY };
  return { bg: FP_AI_LIGHT, text: FP_AI };
}

export default function DemoGuide() {
  const router = useRouter();
  const { seedDemo } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SeedResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await seedDemo();
        if (mounted) setData(res as SeedResponse);
      } catch (e: any) {
        if (mounted) {
          setError(
            e?.response ? 'Could not seed demo data.' : "Can't reach the server to load demo data.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToLogin = (email?: string) => {
    router.replace(
      email ? { pathname: '/(auth)/login', params: { email } } : '/(auth)/login',
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={FP_PRIMARY} />
          <Text style={styles.loadingText}>Generating demo data…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn't load demo data</Text>
          <Text style={styles.errorText}>{error ?? 'Something went wrong.'}</Text>
          <PrimaryButton label="Back to Login" onPress={() => goToLogin()} style={styles.retryBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const { demoGuide, users } = data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <CircleCheck size={28} color={FP_PRIMARY} />
          </View>
          <Text style={styles.h1}>Demo Data Ready</Text>
          <Text style={styles.sub}>
            {data.totalUsers} accounts and {data.totalRides} rides were created inside UTM. Password
            for every account is <Text style={styles.code}>{demoGuide.password}</Text>.
          </Text>
        </View>

        {/* Guided walkthrough */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{demoGuide.title}</Text>
          <Text style={styles.cardSub}>
            {demoGuide.ride.driver}'s ride: {demoGuide.ride.pickupLabel} → {demoGuide.ride.dropoffLabel}
          </Text>

          {demoGuide.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <View style={styles.quickRow}>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: FP_SECONDARY_LIGHT }]}
              onPress={() => goToLogin(demoGuide.passengerAccount.email)}
              accessibilityRole="button"
            >
              <UserIcon size={14} color={FP_SECONDARY} />
              <Text style={[styles.quickBtnText, { color: FP_SECONDARY }]}>
                Log in as {demoGuide.passengerAccount.name}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: FP_PRIMARY_LIGHT }]}
              onPress={() => goToLogin(demoGuide.driverAccount.email)}
              accessibilityRole="button"
            >
              <Car size={14} color={FP_PRIMARY} />
              <Text style={[styles.quickBtnText, { color: FP_PRIMARY }]}>
                Log in as {demoGuide.driverAccount.name}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* All accounts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Demo Accounts ({users.length})</Text>
          <Text style={styles.cardSub}>Tap an account to fill in its email on the login screen.</Text>
          {users.map((u) => {
            const rc = roleColors(u.role);
            return (
              <Pressable
                key={u.email}
                style={styles.userRow}
                onPress={() => goToLogin(u.email)}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  {u.vehicle !== 'None' && <Text style={styles.userVehicle}>{u.vehicle}</Text>}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: rc.text }]}>{u.role}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <PrimaryButton label="Go to Login" onPress={() => goToLogin()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  errorText: { color: FP_DANGER, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: { marginTop: 20, minWidth: 180 },
  scroll: { padding: 20, paddingBottom: 12 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  h1: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  sub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  code: { fontWeight: '800', color: FP_PRIMARY },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 4 },
  cardSub: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 12, lineHeight: 17 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: FP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: FP_PRIMARY },
  stepText: { flex: 1, fontSize: 13, color: TEXT_PRIMARY, lineHeight: 19 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexGrow: 1,
    justifyContent: 'center',
  },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BACKGROUND,
  },
  userName: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  userEmail: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  userVehicle: { fontSize: 11, color: TEXT_LIGHT, marginTop: 1 },
  roleBadge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, marginLeft: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  bottom: { padding: 20, paddingTop: 8, backgroundColor: BACKGROUND, borderTopWidth: 1, borderTopColor: BORDER },
});
