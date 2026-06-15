// src/components/ride/FindRide.tsx — passenger view: search + AI match results.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, ShieldCheck, Search, MapPin, Flag, Users } from 'lucide-react-native';
import { carpoolApi } from '../../services/api';
import type { RideMatch } from '../../services/api';
import { CAMPUS_LOCATIONS } from '../../constants';
import { num, rm, initialsOf } from '../../utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_SECONDARY, FP_CARPOOL, FP_DANGER,
  CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

interface Coords { lat: number; lng: number; }
interface Place { label: string; lat: number; lng: number; }

const CHIPS = CAMPUS_LOCATIONS;

function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

// LocalDateTime string in the device's local time (matches how ride departureTime
// is created and stored — NOT toISOString(), which is UTC and would be hours off).
function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function FindRide({ userLoc }: { userLoc: Coords | null }) {
  const router = useRouter();
  const [from, setFrom] = useState<Place | null>(userLoc ? { label: 'Current location', ...userLoc } : null);
  const [to, setTo] = useState<Place | null>(null);
  const [results, setResults] = useState<RideMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setError(null);
    if (!from) return setError('Choose a pickup point.');
    if (!to) return setError('Choose a destination.');
    setLoading(true);
    try {
      const res = await carpoolApi.findMatches({
        pickupLat: from.lat,
        pickupLng: from.lng,
        dropoffLat: to.lat,
        dropoffLng: to.lng,
        time: nowLocalIso(), // LocalDateTime, "now" (device-local, not UTC)
      });
      setResults(res.data ?? []);
    } catch (e: any) {
      setError(e?.response ? 'Search failed. Try again.' : "Can't reach the server.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* From */}
        <Text style={styles.label}><MapPin size={12} color={FP_SECONDARY} /> Pickup</Text>
        <View style={styles.chipRow}>
          {userLoc && (
            <Chip label="Current" active={from?.label === 'Current location'} onPress={() => setFrom({ label: 'Current location', ...userLoc })} />
          )}
          {CHIPS.map((c) => (
            <Chip key={`f${c.label}`} label={c.label} active={from?.label === c.label} onPress={() => setFrom({ label: c.label, lat: c.lat, lng: c.lng })} />
          ))}
        </View>

        {/* To */}
        <Text style={styles.label}><Flag size={12} color={FP_DANGER} /> Destination</Text>
        <View style={styles.chipRow}>
          {CHIPS.map((c) => (
            <Chip key={`t${c.label}`} label={c.label} active={to?.label === c.label} onPress={() => setTo({ label: c.label, lat: c.lat, lng: c.lng })} />
          ))}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.nowChip}><Text style={styles.nowText}>Now</Text></View>
          <Pressable
            style={styles.searchBtn}
            onPress={search}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Finding ride matches' : 'Find ride matches'}
          >
            {loading ? <ActivityIndicator color={CARD} size="small" /> : <Search size={16} color={CARD} />}
            <Text style={styles.searchBtnText}>{loading ? 'Matching…' : 'Find matches'}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {results !== null && (
          results.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyCircle}><Users size={28} color={FP_CARPOOL} /></View>
              <Text style={styles.emptyTitle}>No rides found near you</Text>
              <Text style={styles.emptySub}>Try a different time, or offer your own ride.</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {results.map((m) => <MatchCard key={m.rideId} m={m} onPress={() => router.push({ pathname: '/ride/[rideId]', params: { rideId: String(m.rideId) } })} />)}
            </View>
          )
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
    >
      <Text style={[styles.chipText, active && { color: CARD }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const MatchCard = React.memo(function MatchCard({ m, onPress }: { m: RideMatch; onPress: () => void }) {
  const seats = m.availableSeats ?? 0;
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ride with ${m.driverName ?? 'driver'}, ${Math.round(m.matchScore ?? 0)}% match, ${rm(m.farePerPerson)}, ${seats} seat${seats === 1 ? '' : 's'} available`}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(m.driverName)}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowCenter}>
            <Text style={styles.name} numberOfLines={1}>{m.driverName ?? 'Driver'}</Text>
            <ShieldCheck size={13} color={FP_PRIMARY} style={{ marginLeft: 4 }} />
            <View style={styles.matchPill}><Text style={styles.matchText}>{Math.round(m.matchScore ?? 0)}% match</Text></View>
          </View>
          <View style={[styles.rowCenter, { marginTop: 2 }]}>
            <Star size={11} color="#FBBF24" fill="#FBBF24" />
            <Text style={styles.rating}>{num(m.driverRating).toFixed(1)}</Text>
            <Text style={styles.sep}> · </Text>
            <Text style={styles.car}>{m.vehicleMake} {m.vehicleModel}</Text>
          </View>
        </View>
      </View>

      {/* route */}
      <View style={styles.route}>
        <View style={styles.routeLine}>
          <View style={[styles.dot, { borderColor: FP_SECONDARY }]} />
          <View style={styles.line} />
          <View style={[styles.dot, { borderColor: FP_DANGER }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeText} numberOfLines={1}>{m.originLabel ?? 'Pickup'}</Text>
          <Text style={styles.routeTime}>{fmtTime(m.departureTime)}</Text>
          <Text style={[styles.routeText, { marginTop: 6 }]} numberOfLines={1}>{m.destinationLabel ?? 'Destination'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.fare}>{rm(m.farePerPerson)}</Text>
          {num(m.savedVsGrab) > 0 ? <Text style={styles.saved}>save {rm(m.savedVsGrab)} vs Grab</Text> : null}
        </View>
        <View style={styles.rowCenter}>
          <View style={styles.seatPill}><Text style={styles.seatText}>{seats} seat{seats === 1 ? '' : 's'}</Text></View>
          <View style={styles.reqBtn}><Text style={styles.reqText}>Request</Text></View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  scroll: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, maxWidth: 160 },
  chipActive: { backgroundColor: FP_CARPOOL, borderColor: FP_CARPOOL },
  chipText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  nowChip: { backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  nowText: { fontSize: 13, fontWeight: '800', color: FP_PRIMARY },
  searchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingVertical: 13, borderRadius: 12 },
  searchBtnText: { color: CARD, fontSize: 14, fontWeight: '800' },
  error: { color: FP_DANGER, fontSize: 13, fontWeight: '600', marginTop: 12 },

  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: FP_PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },

  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: FP_SECONDARY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: CARD, fontSize: 14, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, maxWidth: '50%' },
  matchPill: { marginLeft: 'auto', backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  matchText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY },
  rating: { fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY, marginLeft: 3 },
  sep: { color: TEXT_LIGHT, fontSize: 11 },
  car: { fontSize: 11, color: TEXT_SECONDARY },
  route: { flexDirection: 'row', gap: 10, marginTop: 12 },
  routeLine: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, backgroundColor: CARD, marginTop: 2 },
  line: { flex: 1, width: 2, backgroundColor: BORDER, marginVertical: 2, minHeight: 18 },
  routeText: { fontSize: 12, fontWeight: '700', color: TEXT_PRIMARY },
  routeTime: { fontSize: 11, color: TEXT_LIGHT },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  fare: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  saved: { fontSize: 11, color: FP_PRIMARY, fontWeight: '700' },
  seatPill: { backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 8 },
  seatText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY },
  reqBtn: { backgroundColor: TEXT_PRIMARY, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  reqText: { color: CARD, fontSize: 12, fontWeight: '800' },
});
