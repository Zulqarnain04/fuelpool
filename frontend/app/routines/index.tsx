// app/routines/index.tsx — manage commute routines (auto-matching schedules).
// (route: /routines)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Clock, CalendarClock, RefreshCw, WifiOff } from 'lucide-react-native';
import { carpoolApi } from '../../src/services/api';
import type { Routine } from '../../src/services/api';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_CARPOOL, FP_DANGER, BACKGROUND, CARD, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';

const DAY_SHORT: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await carpoolApi.getRoutines();
      setRoutines(res.data ?? []);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, []);

  // reload when returning from the add/edit screen
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (r: Routine) => {
    setRoutines((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    try {
      await carpoolApi.toggleRoutine(r.id);
    } catch {
      load(); // revert on failure
    }
  };

  const remove = (r: Routine) => {
    Alert.alert('Delete routine', `Remove "${r.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setRoutines((prev) => prev.filter((x) => x.id !== r.id));
          try { await carpoolApi.deleteRoutine(r.id); } catch { load(); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back"><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
        <Text style={styles.topTitle}>Routines</Text>
        <View style={{ width: 22 }} />
      </View>

      {status === 'loading' ? (
        <View style={styles.center}><ActivityIndicator color={FP_PRIMARY} /></View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <WifiOff size={26} color={TEXT_LIGHT} />
          <Text style={styles.errTitle}>Couldn't load routines</Text>
          <Pressable style={styles.retry} onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading routines"><RefreshCw size={15} color={CARD} /><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {routines.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.circle}><CalendarClock size={28} color={FP_CARPOOL} /></View>
              <Text style={styles.emptyTitle}>No routines yet</Text>
              <Text style={styles.emptySub}>Add a recurring commute so FuelPool can auto-match you with carpools.</Text>
            </View>
          ) : (
            routines.map((r) => {
              const days = (r.daysOfWeek ?? '').split(',').filter(Boolean).map((d) => DAY_SHORT[d] ?? d).join(' ');
              return (
                <Pressable
                  key={r.id}
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/routines/new' as never, params: { id: String(r.id) } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Routine ${r.name}, ${r.originLabel ?? 'Origin'} to ${r.destLabel ?? 'Destination'}`}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.name}>{r.name}</Text>
                    <Switch
                      value={!!r.active}
                      onValueChange={() => toggle(r)}
                      trackColor={{ false: BORDER, true: FP_PRIMARY }}
                      thumbColor={CARD}
                      accessibilityLabel={`${r.name} active`}
                    />
                  </View>
                  <Text style={styles.route} numberOfLines={1}>{r.originLabel ?? 'Origin'} → {r.destLabel ?? 'Destination'}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.rowCenter}><Clock size={13} color={TEXT_LIGHT} /><Text style={styles.meta}>  {(r.departureTime ?? '').slice(0, 5)}</Text></View>
                    <Text style={styles.meta}>{days}</Text>
                    <View style={styles.rolePill}><Text style={styles.roleText}>{r.rolePreference}</Text></View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.autoText, { color: r.autoRequest ? FP_PRIMARY : TEXT_LIGHT }]}>
                      {r.autoRequest ? '⚡ Auto-request on' : 'Auto-request off'}
                    </Text>
                    <Pressable onPress={() => remove(r)} hitSlop={8} style={styles.delBtn} accessibilityRole="button" accessibilityLabel={`Delete routine ${r.name}`}><Trash2 size={15} color={FP_DANGER} /></Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* '/routines/new' is a real route; cast works around a typed-routes gen quirk for this nested path. */}
      <Pressable style={styles.fab} onPress={() => router.push('/routines/new' as Href)} accessibilityRole="button" accessibilityLabel="Add routine">
        <Plus size={26} color={CARD} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
  scroll: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: FP_PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 6, maxWidth: 260 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  name: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  route: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  rolePill: { backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  autoText: { fontSize: 12, fontWeight: '700' },
  delBtn: { padding: 4 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: FP_PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: FP_PRIMARY, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
});
