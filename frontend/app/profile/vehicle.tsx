// app/profile/vehicle.tsx — vehicle details + fuel-log stats.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Car, Plus, Pencil } from 'lucide-react-native';
import { vehicleApi, fuelApi } from '../../src/services/api';
import type { Vehicle, FuelLog, Page } from '../../src/services/api';
import { FUEL_META } from '../../src/components/fuel/fuelMeta';
import { num, rm } from '../../src/utils/format';
import {
  FP_PRIMARY, FP_CARPOOL, FP_CARPOOL_LIGHT, BACKGROUND, CARD, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface Stats { totalSpend?: number; totalLitres?: number; avgEfficiency?: number | null }

export default function VehicleScreen() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [vRes, sRes, fRes] = await Promise.allSettled([vehicleApi.getVehicles(), fuelApi.getStats(), fuelApi.getLogs(0, 50)]);
      if (vRes.status === 'fulfilled') {
        const list: Vehicle[] = vRes.value.data ?? [];
        setVehicleCount(list.length);
        setVehicle(list.find((v) => v.primary) ?? list[0] ?? null);
      }
      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      const page: Page<FuelLog> | undefined = fRes.status === 'fulfilled' ? fRes.value.data : undefined;
      setLogs(page?.content ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={FP_PRIMARY} /></View></SafeAreaView>;
  }

  const meta = vehicle?.fuelType ? FUEL_META[vehicle.fuelType] : null;
  const effs = logs.filter((l) => l.efficiencyThisFill != null).map((l) => num(l.efficiencyThisFill));
  const best = effs.length ? Math.max(...effs) : null;
  const worst = effs.length ? Math.min(...effs) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
        <Text style={styles.topTitle}>My Vehicle</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {vehicle ? (
          <>
            <LinearGradient colors={[FP_CARPOOL, FP_PRIMARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.rowCenter}>
                <View style={styles.heroIcon}><Car size={22} color={CARD} /></View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.heroName}>{vehicle.make} {vehicle.model}</Text>
                  <Text style={styles.heroSub}>{[vehicle.year, vehicle.color, vehicle.plateNumber].filter(Boolean).join(' · ') || 'Your ride'}</Text>
                </View>
              </View>
              {meta ? <View style={styles.fuelPill}><Text style={styles.fuelPillText}>{meta.label}</Text></View> : null}
            </LinearGradient>

            <View style={styles.specGrid}>
              <Spec label="Tank" value={`${num(vehicle.tankCapacity)} L`} />
              <Spec label="Efficiency" value={`${num(vehicle.avgEfficiency)} km/L`} />
              <Spec label="Odometer" value={vehicle.currentOdometer != null ? `${vehicle.currentOdometer.toLocaleString()} km` : '—'} />
            </View>

            <Text style={styles.section}>From your fuel logs</Text>
            <View style={styles.statGrid}>
              <Stat label="Total fuel" value={`${num(stats?.totalLitres).toFixed(0)} L`} />
              <Stat label="Total spent" value={rm(stats?.totalSpend)} />
              <Stat label="Avg efficiency" value={stats?.avgEfficiency != null ? `${num(stats.avgEfficiency).toFixed(1)} km/L` : '—'} />
              <Stat label="Best fill" value={best != null ? `${best.toFixed(1)} km/L` : '—'} accent />
              <Stat label="Worst fill" value={worst != null ? `${worst.toFixed(1)} km/L` : '—'} />
              <Stat label="Logged fills" value={`${logs.length}`} />
            </View>

            <Pressable style={styles.outlineBtn} onPress={() => router.push('/(onboarding)/vehicle')}>
              <Pencil size={16} color={FP_PRIMARY} /><Text style={styles.outlineText}>  Edit / replace vehicle</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => router.push('/(onboarding)/vehicle')}>
              <Plus size={16} color={CARD} /><Text style={styles.addText}>  Add another vehicle</Text>
            </Pressable>
            {vehicleCount > 1 ? <Text style={styles.note}>{vehicleCount} vehicles on file · primary shown</Text> : null}
          </>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyCircle}><Car size={30} color={FP_CARPOOL} /></View>
            <Text style={styles.emptyTitle}>No vehicle yet</Text>
            <Text style={styles.emptySub}>Add your vehicle to unlock fuel tracking and ride posting.</Text>
            <Pressable style={styles.addBtn} onPress={() => router.push('/(onboarding)/vehicle')}>
              <Plus size={16} color={CARD} /><Text style={styles.addText}>  Add vehicle</Text>
            </Pressable>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return <View style={styles.spec}><Text style={styles.specValue}>{value}</Text><Text style={styles.specLabel}>{label}</Text></View>;
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <View style={styles.statCard}><Text style={[styles.statValue, accent && { color: FP_PRIMARY }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { paddingHorizontal: 16 },
  hero: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: CARD, fontSize: 18, fontWeight: '800' },
  heroSub: { color: FP_CARPOOL_LIGHT, fontSize: 12, marginTop: 2 },
  fuelPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  fuelPillText: { color: CARD, fontSize: 11, fontWeight: '800' },
  specGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  spec: { flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, alignItems: 'center' },
  specValue: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  specLabel: { fontSize: 10, color: TEXT_SECONDARY, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 22, marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '31.5%', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 10, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  statLabel: { fontSize: 9, color: TEXT_SECONDARY, marginTop: 3, textAlign: 'center' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 13, marginTop: 8 },
  outlineText: { color: FP_PRIMARY, fontSize: 14, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  addText: { color: CARD, fontSize: 14, fontWeight: '800' },
  note: { fontSize: 11, color: TEXT_LIGHT, textAlign: 'center', marginTop: 10 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 6, marginBottom: 18, maxWidth: 260 },
});
