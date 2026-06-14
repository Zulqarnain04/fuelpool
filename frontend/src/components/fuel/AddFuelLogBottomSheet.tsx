// src/components/fuel/AddFuelLogBottomSheet.tsx — log a fill-up as a slide-up bottom sheet.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Modal, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Gauge, Clock, Cpu } from 'lucide-react-native';
import Input from '../common/Input';
import { toast } from '../common/Toast';
import { FUEL_META, FUEL_ORDER } from './fuelMeta';
import { fuelApi, vehicleApi } from '../../services/api';
import type { FuelType, FuelPrices, FuelLogRequest, FuelLog, Vehicle, Page } from '../../services/api';
import { num, rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_AI, FP_WARNING, FP_DANGER, BACKGROUND, CARD, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

interface Props {
  visible: boolean;
  userFuel: FuelType;
  onClose: () => void;
  onSaved: () => void;
}

const QUICK = [20, 30, 40, 50];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toLocalDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
const DAY_OPTS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: 1 },
  { label: '2 days ago', offset: 2 },
  { label: '3 days ago', offset: 3 },
];
const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 5; h <= 23; h++) for (const m of [0, 30]) out.push(`${pad(h)}:${pad(m)}`);
  return out;
})();

export default function AddFuelLogBottomSheet({ visible, userFuel, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [prices, setPrices] = useState<FuelPrices | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>(userFuel);
  const [amount, setAmount] = useState('');
  const [station, setStation] = useState('');
  const [odometer, setOdometer] = useState('');
  const [date, setDate] = useState(new Date());
  const [fullTank, setFullTank] = useState(true);
  const [missedPrevious, setMissedPrevious] = useState(false);
  const [notes, setNotes] = useState('');
  const [dateModal, setDateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOdometer, setLastOdometer] = useState<number | null>(null);
  const [vehicleAvgEff, setVehicleAvgEff] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Reset the form + reload price/odometer context each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setFuelType(userFuel);
    setAmount('');
    setStation('');
    setOdometer('');
    setDate(new Date());
    setFullTank(true);
    setMissedPrevious(false);
    setNotes('');
    setError(null);
    setPrefilled(false);

    (async () => {
      const [pRes, lRes, vRes] = await Promise.allSettled([
        fuelApi.getCurrentPrices(),
        fuelApi.getLogs(0, 1),
        vehicleApi.getVehicles(),
      ]);
      if (pRes.status === 'fulfilled') setPrices(pRes.value.data);

      const vehicles: Vehicle[] = vRes.status === 'fulfilled' ? vRes.value.data ?? [] : [];
      const primary = vehicles.find((v) => v.primary) ?? vehicles[0];
      if (primary?.avgEfficiency != null) setVehicleAvgEff(num(primary.avgEfficiency));

      const pageData: Page<FuelLog> | undefined = lRes.status === 'fulfilled' ? lRes.value.data : undefined;
      const lastLogOdo = pageData?.content?.[0]?.odometer;
      const odo = lastLogOdo ?? primary?.currentOdometer ?? null;
      if (odo != null) setLastOdometer(odo);
    })();
  }, [visible, userFuel]);

  // One-time pre-fill: suggest last reading + ~300 km so testing is one tap.
  useEffect(() => {
    if (!prefilled && lastOdometer != null && odometer === '') {
      setOdometer(String(lastOdometer + 300));
      setPrefilled(true);
    }
  }, [lastOdometer, prefilled, odometer]);

  const meta = FUEL_META[fuelType];
  const price = num(prices?.[meta.priceKey]);
  const amountNum = parseFloat(amount) || 0;
  const volume = price > 0 ? amountNum / price : 0;

  // Live preview (mirrors what the backend computes on save).
  const odoNum = parseInt(odometer, 10) || 0;
  const distance = lastOdometer != null && odoNum > lastOdometer ? odoNum - lastOdometer : 0;
  const liveEff = fullTank && distance > 0 && volume > 0 ? distance / volume : 0;
  const liveCostKm = distance > 0 && amountNum > 0 ? amountNum / distance : 0;
  const showPreview = distance > 0 && volume > 0;

  const dateLabel = useMemo(() => {
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    const y = new Date(today.getTime() - 86400000);
    const isY = date.toDateString() === y.toDateString();
    const prefix = sameDay ? 'Today' : isY ? 'Yesterday' : `${date.getDate()}/${date.getMonth() + 1}`;
    return `${prefix}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }, [date]);

  const onSave = async () => {
    setError(null);
    if (amountNum <= 0) return setError('Enter the amount you paid.');
    if (!odometer || parseInt(odometer, 10) <= 0) return setError('Enter your current odometer reading.');
    if (price <= 0) return setError('Current price unavailable — try again in a moment.');

    const payload: FuelLogRequest = {
      logDate: toLocalDateTime(date),
      odometer: parseInt(odometer, 10),
      litresFilled: parseFloat(volume.toFixed(2)),
      pricePerLitre: price,
      totalCost: amountNum,
      isFullTank: fullTank,
      isMissedPrevious: missedPrevious,
      stationName: station || undefined,
      fuelType,
      notes: notes || undefined,
    };

    setSaving(true);
    try {
      await fuelApi.addLog(payload);
      toast.success('Fill-up logged!');
      onSaved();
    } catch (e: any) {
      setError(e?.response ? 'Could not save the log. Please try again.' : "Can't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const setDay = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    d.setHours(date.getHours(), date.getMinutes());
    setDate(d);
  };
  const setTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    setDate(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { height: '92%' }]} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.handle} />
            {/* header */}
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close fill-up form">
                <X size={22} color={TEXT_PRIMARY} />
              </Pressable>
              <Text style={styles.headerTitle}>Log Fill-up</Text>
              <Pressable onPress={onSave} disabled={saving} hitSlop={10} accessibilityRole="button" accessibilityLabel="Save fill-up">
                <Text style={[styles.save, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* fuel type chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 18 }}>
                {FUEL_ORDER.map((f) => {
                  const m = FUEL_META[f];
                  const active = fuelType === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setFuelType(f)}
                      style={[styles.chip, active ? { backgroundColor: m.color, borderColor: m.color } : null]}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.label} fuel type${active ? ', selected' : ''}`}
                    >
                      <Text style={[styles.chipText, active && { color: CARD }]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* big amount */}
              <View style={styles.amountWrap}>
                <Text style={styles.rmLabel}>RM</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={TEXT_LIGHT}
                  keyboardType="numeric"
                  accessibilityLabel="Amount paid in ringgit"
                />
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcItem}>{volume > 0 ? `${volume.toFixed(2)} L` : '— L'}</Text>
                <Text style={styles.calcDot}>·</Text>
                <Text style={styles.calcItem}>{price > 0 ? `${rm(price)}/L` : '—/L'}</Text>
              </View>

              {/* quick amounts */}
              <View style={styles.quickRow}>
                {QUICK.map((q) => (
                  <Pressable key={q} onPress={() => setAmount(String(q))} style={styles.quickBtn} accessibilityRole="button" accessibilityLabel={`Set amount to RM ${q}`}>
                    <Text style={styles.quickText}>RM{q}</Text>
                  </Pressable>
                ))}
              </View>

              {/* details */}
              <Text style={styles.label}>Station</Text>
              <Input leftIcon={<MapPin size={18} color={TEXT_LIGHT} />} value={station} onChangeText={setStation} placeholder="e.g. Petronas Skudai" accessibilityLabel="Station name" />

              <Text style={styles.label}>Odometer</Text>
              <Input
                leftIcon={<Gauge size={18} color={TEXT_LIGHT} />}
                value={odometer}
                onChangeText={setOdometer}
                placeholder="Current reading"
                keyboardType="numeric"
                rightElement={<Text style={styles.suffix}>km</Text>}
                accessibilityLabel="Current odometer reading in kilometres"
              />
              {lastOdometer != null ? (
                <Text style={styles.hint}>
                  Last logged: {lastOdometer.toLocaleString()} km — enter your current (higher) reading.
                </Text>
              ) : null}

              {/* live calculated preview (matches what's saved) */}
              {showPreview ? (
                <View style={styles.preview}>
                  <Text style={styles.previewTitle}>Preview</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Distance since last</Text>
                    <Text style={styles.previewValue}>{distance.toLocaleString()} km</Text>
                  </View>
                  {fullTank && liveEff > 0 ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Efficiency this fill</Text>
                      <Text style={[styles.previewValue, { color: vehicleAvgEff != null && liveEff >= vehicleAvgEff ? FP_PRIMARY : FP_WARNING }]}>
                        {liveEff.toFixed(1)} km/L
                        {vehicleAvgEff != null ? ` (avg ${vehicleAvgEff.toFixed(1)})` : ''}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Cost per km</Text>
                    <Text style={styles.previewValue}>{rm(liveCostKm, 3)}</Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.label}>Date & time</Text>
              <Pressable style={styles.dateField} onPress={() => setDateModal(true)} accessibilityRole="button" accessibilityLabel={`Change fill-up date and time, currently ${dateLabel}`}>
                <View style={styles.rowCenter}>
                  <Clock size={18} color={TEXT_LIGHT} />
                  <Text style={styles.dateText}>  {dateLabel}</Text>
                </View>
                <Text style={styles.dateHint}>Change</Text>
              </Pressable>

              {/* toggles */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Full tank?</Text>
                  <Text style={styles.toggleSub}>Needed for accurate efficiency</Text>
                </View>
                <Switch value={fullTank} onValueChange={setFullTank} trackColor={{ false: BORDER, true: FP_PRIMARY }} thumbColor={CARD} accessibilityLabel="Full tank toggle" />
              </View>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Missed previous fill-up?</Text>
                  <Text style={styles.toggleSub}>Skips efficiency calc for this entry</Text>
                </View>
                <Switch value={missedPrevious} onValueChange={setMissedPrevious} trackColor={{ false: BORDER, true: FP_PRIMARY }} thumbColor={CARD} accessibilityLabel="Missed previous fill-up toggle" />
              </View>

              <Text style={styles.label}>Notes (optional)</Text>
              <Input value={notes} onChangeText={setNotes} placeholder="Anything to remember" accessibilityLabel="Notes" />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* AI tip */}
              <View style={styles.aiTip}>
                <Cpu size={16} color={FP_AI} />
                <Text style={styles.aiTipText}>
                  Log full-tank to full-tank for the most accurate km/L. We'll compute distance and efficiency automatically.
                </Text>
              </View>
              <View style={{ height: 24 + insets.bottom }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* date/time modal */}
          <Modal visible={dateModal} transparent animationType="slide" onRequestClose={() => setDateModal(false)}>
            <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
              <Pressable style={styles.dateSheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>When did you fill up?</Text>
                <View style={styles.dayRow}>
                  {DAY_OPTS.map((d) => {
                    const active = dateLabel.startsWith(d.label) || (d.offset === 0 && dateLabel.startsWith('Today'));
                    return (
                      <Pressable key={d.label} onPress={() => setDay(d.offset)} style={[styles.dayChip, active && styles.dayChipActive]} accessibilityRole="button" accessibilityLabel={d.label}>
                        <Text style={[styles.dayChipText, active && { color: CARD }]}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.sheetSub}>Time</Text>
                <ScrollView contentContainerStyle={styles.slotWrap} showsVerticalScrollIndicator={false}>
                  {TIME_SLOTS.map((t) => {
                    const active = `${pad(date.getHours())}:${pad(date.getMinutes())}` === t;
                    return (
                      <Pressable key={t} onPress={() => setTime(t)} style={[styles.slot, active && styles.slotActive]} accessibilityRole="button" accessibilityLabel={`Set time to ${t}`}>
                        <Text style={[styles.slotText, active && { color: CARD }]}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.doneBtn} onPress={() => setDateModal(false)} accessibilityRole="button" accessibilityLabel="Done picking date and time">
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BACKGROUND, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  save: { fontSize: 15, fontWeight: '800', color: FP_PRIMARY },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rmLabel: { fontSize: 22, fontWeight: '800', color: TEXT_SECONDARY, marginTop: 8 },
  amountInput: { fontSize: 52, fontWeight: '800', color: TEXT_PRIMARY, minWidth: 120, textAlign: 'center', padding: 0 },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  calcItem: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '700' },
  calcDot: { color: TEXT_LIGHT },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  quickBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center' },
  quickText: { fontSize: 14, fontWeight: '800', color: TEXT_SECONDARY },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6, marginTop: 20 },
  suffix: { fontSize: 14, fontWeight: '700', color: TEXT_LIGHT },
  hint: { fontSize: 12, color: TEXT_LIGHT, marginTop: 6 },
  preview: { backgroundColor: '#F0FBF6', borderRadius: 14, borderWidth: 1, borderColor: '#CDEFE0', padding: 14, marginTop: 14, gap: 8 },
  previewTitle: { fontSize: 11, fontWeight: '800', color: FP_PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewLabel: { fontSize: 13, color: TEXT_SECONDARY },
  previewValue: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F3F5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dateText: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  dateHint: { fontSize: 12, color: FP_PRIMARY, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  toggleSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  error: { color: FP_DANGER, fontSize: 13, fontWeight: '600', marginTop: 16 },
  aiTip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EEEDFE', borderRadius: 14, padding: 14, marginTop: 24 },
  aiTipText: { flex: 1, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 18 },

  dateSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 12 },
  sheetSub: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginTop: 14, marginBottom: 8 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER },
  dayChipActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  dayChipText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '22.5%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  slotActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  slotText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  doneBtn: { backgroundColor: FP_PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  doneText: { color: CARD, fontSize: 15, fontWeight: '800' },
});
