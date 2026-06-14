// app/profile/index.tsx — profile hub (opened from the Home greeting avatar).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ChevronRight, Car, Droplet, CalendarClock, Star, Pencil, LogOut, ShieldCheck,
} from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import { userApi, vehicleApi, ecoApi } from '../../src/services/api';
import type { CurrentUser, Vehicle, EcoWeekly } from '../../src/services/api';
import { FUEL_META } from '../../src/components/fuel/fuelMeta';
import { num, rm, initialsOf } from '../../src/utils/format';
import {
  FP_PRIMARY, FP_CARPOOL, FP_CARPOOL_LIGHT, FP_SECONDARY, FP_AI, FP_DANGER,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [eco, setEco] = useState<EcoWeekly | null>(null);

  const load = useCallback(async () => {
    const [meRes, vRes, eRes] = await Promise.allSettled([userApi.getMe(), vehicleApi.getVehicles(), ecoApi.getWeeklyStats(0)]);
    if (meRes.status === 'fulfilled') setMe(meRes.value.data);
    if (vRes.status === 'fulfilled') {
      const list: Vehicle[] = vRes.value.data ?? [];
      setVehicle(list.find((v) => v.primary) ?? list[0] ?? null);
    }
    if (eRes.status === 'fulfilled') setEco(eRes.value.data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const name = me?.name ?? user?.name ?? 'Guest';
  const email = me?.email ?? user?.email ?? '';
  const verified = me?.verified ?? me?.isVerified ?? false;
  const rating = num(me?.driverRating) || 5;
  const fuelMeta = vehicle?.fuelType ? FUEL_META[vehicle.fuelType] : null;

  const handleLogout = () => {
    Alert.alert('Log out', 'Sign out of FuelPool?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back"><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* header card */}
        <LinearGradient colors={[FP_PRIMARY, FP_CARPOOL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
          <View style={styles.rowCenter}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(name)}</Text></View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.name}>{name}</Text>
              {email ? <Text style={styles.email}>{email}</Text> : null}
              {verified ? (
                <View style={styles.verifiedPill}><ShieldCheck size={11} color={CARD} /><Text style={styles.verifiedText}> Verified student</Text></View>
              ) : null}
            </View>
            <Pressable onPress={() => router.push('/profile/edit')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit profile">
              <Text style={styles.editLink}>Edit →</Text>
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <HeaderStat value={`${eco?.carpoolTrips ?? 0}`} label="Rides shared" />
            <HeaderStat value={rm(eco?.savedVsGrab)} label="Saved" />
            <HeaderStat value={`${num(eco?.carbonSavedKg).toFixed(1)} kg`} label="CO₂ avoided" />
          </View>
        </LinearGradient>

        {/* VEHICLE */}
        <Group label="Vehicle">
          <Row icon={<Car size={18} color={FP_CARPOOL} />} title={vehicle ? `${vehicle.make} ${vehicle.model}` : 'No vehicle yet'}
            sub={vehicle ? `${vehicle.year ?? ''} ${vehicle.color ?? ''}`.trim() || 'Tap to view' : 'Set one up'}
            onPress={() => router.push('/profile/vehicle')} />
        </Group>

        {/* FUEL PREFERENCES */}
        <Group label="Fuel preferences">
          <Row icon={<Droplet size={18} color={FP_SECONDARY} />} title="Current fuel type"
            sub={fuelMeta ? fuelMeta.label : 'Not set'} onPress={() => router.push('/profile/vehicle')} />
        </Group>

        {/* CARPOOL */}
        <Group label="Carpool">
          <Row icon={<CalendarClock size={18} color={FP_PRIMARY} />} title="My routines" sub="Auto-match schedules" onPress={() => router.push('/routines')} />
          <Row icon={<Star size={18} color="#FBBF24" />} title="My rating" sub={`★ ${rating.toFixed(1)} as a driver`} />
        </Group>

        {/* ACCOUNT */}
        <Group label="Account">
          <Row icon={<Pencil size={18} color={FP_AI} />} title="Edit profile" sub="Name & notifications" onPress={() => router.push('/profile/edit')} />
          <Pressable style={styles.logoutRow} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
            <LogOut size={18} color={FP_DANGER} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </Group>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.headerStat}>
      <Text style={styles.headerStatValue}>{value}</Text>
      <Text style={styles.headerStatLabel}>{label}</Text>
    </View>
  );
}
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}
function Row({ icon, title, sub, onPress }: { icon: React.ReactNode; title: string; sub?: string; onPress?: () => void }) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={18} color={TEXT_LIGHT} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { paddingHorizontal: 16 },
  headerCard: { borderRadius: 20, padding: 18 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: CARD, fontSize: 22, fontWeight: '800' },
  name: { color: CARD, fontSize: 18, fontWeight: '800' },
  email: { color: FP_CARPOOL_LIGHT, fontSize: 12, marginTop: 2 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  verifiedText: { color: CARD, fontSize: 10, fontWeight: '800' },
  editLink: { color: CARD, fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  headerStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 },
  headerStatValue: { color: CARD, fontSize: 15, fontWeight: '800' },
  headerStatLabel: { color: FP_CARPOOL_LIGHT, fontSize: 10, fontWeight: '600', marginTop: 2 },
  groupLabel: { fontSize: 11, fontWeight: '800', color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  rowSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  logoutText: { fontSize: 14, fontWeight: '800', color: FP_DANGER },
});
