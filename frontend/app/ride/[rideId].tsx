// app/ride/[rideId].tsx — full ride detail: map, driver, fare, request / driver controls, rating.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Star, ShieldCheck, Users, Navigation, MapPin, Flag, WifiOff, RefreshCw,
} from 'lucide-react-native';
import LeafletMap from '../../src/components/common/LeafletMap';
import { statusMeta, fmtRideTime } from '../../src/components/ride/rideUtils';
import useAuth from '../../src/hooks/useAuth';
import { carpoolApi, userApi } from '../../src/services/api';
import type { RideFull } from '../../src/services/api';
import { CAMPUS_LOCATIONS } from '../../src/constants';
import { num, rm, initialsOf } from '../../src/utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_SECONDARY, FP_CARPOOL, FP_DANGER, FP_WARNING,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';

interface Place { label: string; lat: number; lng: number; }

export default function RideDetail() {
  const router = useRouter();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { user } = useAuth();

  const [ride, setRide] = useState<RideFull | null>(null);
  const [myId, setMyId] = useState<number | undefined>(user?.userId);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [pickup, setPickup] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [rRes, meRes] = await Promise.allSettled([carpoolApi.getRide(Number(rideId)), userApi.getMe()]);
      if (rRes.status !== 'fulfilled') throw rRes.reason;
      setRide(rRes.value.data);
      if (meRes.status === 'fulfilled') setMyId(meRes.value.data?.id);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, [rideId]);

  useEffect(() => { load(); }, [load]);

  if (status === 'loading') {
    return <Center><ActivityIndicator color={FP_PRIMARY} /></Center>;
  }
  if (status === 'error' || !ride) {
    return (
      <Center>
        <WifiOff size={26} color={TEXT_LIGHT} />
        <Text style={styles.errTitle}>Couldn't load this ride</Text>
        <Pressable style={styles.retry} onPress={load}><RefreshCw size={15} color={CARD} /><Text style={styles.retryText}>Retry</Text></Pressable>
      </Center>
    );
  }

  const isDriver = ride.driver?.id != null && ride.driver.id === myId;
  const sm = statusMeta(ride.status);
  const seats = (ride.maxSeats ?? 0) - (ride.confirmedPassengers ?? 0);
  const oLat = num(ride.originLat), oLng = num(ride.originLng);
  const dLat = num(ride.destinationLat), dLng = num(ride.destinationLng);
  const grab = num(ride.estimatedDistanceKm) > 0 ? 2.5 + num(ride.estimatedDistanceKm) * 0.9 : 0;

  const markers = [
    ...(oLat ? [{ id: 'o', lat: oLat, lng: oLng, color: 'green' as const, popup: ride.originLabel ?? 'Origin' }] : []),
    ...(dLat ? [{ id: 'd', lat: dLat, lng: dLng, color: 'red' as const, popup: ride.destinationLabel ?? 'Destination' }] : []),
  ];

  const request = async () => {
    if (!pickup) return Alert.alert('Pickup', 'Choose your pickup point first.');
    setBusy(true);
    try {
      await carpoolApi.joinRide(ride.id, {
        pickupLat: pickup.lat, pickupLng: pickup.lng, pickupLabel: pickup.label,
        dropoffLat: dLat, dropoffLng: dLng, dropoffLabel: ride.destinationLabel,
      });
      setRequested(true);
      Alert.alert('Requested', 'Your ride request has been sent to the driver.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  const driverAction = async (fn: () => Promise<any>, after?: (r: RideFull) => void) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.data) { setRide(res.data); after?.(res.data); }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const openMaps = (urlFromRide?: string) => {
    const url = urlFromRide || ride.googleMapsUrl ||
      `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
        <Text style={styles.topTitle}>Ride Detail</Text>
        <View style={[styles.chip, { backgroundColor: sm.bg }]}><Text style={[styles.chipText, { color: sm.color }]}>{sm.label}</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* map */}
        <View style={styles.mapWrap}>
          <LeafletMap center={{ lat: oLat || 1.5577, lng: oLng || 103.6388 }} zoom={14} height={200} markers={markers} />
        </View>

        <View style={styles.body}>
          {/* route */}
          <View style={styles.routeCard}>
            <View style={styles.routeLine}>
              <View style={[styles.dot, { borderColor: FP_SECONDARY }]} />
              <View style={styles.line} />
              <View style={[styles.dot, { borderColor: FP_DANGER }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeText}>{ride.originLabel ?? 'Origin'}</Text>
              <Text style={styles.routeMeta}>{fmtRideTime(ride.departureTime)}</Text>
              <Text style={[styles.routeText, { marginTop: 10 }]}>{ride.destinationLabel ?? 'Destination'}</Text>
              <Text style={styles.routeMeta}>{num(ride.estimatedDistanceKm).toFixed(1)} km</Text>
            </View>
          </View>

          {/* driver */}
          <View style={styles.card}>
            <View style={styles.rowCenter}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(ride.driver?.name)}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.rowCenter}>
                  <Text style={styles.driverName}>{ride.driver?.name ?? 'Driver'}</Text>
                  {ride.driver?.isVerified ? <ShieldCheck size={14} color={FP_PRIMARY} style={{ marginLeft: 4 }} /> : null}
                </View>
                <View style={[styles.rowCenter, { marginTop: 2 }]}>
                  <Star size={12} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.driverMeta}>  {num(ride.driver?.driverRating).toFixed(1)} · {ride.vehicle?.make} {ride.vehicle?.model} {ride.vehicle?.color ? `(${ride.vehicle.color})` : ''}</Text>
                </View>
              </View>
              <View style={styles.seatBox}>
                <Users size={14} color={FP_CARPOOL} />
                <Text style={styles.seatNum}>{seats}</Text>
                <Text style={styles.seatLabel}>left</Text>
              </View>
            </View>
          </View>

          {/* fare */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare</Text>
            <View style={styles.fareRow}><Text style={styles.fareLabel}>Per passenger</Text><Text style={styles.fareValue}>{rm(ride.estimatedFarePerPerson)}</Text></View>
            {grab > 0 && (
              <View style={styles.fareRow}><Text style={styles.fareLabel}>Grab estimate</Text><Text style={[styles.fareValue, { color: TEXT_LIGHT, textDecorationLine: 'line-through' }]}>{rm(grab)}</Text></View>
            )}
            {grab > num(ride.estimatedFarePerPerson) && (
              <View style={styles.savePill}><Text style={styles.saveText}>You save {rm(grab - num(ride.estimatedFarePerPerson))} vs Grab</Text></View>
            )}
          </View>

          {/* passenger: pickup + request */}
          {!isDriver && (ride.status === 'OPEN' || ride.status === 'FULL') && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your pickup point</Text>
              <View style={styles.chipRow}>
                {CAMPUS_LOCATIONS.slice(0, 5).map((c) => (
                  <Pressable key={c.label} onPress={() => setPickup({ label: c.label, lat: c.lat, lng: c.lng })} style={[styles.placeChip, pickup?.label === c.label && styles.placeChipActive]}>
                    <Text style={[styles.placeChipText, pickup?.label === c.label && { color: CARD }]} numberOfLines={1}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.primaryBtn, (requested || seats <= 0) && styles.btnDisabled]} onPress={request} disabled={busy || requested || seats <= 0}>
                {busy ? <ActivityIndicator color={CARD} /> : <Text style={styles.primaryBtnText}>{requested ? 'Request sent ✓' : seats <= 0 ? 'Ride full' : 'Request this ride'}</Text>}
              </Pressable>
            </View>
          )}

          {/* driver controls */}
          {isDriver && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Driver controls</Text>
              <Text style={styles.driverHint}>{ride.confirmedPassengers ?? 0} of {ride.maxSeats ?? 0} seats confirmed</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {(ride.status === 'OPEN' || ride.status === 'FULL') && (
                  <>
                    <Pressable style={styles.primaryBtn} onPress={() => driverAction(() => carpoolApi.startRide(ride.id), (r) => openMaps(r.googleMapsUrl))} disabled={busy}>
                      <Navigation size={16} color={CARD} /><Text style={styles.primaryBtnText}>  Start & open Maps</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => driverAction(() => carpoolApi.cancelRide(ride.id))} disabled={busy}>
                      <Text style={styles.dangerText}>Cancel ride</Text>
                    </Pressable>
                  </>
                )}
                {ride.status === 'IN_PROGRESS' && (
                  <>
                    <Pressable style={styles.outlineBtn} onPress={() => openMaps()}><Navigation size={16} color={FP_PRIMARY} /><Text style={styles.outlineText}>  Open in Google Maps</Text></Pressable>
                    <Pressable style={styles.primaryBtn} onPress={() => driverAction(() => carpoolApi.completeRide(ride.id))} disabled={busy}><Text style={styles.primaryBtnText}>Complete ride</Text></Pressable>
                  </>
                )}
              </View>
            </View>
          )}

          {/* passenger rate after completion */}
          {!isDriver && ride.status === 'COMPLETED' && (
            <Pressable style={styles.primaryBtn} onPress={() => setRateOpen(true)}>
              <Star size={16} color={CARD} fill={CARD} /><Text style={styles.primaryBtnText}>  Rate your driver</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <RateModal
        visible={rateOpen}
        onClose={() => setRateOpen(false)}
        onSubmit={async (rating) => {
          try {
            if (ride.driver?.id != null) await carpoolApi.rateUser(ride.id, rating, ride.driver.id);
            Alert.alert('Thanks!', 'Your rating has been submitted.');
          } catch {
            Alert.alert('Error', 'Could not submit rating.');
          } finally {
            setRateOpen(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.safe}><View style={styles.center}>{children}</View></SafeAreaView>;
}

function RateModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (rating: number, note: string) => void }) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Rate your ride</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} hitSlop={6}>
                <Star size={34} color="#FBBF24" fill={s <= rating ? '#FBBF24' : 'transparent'} />
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor={TEXT_LIGHT} multiline />
          <Pressable style={styles.primaryBtn} onPress={() => onSubmit(rating, note)}><Text style={styles.primaryBtnText}>Submit</Text></Pressable>
          <Pressable onPress={onClose} style={{ marginTop: 10 }}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 10, fontWeight: '800' },
  mapWrap: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  body: { padding: 16, gap: 12 },
  routeCard: { flexDirection: 'row', gap: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },
  routeLine: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, backgroundColor: CARD, marginTop: 3 },
  line: { flex: 1, width: 2, backgroundColor: BORDER, marginVertical: 3, minHeight: 26 },
  routeText: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  routeMeta: { fontSize: 12, color: TEXT_LIGHT, marginTop: 2 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: FP_SECONDARY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: CARD, fontSize: 16, fontWeight: '800' },
  driverName: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  driverMeta: { fontSize: 12, color: TEXT_SECONDARY },
  seatBox: { alignItems: 'center', backgroundColor: FP_PRIMARY_LIGHT, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  seatNum: { fontSize: 16, fontWeight: '800', color: FP_CARPOOL },
  seatLabel: { fontSize: 9, color: FP_CARPOOL, fontWeight: '700' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  fareLabel: { fontSize: 13, color: TEXT_SECONDARY },
  fareValue: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  savePill: { backgroundColor: FP_PRIMARY_LIGHT, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 10 },
  saveText: { color: FP_PRIMARY, fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  placeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, maxWidth: 150 },
  placeChipActive: { backgroundColor: FP_CARPOOL, borderColor: FP_CARPOOL },
  placeChipText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 14 },
  primaryBtnText: { color: CARD, fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
  dangerBtn: { borderWidth: 1.5, borderColor: FP_DANGER, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  dangerText: { color: FP_DANGER, fontSize: 14, fontWeight: '800' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 13 },
  outlineText: { color: FP_PRIMARY, fontSize: 14, fontWeight: '800' },
  driverHint: { fontSize: 12, color: TEXT_SECONDARY },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: { backgroundColor: CARD, borderRadius: 22, padding: 22, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  noteInput: { width: '100%', minHeight: 64, backgroundColor: '#F3F3F5', borderRadius: 12, padding: 12, fontSize: 14, color: TEXT_PRIMARY, marginBottom: 16, textAlignVertical: 'top' },
  cancelText: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
});
