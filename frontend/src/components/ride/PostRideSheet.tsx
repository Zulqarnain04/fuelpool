// src/components/ride/PostRideSheet.tsx — driver posts a ride (slide-up modal).
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Minus, Plus, MapPin, Flag, Clock } from 'lucide-react-native';
import { carpoolApi } from '../../services/api';
import type { Vehicle, RidePostRequest } from '../../services/api';
import { CAMPUS_LOCATIONS } from '../../constants';
import { num, rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_CARPOOL, FP_DANGER, FP_SECONDARY,
  CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

interface Place { label: string; lat: number; lng: number; }

function haversineKm(a: Place, b: Place) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pad(n: number) { return String(n).padStart(2, '0'); }
const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 5; h <= 22; h++) for (const m of [0, 15, 30, 45]) out.push(`${pad(h)}:${pad(m)}`);
  return out;
})();

export default function PostRideSheet({
  visible,
  vehicles,
  onClose,
  onPosted,
}: {
  visible: boolean;
  vehicles: Vehicle[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [time, setTime] = useState('07:45');
  const [timeOpen, setTimeOpen] = useState(false);
  const [seats, setSeats] = useState(3);
  const [vehicleId, setVehicleId] = useState<number | null>(vehicles.find((v) => v.primary)?.id ?? vehicles[0]?.id ?? null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distanceKm = useMemo(() => (origin && dest ? haversineKm(origin, dest) : 0), [origin, dest]);
  // Rough fuel-cost estimate split across driver + passengers.
  const RM_PER_KM = 0.45;
  const farePerPax = distanceKm > 0 ? (distanceKm * RM_PER_KM) / (seats + 1) : 0;
  const grabFare = distanceKm > 0 ? 2.5 + distanceKm * 0.9 : 0;

  const reset = () => {
    setOrigin(null); setDest(null); setTime('07:45'); setSeats(3); setError(null);
  };

  const post = async () => {
    setError(null);
    if (!origin) return setError('Choose an origin.');
    if (!dest) return setError('Choose a destination.');
    if (!vehicleId) return setError('Select a vehicle.');

    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const dep = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (dep.getTime() < now.getTime()) dep.setDate(dep.getDate() + 1); // next day if past

    const payload: RidePostRequest = {
      originLat: origin.lat, originLng: origin.lng, originLabel: origin.label,
      destinationLat: dest.lat, destinationLng: dest.lng, destinationLabel: dest.label,
      departureTime: `${dep.getFullYear()}-${pad(dep.getMonth() + 1)}-${pad(dep.getDate())}T${pad(h)}:${pad(m)}:00`,
      maxSeats: seats,
      vehicleId,
      estimatedDistanceKm: parseFloat(distanceKm.toFixed(2)),
    };
    setPosting(true);
    try {
      await carpoolApi.postRide(payload);
      Alert.alert('Ride posted', 'Passengers can now request your ride.');
      reset();
      onPosted();
      onClose();
    } catch (e: any) {
      setError(e?.response ? 'Could not post the ride.' : "Can't reach the server.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Post a Ride</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}><MapPin size={12} color={FP_SECONDARY} /> Origin</Text>
            <View style={styles.chipRow}>
              {CAMPUS_LOCATIONS.map((c) => (
                <Place key={`o${c.label}`} label={c.label} active={origin?.label === c.label} onPress={() => setOrigin({ label: c.label, lat: c.lat, lng: c.lng })} />
              ))}
            </View>

            <Text style={styles.label}><Flag size={12} color={FP_DANGER} /> Destination</Text>
            <View style={styles.chipRow}>
              {CAMPUS_LOCATIONS.map((c) => (
                <Place key={`d${c.label}`} label={c.label} active={dest?.label === c.label} onPress={() => setDest({ label: c.label, lat: c.lat, lng: c.lng })} />
              ))}
            </View>

            <Text style={styles.label}>Departure time</Text>
            <Pressable style={styles.timeField} onPress={() => setTimeOpen((o) => !o)}>
              <View style={styles.rowCenter}><Clock size={16} color={TEXT_LIGHT} /><Text style={styles.timeText}>  {time}</Text></View>
              <Text style={styles.timeHint}>{timeOpen ? 'Close' : 'Change'}</Text>
            </Pressable>
            {timeOpen && (
              <View style={styles.slotWrap}>
                {TIME_SLOTS.map((t) => (
                  <Pressable key={t} onPress={() => { setTime(t); setTimeOpen(false); }} style={[styles.slot, time === t && styles.slotActive]}>
                    <Text style={[styles.slotText, time === t && { color: CARD }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Seats offered</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.max(1, s - 1))}><Minus size={18} color={TEXT_PRIMARY} /></Pressable>
              <Text style={styles.stepValue}>{seats}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.min(4, s + 1))}><Plus size={18} color={TEXT_PRIMARY} /></Pressable>
            </View>

            {vehicles.length > 1 && (
              <>
                <Text style={styles.label}>Vehicle</Text>
                <View style={styles.chipRow}>
                  {vehicles.map((v) => (
                    <Pressable key={v.id} onPress={() => setVehicleId(v.id)} style={[styles.chip, vehicleId === v.id && styles.chipActive]}>
                      <Text style={[styles.chipText, vehicleId === v.id && { color: CARD }]}>{v.make} {v.model}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* fare preview */}
            <View style={styles.fareCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.fareLabel}>Est. distance</Text>
                <Text style={styles.fareValue}>{distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.fareLabel}>Fare per passenger</Text>
                <Text style={[styles.fareValue, { color: FP_PRIMARY }]}>{farePerPax > 0 ? rm(farePerPax) : '—'}</Text>
              </View>
              {grabFare > 0 ? <Text style={styles.fareNote}>~{rm(grabFare)} on Grab · finalised when posted</Text> : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.postBtn} onPress={post} disabled={posting}>
              {posting ? <ActivityIndicator color={CARD} /> : <Text style={styles.postText}>Post Ride</Text>}
            </Pressable>
            <View style={{ height: 12 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Place({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: CARD }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, maxWidth: 170 },
  chipActive: { backgroundColor: FP_CARPOOL, borderColor: FP_CARPOOL },
  chipText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  timeField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F3F5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  timeText: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  timeHint: { fontSize: 12, color: FP_PRIMARY, fontWeight: '700' },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  slot: { width: '22.5%', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  slotActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  slotText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, minWidth: 30, textAlign: 'center' },
  fareCard: { backgroundColor: FP_PRIMARY_LIGHT, borderRadius: 14, padding: 14, marginTop: 18, gap: 8 },
  fareLabel: { fontSize: 13, color: TEXT_SECONDARY },
  fareValue: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  fareNote: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  error: { color: FP_DANGER, fontSize: 13, fontWeight: '600', marginTop: 12 },
  postBtn: { backgroundColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  postText: { color: CARD, fontSize: 15, fontWeight: '800' },
});
