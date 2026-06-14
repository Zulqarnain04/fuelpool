// app/(tabs)/ride.tsx — Seat Optimizer (L2): Leaflet map + Find / Offer / My Rides tabs.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { CalendarClock } from 'lucide-react-native';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';
import LeafletMap from '../../src/components/common/LeafletMap';
import FindRide from '../../src/components/ride/FindRide';
import OfferRide from '../../src/components/ride/OfferRide';
import MyRidesTab from '../../src/components/ride/MyRidesTab';
import { carpoolApi } from '../../src/services/api';
import type { RideFull } from '../../src/services/api';
import { num } from '../../src/utils/format';
import { DEFAULT_LAT, DEFAULT_LNG } from '../../src/constants';
import { FP_PRIMARY, FP_CARPOOL, BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY } from '../../src/constants/colors';

const MAP_H = Math.round(Dimensions.get('window').height * 0.42);
type Tab = 'find' | 'offer' | 'mine';

interface Coords { lat: number; lng: number; }

export default function RideTab() {
  return (
    <ErrorBoundary>
      <RideTabContent />
    </ErrorBoundary>
  );
}

function RideTabContent() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('find');
  const [userLoc, setUserLoc] = useState<Coords | null>(null);
  const [openRides, setOpenRides] = useState<RideFull[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        /* ignore — fall back to campus default */
      }
    })();
  }, []);

  const loadOpenRides = useCallback(async () => {
    try {
      const center = userLoc ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
      const res = await carpoolApi.getRides({ status: 'OPEN', lat: center.lat, lng: center.lng, radius: 5000 });
      setOpenRides(res.data ?? []);
    } catch {
      setOpenRides([]);
    }
  }, [userLoc]);

  useEffect(() => {
    loadOpenRides();
  }, [loadOpenRides]);

  const center = userLoc ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  const markers = [
    ...openRides
      .filter((r) => num(r.originLat) !== 0)
      .map((r) => ({
        id: r.id,
        lat: num(r.originLat),
        lng: num(r.originLng),
        color: 'green' as const,
        popup: `${r.driver?.name ?? 'Driver'} · ${r.originLabel ?? ''}`,
      })),
    ...(userLoc ? [{ id: 'me', lat: userLoc.lat, lng: userLoc.lng, color: 'blue' as const, popup: 'You' }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Map (top ~42%) */}
      <View style={[styles.mapWrap, { height: MAP_H }]}>
        <LeafletMap
          center={center}
          zoom={14}
          height={MAP_H}
          markers={markers}
          onMarkerPress={(id) => {
            if (id !== 'me') router.push({ pathname: '/ride/[rideId]', params: { rideId: String(id) } });
          }}
        />
        <View style={styles.mapHeader} pointerEvents="box-none">
          <View style={styles.mapTitlePill}>
            <Text style={styles.mapTitle}>Seat Optimizer</Text>
            <View style={styles.l2Badge}><Text style={styles.l2Text}>L2</Text></View>
          </View>
          <Pressable style={styles.routineBtn} onPress={() => router.push('/routines')} accessibilityRole="button" accessibilityLabel="Open carpool routines">
            <CalendarClock size={20} color={FP_CARPOOL} />
          </Pressable>
        </View>
        {openRides.length > 0 && (
          <View style={styles.ridePill}>
            <Text style={styles.ridePillText}>{openRides.length} open ride{openRides.length === 1 ? '' : 's'} nearby</Text>
          </View>
        )}
      </View>

      {/* Tab strip */}
      <View style={styles.tabStrip}>
        {([
          { id: 'find', label: 'Find Ride' },
          { id: 'offer', label: 'Offer Ride' },
          { id: 'mine', label: 'My Rides' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} tab${tab === t.id ? ', selected' : ''}`}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {tab === 'find' && <FindRide userLoc={userLoc} />}
        {tab === 'offer' && <OfferRide onChanged={loadOpenRides} />}
        {tab === 'mine' && <MyRidesTab />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  mapWrap: { width: '100%', backgroundColor: '#DDE6EC' },
  mapHeader: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapTitlePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  mapTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  l2Badge: { marginLeft: 6, backgroundColor: FP_CARPOOL, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  l2Text: { color: CARD, fontSize: 9, fontWeight: '800' },
  routineBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  ridePill: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: FP_CARPOOL, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  ridePillText: { color: CARD, fontSize: 12, fontWeight: '700' },

  tabStrip: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 12, paddingTop: 8 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: FP_PRIMARY },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  tabBtnTextActive: { color: FP_PRIMARY },
  content: { flex: 1 },
});
