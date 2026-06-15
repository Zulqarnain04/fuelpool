// app/routines/new.tsx — create or edit a commute routine.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, Clock, LocateFixed, MapPin, Flag, Info } from 'lucide-react-native';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import { carpoolApi } from '../../src/services/api';
import type { RolePreference, RoutineRequest, Routine } from '../../src/services/api';
import { CAMPUS_LOCATIONS } from '../../src/constants';
import { num } from '../../src/utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_SECONDARY, FP_DANGER, BACKGROUND, CARD, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';

interface Coords { lat: number; lng: number; }
const DAYS = [['Mon', 'MON'], ['Tue', 'TUE'], ['Wed', 'WED'], ['Thu', 'THU'], ['Fri', 'FRI'], ['Sat', 'SAT'], ['Sun', 'SUN']] as const;
const ROLES: { label: string; value: RolePreference }[] = [
  { label: 'Passenger', value: 'PASSENGER' }, { label: 'Driver', value: 'DRIVER' }, { label: 'Either', value: 'EITHER' },
];
function pad(n: number) { return String(n).padStart(2, '0'); }
const TIME_SLOTS = (() => { const o: string[] = []; for (let h = 5; h <= 22; h++) for (const m of [0, 15, 30, 45]) o.push(`${pad(h)}:${pad(m)}`); return o; })();
const CHIPS = CAMPUS_LOCATIONS;

export default function RoutineForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [name, setName] = useState('');
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

  // edit: prefill from the routine list
  useEffect(() => {
    if (!editing) return;
    carpoolApi.getRoutines().then((res) => {
      const r: Routine | undefined = (res.data ?? []).find((x: Routine) => String(x.id) === id);
      if (!r) return;
      setName(r.name ?? '');
      setOriginLabel(r.originLabel ?? '');
      if (r.originLat != null) setOriginCoords({ lat: num(r.originLat), lng: num(r.originLng) });
      setDestLabel(r.destLabel ?? '');
      if (r.destLat != null) setDestCoords({ lat: num(r.destLat), lng: num(r.destLng) });
      if (r.departureTime) setTime(r.departureTime.slice(0, 5));
      if (r.daysOfWeek) setDays(new Set(r.daysOfWeek.split(',').filter(Boolean)));
      if (r.rolePreference) setRole(r.rolePreference as RolePreference);
      setAutoRequest(!!r.autoRequest);
    }).catch(() => {});
  }, [editing, id]);

  const toggleDay = (code: string) => setDays((prev) => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });

  const useCurrent = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location', 'Enable location to use your current position.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOriginCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setOriginLabel((p) => p || 'Current location');
    } catch { Alert.alert('Location', 'Could not get your location.'); }
    finally { setLocLoading(false); }
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Give your routine a name.');
    if (!originCoords) return setError('Set a pickup location (use current location or a campus shortcut).');
    if (!destCoords) return setError('Pick a destination.');
    if (days.size === 0) return setError('Select at least one day.');

    const payload: RoutineRequest = {
      name: name.trim(),
      daysOfWeek: DAYS.filter(([, c]) => days.has(c)).map(([, c]) => c).join(','),
      departureTime: time,
      originLat: originCoords.lat, originLng: originCoords.lng, originLabel: originLabel || 'Home',
      destLat: destCoords.lat, destLng: destCoords.lng, destLabel: destLabel || 'Destination',
      rolePreference: role, autoRequest,
    };
    setLoading(true);
    try {
      if (editing) await carpoolApi.updateRoutine(Number(id), payload);
      else await carpoolApi.createRoutine(payload);
      router.back();
    } catch (e: any) {
      setError(e?.response ? 'Could not save the routine.' : "Can't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const pickOrigin = (c: typeof CAMPUS_LOCATIONS[number]) => { setOriginLabel(c.label); setOriginCoords({ lat: c.lat, lng: c.lng }); };
  const pickDest = (c: typeof CAMPUS_LOCATIONS[number]) => { setDestLabel(c.label); setDestCoords({ lat: c.lat, lng: c.lng }); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
          <Text style={styles.topTitle}>{editing ? 'Edit Routine' : 'New Routine'}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Name</Text>
          <Input value={name} onChangeText={setName} placeholder="e.g. Morning class" />

          <Text style={styles.label}><MapPin size={12} color={FP_SECONDARY} /> Pickup</Text>
          <View style={styles.chipRow}>
            {CHIPS.map((c) => (
              <Pressable key={`o${c.label}`} onPress={() => pickOrigin(c)} style={[styles.chip, originLabel === c.label && styles.chipActive]}>
                <Text style={[styles.chipText, originLabel === c.label && { color: CARD }]} numberOfLines={1}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.currentBtn} onPress={useCurrent} disabled={locLoading}>
            {locLoading ? <ActivityIndicator size="small" color={FP_PRIMARY} /> : <LocateFixed size={14} color={FP_PRIMARY} />}
            <Text style={styles.currentText}>{originCoords && originLabel === 'Current location' ? 'Using current location ✓' : 'Use current location'}</Text>
          </Pressable>

          <Text style={styles.label}><Flag size={12} color={FP_DANGER} /> Destination</Text>
          <View style={styles.chipRow}>
            {CHIPS.map((c) => (
              <Pressable key={`d${c.label}`} onPress={() => pickDest(c)} style={[styles.chip, destLabel === c.label && styles.chipActive]}>
                <Text style={[styles.chipText, destLabel === c.label && { color: CARD }]} numberOfLines={1}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Departure time</Text>
          <Pressable style={styles.timeField} onPress={() => setTimeModal(true)}>
            <View style={styles.rowCenter}><Clock size={16} color={TEXT_LIGHT} /><Text style={styles.timeText}>  {time}</Text></View>
            <Text style={styles.timeHint}>Change</Text>
          </Pressable>

          <Text style={styles.label}>Days</Text>
          <View style={styles.daysRow}>
            {DAYS.map(([lbl, code]) => {
              const active = days.has(code);
              return (
                <Pressable key={code} onPress={() => toggleDay(code)} style={[styles.dayPill, active && styles.dayActive]}>
                  <Text style={[styles.dayText, active && { color: CARD }]}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable key={r.value} onPress={() => setRole(r.value)} style={[styles.roleChip, active && styles.roleActive]}>
                  <Text style={[styles.roleText, active && { color: CARD }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.autoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTitle}>Auto-request rides</Text>
              <Text style={styles.autoSub}>Find a match 30 min before departure</Text>
            </View>
            <Switch value={autoRequest} onValueChange={setAutoRequest} trackColor={{ false: BORDER, true: FP_PRIMARY }} thumbColor={CARD} />
          </View>
          {autoRequest && (
            <View style={styles.info}><Info size={15} color={FP_PRIMARY} /><Text style={styles.infoText}>We'll auto-send a request 30 minutes before your departure on selected days.</Text></View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ height: 20 }} />
          <PrimaryButton label={editing ? 'Save changes' : 'Create routine'} onPress={submit} loading={loading} />
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={timeModal} transparent animationType="slide" onRequestClose={() => setTimeModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTimeModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Departure time</Text>
            <ScrollView contentContainerStyle={styles.slotWrap}>
              {TIME_SLOTS.map((t) => (
                <Pressable key={t} onPress={() => { setTime(t); setTimeModal(false); }} style={[styles.slot, time === t && styles.slotActive]}>
                  <Text style={[styles.slotText, time === t && { color: CARD }]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8, marginTop: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, maxWidth: 160 },
  chipActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  chipText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  currentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 4 },
  currentText: { fontSize: 13, fontWeight: '700', color: FP_PRIMARY },
  timeField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F3F5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  timeText: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  timeHint: { fontSize: 12, color: FP_PRIMARY, fontWeight: '700' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  dayText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center' },
  roleActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  roleText: { fontSize: 14, fontWeight: '700', color: TEXT_SECONDARY },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  autoTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  autoSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  info: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: FP_PRIMARY_LIGHT, borderRadius: 12, padding: 12, marginTop: 12 },
  infoText: { flex: 1, fontSize: 12, color: FP_PRIMARY, fontWeight: '600', lineHeight: 17 },
  error: { color: FP_DANGER, fontSize: 13, fontWeight: '600', marginTop: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxHeight: '60%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 12 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '22.5%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  slotActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  slotText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
});
