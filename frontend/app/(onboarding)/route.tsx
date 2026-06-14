// app/(onboarding)/route.tsx — Step 2 of 2: Commute Route (optional).
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Flag, LocateFixed, Clock, Info, CircleAlert } from 'lucide-react-native';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import { carpoolApi, RolePreference, RoutineRequest } from '../../src/services/api';
import { CAMPUS_LOCATIONS } from '../../src/constants';
import {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  CARD,
  BORDER,
  BACKGROUND,
} from '../../src/constants/colors';

interface Coords {
  lat: number;
  lng: number;
}

const DAYS: { label: string; code: string }[] = [
  { label: 'Mon', code: 'MON' },
  { label: 'Tue', code: 'TUE' },
  { label: 'Wed', code: 'WED' },
  { label: 'Thu', code: 'THU' },
  { label: 'Fri', code: 'FRI' },
  { label: 'Sat', code: 'SAT' },
  { label: 'Sun', code: 'SUN' },
];

const ROLES: { label: string; value: RolePreference }[] = [
  { label: 'Passenger', value: 'PASSENGER' },
  { label: 'Driver', value: 'DRIVER' },
  { label: 'Either', value: 'EITHER' },
];

// Campus shortcut chips → look up coords from CAMPUS_LOCATIONS.
const CAMPUS_CHIPS: { label: string; locationLabel: string }[] = [
  { label: 'Kolej 17', locationLabel: 'Kolej 17' },
  { label: 'FC', locationLabel: 'Faculty of Computing' },
  { label: 'UTM Gate', locationLabel: 'UTM Gate' },
  { label: 'Skudai Town', locationLabel: 'Skudai Town' },
];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

function TimePickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (t: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Departure time</Text>
          <ScrollView contentContainerStyle={styles.slotWrap} showsVerticalScrollIndicator={false}>
            {TIME_SLOTS.map((t) => {
              const active = t === value;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    onSelect(t);
                    onClose();
                  }}
                  style={[styles.slot, active && styles.slotActive]}
                >
                  <Text style={[styles.slotText, active && styles.slotTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RouteSetup() {
  const router = useRouter();

  const [originLabel, setOriginLabel] = useState('');
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [destLabel, setDestLabel] = useState('');
  const [destCoords, setDestCoords] = useState<Coords | null>(null);

  const [time, setTime] = useState('07:45');
  const [timeModal, setTimeModal] = useState(false);
  const [days, setDays] = useState<Set<string>>(new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']));
  const [role, setRole] = useState<RolePreference>('EITHER');
  const [autoRequest, setAutoRequest] = useState(false);

  const [locLoading, setLocLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (code: string) => {
    setDays((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const pickCampus = (locationLabel: string) => {
    const loc = CAMPUS_LOCATIONS.find((c) => c.label === locationLabel);
    if (loc) {
      setDestLabel(loc.label);
      setDestCoords({ lat: loc.lat, lng: loc.lng });
    }
  };

  const useCurrentLocation = async () => {
    setError(null);
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission', 'Enable location access to use your current position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOriginCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setOriginLabel((prev) => prev || 'Current location');
    } catch {
      Alert.alert('Location', 'Could not get your current location.');
    } finally {
      setLocLoading(false);
    }
  };

  const onComplete = async () => {
    setError(null);
    if (!originCoords) return setError('Set your pickup location (use current location).');
    if (!destCoords) return setError('Pick a destination using a campus shortcut.');
    if (days.size === 0) return setError('Select at least one commute day.');

    const daysOfWeek = DAYS.filter((d) => days.has(d.code)).map((d) => d.code).join(',');
    const payload: RoutineRequest = {
      name: `Commute to ${destLabel || 'campus'}`,
      daysOfWeek,
      departureTime: time,
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      originLabel: originLabel || 'Home',
      destLat: destCoords.lat,
      destLng: destCoords.lng,
      destLabel: destLabel || 'Destination',
      rolePreference: role,
      autoRequest,
    };

    setLoading(true);
    try {
      await carpoolApi.createRoutine(payload);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(
        e?.response
          ? 'Could not save your route. Please try again.'
          : "Can't reach the server. Check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Progress */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>Step 2 of 2</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.h1}>Commute Route</Text>
          <Text style={styles.sub}>Set your daily route so we can match you with carpools.</Text>

          {/* Route card */}
          <View style={styles.routeCard}>
            {/* Origin */}
            <View style={styles.routeRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { borderColor: FP_SECONDARY }]} />
                <View style={styles.lineDown} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.routeLabel}>Home / Pickup</Text>
                <Input
                  leftIcon={<MapPin size={16} color={TEXT_LIGHT} />}
                  value={originLabel}
                  onChangeText={setOriginLabel}
                  placeholder="Your pickup point"
                />
                <Pressable onPress={useCurrentLocation} style={styles.currentBtn} disabled={locLoading}>
                  {locLoading ? (
                    <ActivityIndicator size="small" color={FP_PRIMARY} />
                  ) : (
                    <LocateFixed size={14} color={FP_PRIMARY} />
                  )}
                  <Text style={styles.currentBtnText}>
                    {originCoords ? 'Location set ✓ — tap to update' : 'Use current location'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Destination */}
            <View style={styles.routeRow}>
              <View style={styles.dotCol}>
                <View style={styles.lineUp} />
                <View style={[styles.dot, { borderColor: FP_DANGER }]} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Input
                  leftIcon={<Flag size={16} color={TEXT_LIGHT} />}
                  value={destLabel}
                  onChangeText={setDestLabel}
                  placeholder="Where are you heading?"
                />
                <View style={styles.chipRow}>
                  {CAMPUS_CHIPS.map((c) => {
                    const active = destLabel === c.locationLabel;
                    return (
                      <Pressable
                        key={c.label}
                        onPress={() => pickCampus(c.locationLabel)}
                        style={[styles.campusChip, active && styles.campusChipActive]}
                      >
                        <Text style={[styles.campusChipText, active && { color: CARD }]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Departure time */}
          <Text style={styles.label}>Departure time</Text>
          <Pressable style={styles.timeField} onPress={() => setTimeModal(true)}>
            <View style={styles.rowCenter}>
              <Clock size={18} color={TEXT_LIGHT} />
              <Text style={styles.timeText}>{time}</Text>
            </View>
            <Text style={styles.timeHint}>Tap to change</Text>
          </Pressable>

          {/* Days */}
          <Text style={styles.label}>Commute days</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const active = days.has(d.code);
              return (
                <Pressable
                  key={d.code}
                  onPress={() => toggleDay(d.code)}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                >
                  <Text style={[styles.dayText, active && { color: CARD }]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Role */}
          <Text style={styles.label}>Role preference</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <Text style={[styles.roleText, active && { color: CARD }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Auto-request */}
          <View style={styles.autoRow}>
            <View style={styles.flex}>
              <Text style={styles.autoTitle}>Auto-request rides</Text>
              <Text style={styles.autoSub}>Automatically find a match before departure</Text>
            </View>
            <Switch
              value={autoRequest}
              onValueChange={setAutoRequest}
              trackColor={{ false: BORDER, true: FP_PRIMARY }}
              thumbColor={CARD}
            />
          </View>
          {autoRequest && (
            <View style={styles.infoCard}>
              <Info size={16} color={FP_PRIMARY} />
              <Text style={styles.infoText}>
                We'll auto-send a ride request 30 minutes before your departure time on commute days.
              </Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorRow}>
              <CircleAlert size={15} color={FP_DANGER} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.bottom}>
            <PrimaryButton label="Complete Setup" onPress={onComplete} loading={loading} />
            <Pressable onPress={() => router.replace('/(tabs)/home')} hitSlop={8}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TimePickerModal
        visible={timeModal}
        value={time}
        onSelect={setTime}
        onClose={() => setTimeModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scroll: { paddingHorizontal: 24, paddingBottom: 36 },
  progressWrap: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: FP_PRIMARY },
  h1: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  sub: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, marginBottom: 16 },

  routeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  routeRow: { flexDirection: 'row', gap: 12 },
  dotCol: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, backgroundColor: CARD, marginTop: 30 },
  lineDown: { flex: 1, width: 2, backgroundColor: BORDER, marginTop: 4 },
  lineUp: { flex: 1, width: 2, backgroundColor: BORDER, marginBottom: 4, minHeight: 24 },
  routeLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6 },
  currentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 4 },
  currentBtnText: { fontSize: 13, fontWeight: '700', color: FP_PRIMARY },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  campusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  campusChipActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  campusChipText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },

  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8, marginTop: 22 },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F3F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeText: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  timeHint: { fontSize: 12, color: TEXT_LIGHT },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  dayText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },

  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  roleText: { fontSize: 14, fontWeight: '700', color: TEXT_SECONDARY },

  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  autoTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  autoSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FP_PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: FP_PRIMARY, fontWeight: '600', lineHeight: 17 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  errorText: { color: FP_DANGER, fontSize: 13, fontWeight: '600', flex: 1 },
  bottom: { marginTop: 28, gap: 16 },
  skip: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '60%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 12 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  slotActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  slotText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  slotTextActive: { color: CARD, fontWeight: '800' },
});
