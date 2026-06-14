// src/components/ride/OfferRide.tsx — driver view: post a ride + my posted rides.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Car, Users } from 'lucide-react-native';
import PostRideSheet from './PostRideSheet';
import { statusMeta, fmtRideTime } from './rideUtils';
import { vehicleApi, carpoolApi } from '../../services/api';
import type { Vehicle, RideFull } from '../../services/api';
import { rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_CARPOOL, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

export default function OfferRide({ onChanged }: { onChanged: () => void }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rides, setRides] = useState<RideFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.allSettled([vehicleApi.getVehicles(), carpoolApi.getMyRides()]);
      setVehicles(vRes.status === 'fulfilled' ? vRes.value.data ?? [] : []);
      setRides(mRes.status === 'fulfilled' ? mRes.value.data?.asDriver ?? [] : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={FP_PRIMARY} /></View>;
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.circle}><Car size={28} color={FP_CARPOOL} /></View>
        <Text style={styles.title}>Add a vehicle to offer rides</Text>
        <Text style={styles.sub}>You need a vehicle set up before posting a ride.</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/(onboarding)/vehicle')}>
          <Text style={styles.ctaText}>Set up vehicle</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.postCta} onPress={() => setSheet(true)}>
          <Plus size={20} color={CARD} />
          <Text style={styles.postCtaText}>Post a Ride</Text>
        </Pressable>

        <Text style={styles.section}>Your rides</Text>
        {rides.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No rides posted yet. Offer a seat to start saving fuel together.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rides.map((r) => {
              const sm = statusMeta(r.status);
              const seats = (r.maxSeats ?? 0) - (r.confirmedPassengers ?? 0);
              return (
                <Pressable key={r.id} style={styles.card} onPress={() => router.push({ pathname: '/ride/[rideId]', params: { rideId: String(r.id) } })}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.route} numberOfLines={1}>{r.originLabel ?? 'Origin'} → {r.destinationLabel ?? 'Dest'}</Text>
                    <View style={[styles.statusChip, { backgroundColor: sm.bg }]}><Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text></View>
                  </View>
                  <Text style={styles.time}>{fmtRideTime(r.departureTime)}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.rowCenter}><Users size={13} color={TEXT_SECONDARY} /><Text style={styles.pax}>  {r.confirmedPassengers ?? 0}/{r.maxSeats ?? 0} seats filled</Text></View>
                    <Text style={styles.fare}>{rm(r.estimatedFarePerPerson)}/pax · {seats} left</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <PostRideSheet
        visible={sheet}
        vehicles={vehicles}
        onClose={() => setSheet(false)}
        onPosted={() => { load(); onChanged(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  circle: { width: 70, height: 70, borderRadius: 35, backgroundColor: FP_PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  sub: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, textAlign: 'center' },
  cta: { backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 16 },
  ctaText: { color: CARD, fontSize: 14, fontWeight: '800' },
  scroll: { padding: 16 },
  postCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingVertical: 15, borderRadius: 14 },
  postCtaText: { color: CARD, fontSize: 15, fontWeight: '800' },
  section: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 22, marginBottom: 10 },
  emptyBox: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 18 },
  emptyText: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14 },
  route: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800' },
  time: { fontSize: 12, color: TEXT_LIGHT, marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  pax: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  fare: { fontSize: 12, fontWeight: '800', color: FP_PRIMARY },
});
