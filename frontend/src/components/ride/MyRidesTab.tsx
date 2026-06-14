// src/components/ride/MyRidesTab.tsx — GET /rides/mine → as-driver + as-passenger.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Car, User, RefreshCw, WifiOff } from 'lucide-react-native';
import { statusMeta, fmtRideTime } from './rideUtils';
import { carpoolApi } from '../../services/api';
import type { RideFull, RideRequestFull } from '../../services/api';
import { rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_CARPOOL, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

export default function MyRidesTab() {
  const router = useRouter();
  const [asDriver, setAsDriver] = useState<RideFull[]>([]);
  const [asPassenger, setAsPassenger] = useState<RideRequestFull[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus('loading');
    try {
      const res = await carpoolApi.getMyRides();
      setAsDriver(res.data?.asDriver ?? []);
      setAsPassenger(res.data?.asPassenger ?? []);
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (status === 'loading') return <View style={styles.center}><ActivityIndicator color={FP_PRIMARY} /></View>;
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <WifiOff size={26} color={TEXT_LIGHT} />
        <Text style={styles.errTitle}>Couldn't load your rides</Text>
        <Pressable style={styles.retry} onPress={() => load()}><RefreshCw size={15} color={CARD} /><Text style={styles.retryText}>Retry</Text></Pressable>
      </View>
    );
  }

  const empty = asDriver.length === 0 && asPassenger.length === 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={FP_PRIMARY} />}
    >
      {empty ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>You have no rides yet. Find or offer a ride to get started.</Text></View>
      ) : null}

      {asDriver.length > 0 && (
        <>
          <View style={styles.sectionRow}><Car size={15} color={FP_CARPOOL} /><Text style={styles.section}>  As driver</Text></View>
          <View style={{ gap: 10 }}>
            {asDriver.map((r) => {
              const sm = statusMeta(r.status);
              return (
                <Pressable key={r.id} style={styles.card} onPress={() => router.push({ pathname: '/ride/[rideId]', params: { rideId: String(r.id) } })}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.route} numberOfLines={1}>{r.originLabel ?? 'Origin'} → {r.destinationLabel ?? 'Dest'}</Text>
                    <View style={[styles.chip, { backgroundColor: sm.bg }]}><Text style={[styles.chipText, { color: sm.color }]}>{sm.label}</Text></View>
                  </View>
                  <Text style={styles.time}>{fmtRideTime(r.departureTime)}</Text>
                  <Text style={styles.meta}>{r.confirmedPassengers ?? 0}/{r.maxSeats ?? 0} passengers · {rm(r.estimatedFarePerPerson)}/pax</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {asPassenger.length > 0 && (
        <>
          <View style={[styles.sectionRow, { marginTop: 22 }]}><User size={15} color={FP_PRIMARY} /><Text style={styles.section}>  As passenger</Text></View>
          <View style={{ gap: 10 }}>
            {asPassenger.map((req) => {
              const sm = statusMeta(req.status);
              const r = req.ride;
              return (
                <Pressable key={req.id} style={styles.card} onPress={() => r && router.push({ pathname: '/ride/[rideId]', params: { rideId: String(r.id) } })}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.route} numberOfLines={1}>{r?.originLabel ?? req.pickupLabel ?? 'Pickup'} → {r?.destinationLabel ?? req.dropoffLabel ?? 'Dropoff'}</Text>
                    <View style={[styles.chip, { backgroundColor: sm.bg }]}><Text style={[styles.chipText, { color: sm.color }]}>{sm.label}</Text></View>
                  </View>
                  <Text style={styles.time}>{fmtRideTime(r?.departureTime)}</Text>
                  <Text style={styles.meta}>Driver: {r?.driver?.name ?? '—'} · {rm(req.fareAmount ?? r?.estimatedFarePerPerson)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  errTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
  scroll: { padding: 16 },
  emptyBox: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 18 },
  emptyText: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  section: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 10, fontWeight: '800' },
  time: { fontSize: 12, color: TEXT_LIGHT, marginTop: 4 },
  meta: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 6, fontWeight: '600' },
});
