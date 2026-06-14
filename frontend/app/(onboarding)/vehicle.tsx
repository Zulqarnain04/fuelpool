// app/(onboarding)/vehicle.tsx — Step 1 of 2: Vehicle Setup (optional).
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, ChevronDown, Info, ArrowRight } from 'lucide-react-native';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import OptionSheet from '../../src/components/common/OptionSheet';
import { vehicleApi, FuelType, VehicleRequest } from '../../src/services/api';
import { MAKES, MODELS_BY_MAKE, findVehicleSpec } from '../../src/constants/vehicles';
import {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_WARNING,
  FP_DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  CARD,
  BORDER,
  BACKGROUND,
} from '../../src/constants/colors';

const FUEL_TYPE_OPTIONS: { value: FuelType; label: string; color: string }[] = [
  { value: 'RON95_MARKET', label: 'RON95 Market', color: FP_SECONDARY },
  { value: 'RON95_BUDI95', label: 'RON95 BUDI95', color: FP_PRIMARY },
  { value: 'RON97', label: 'RON97', color: FP_WARNING },
  { value: 'DIESEL', label: 'Diesel', color: TEXT_SECONDARY },
  { value: 'DIESEL_EAST', label: 'Diesel East', color: TEXT_SECONDARY },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressLabel}>Step {step} of 2</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
      </View>
    </View>
  );
}

function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  disabled,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.selector, disabled && styles.selectorDisabled]}
      >
        <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={TEXT_LIGHT} />
      </Pressable>
    </>
  );
}

export default function VehicleSetup() {
  const router = useRouter();

  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [tankCapacity, setTankCapacity] = useState('');
  const [avgEfficiency, setAvgEfficiency] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);
  const [odometer, setOdometer] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  const [makeSheet, setMakeSheet] = useState(false);
  const [modelSheet, setModelSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = make ? MODELS_BY_MAKE[make] ?? [] : [];
  const useModelPicker = models.length > 0;

  const onPickMake = (m: string) => {
    setMake(m);
    setModel(null);
    setAutoFilled(false);
  };

  const onPickModel = (m: string) => {
    setModel(m);
    if (make) {
      const spec = findVehicleSpec(make, m);
      if (spec) {
        setTankCapacity(String(spec.tankCapacity));
        setAvgEfficiency(String(spec.defaultEfficiency));
        setAutoFilled(true);
      }
    }
  };

  const onSubmit = async () => {
    setError(null);
    if (!make) return setError('Please select your vehicle make.');
    if (!model) return setError('Please select or enter your model.');
    if (!fuelType) return setError('Please select your fuel type.');
    const tank = parseFloat(tankCapacity);
    const eff = parseFloat(avgEfficiency);
    if (!(tank > 0)) return setError('Enter a valid tank capacity.');
    if (!(eff > 0)) return setError('Enter a valid average efficiency.');

    const payload: VehicleRequest = {
      make,
      model,
      fuelType,
      tankCapacity: tank,
      avgEfficiency: eff,
      year: year ? parseInt(year, 10) : undefined,
      color: color || undefined,
      plateNumber: plate || undefined,
      currentOdometer: odometer ? parseInt(odometer, 10) : undefined,
      isPrimary: true,
    };

    setLoading(true);
    try {
      await vehicleApi.addVehicle(payload);
      router.replace('/(onboarding)/route');
    } catch (e: any) {
      setError(
        e?.response
          ? 'Could not save your vehicle. Please try again.'
          : "Can't reach the server. Check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProgressBar step={1} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Car size={20} color={FP_PRIMARY} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.h1}>Your Vehicle</Text>
              <Text style={styles.sub}>We'll use this to estimate fuel and savings.</Text>
            </View>
          </View>

          {/* Make */}
          <SelectorField label="Make" value={make} placeholder="Select make" onPress={() => setMakeSheet(true)} />

          {/* Model */}
          {useModelPicker ? (
            <SelectorField
              label="Model"
              value={model}
              placeholder={make ? 'Select model' : 'Select a make first'}
              onPress={() => make && setModelSheet(true)}
              disabled={!make}
            />
          ) : (
            <>
              <Text style={styles.label}>Model</Text>
              <Input
                value={model ?? ''}
                onChangeText={setModel}
                placeholder="Enter model"
                editable={!!make}
              />
            </>
          )}

          {/* Fuel type */}
          <Text style={styles.label}>Fuel type</Text>
          <View style={styles.fuelRow}>
            {FUEL_TYPE_OPTIONS.map((opt) => {
              const active = fuelType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setFuelType(opt.value)}
                  style={[
                    styles.fuelChip,
                    active ? { backgroundColor: opt.color, borderColor: opt.color } : null,
                  ]}
                >
                  <Text style={[styles.fuelChipText, active && { color: CARD }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {fuelType === 'RON95_BUDI95' && (
            <View style={styles.infoCard}>
              <Info size={16} color={FP_PRIMARY} />
              <Text style={styles.infoText}>
                Max 300L per month at RM1.99. Market rate applies after the cap.
              </Text>
            </View>
          )}

          {/* Tank capacity */}
          <Text style={styles.label}>Tank capacity</Text>
          <Input
            value={tankCapacity}
            onChangeText={(t) => {
              setTankCapacity(t);
            }}
            placeholder="40"
            keyboardType="numeric"
            rightElement={<Text style={styles.suffix}>L</Text>}
          />

          {/* Efficiency */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Avg efficiency</Text>
            {autoFilled && (
              <View style={styles.autoTag}>
                <Text style={styles.autoTagText}>Auto-filled</Text>
              </View>
            )}
          </View>
          <Input
            value={avgEfficiency}
            onChangeText={(t) => {
              setAvgEfficiency(t);
              setAutoFilled(false);
            }}
            placeholder="14"
            keyboardType="numeric"
            rightElement={<Text style={styles.suffix}>km/L</Text>}
          />

          {/* Odometer */}
          <Text style={styles.label}>Current odometer</Text>
          <Input
            value={odometer}
            onChangeText={setOdometer}
            placeholder="0"
            keyboardType="numeric"
            rightElement={<Text style={styles.suffix}>km</Text>}
          />

          {/* Optional */}
          <Text style={styles.optionalHeading}>Optional</Text>
          <View style={styles.optionalRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Year</Text>
              <Input value={year} onChangeText={setYear} placeholder="2022" keyboardType="numeric" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Color</Text>
              <Input value={color} onChangeText={setColor} placeholder="Silver" />
            </View>
          </View>
          <Text style={styles.label}>Plate number</Text>
          <Input value={plate} onChangeText={setPlate} placeholder="JKK 1234" autoCapitalize="characters" />

          {error ? (
            <View style={styles.errorRow}>
              <Info size={15} color={FP_DANGER} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.bottom}>
            <PrimaryButton label="Next: Set Route" onPress={onSubmit} loading={loading} />
            <Pressable onPress={() => router.replace('/(tabs)/home')} hitSlop={8}>
              <Text style={styles.skip}>Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={makeSheet}
        title="Select make"
        options={MAKES}
        selected={make}
        onSelect={onPickMake}
        onClose={() => setMakeSheet(false)}
      />
      <OptionSheet
        visible={modelSheet}
        title="Select model"
        options={models}
        selected={model}
        onSelect={onPickModel}
        onClose={() => setModelSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 36 },
  progressWrap: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: FP_PRIMARY },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FP_PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  sub: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6, marginTop: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F3F5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorDisabled: { opacity: 0.6 },
  selectorValue: { fontSize: 16, color: TEXT_PRIMARY },
  selectorPlaceholder: { fontSize: 16, color: TEXT_LIGHT },
  fuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  fuelChipText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FP_PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoText: { flex: 1, fontSize: 12, color: FP_PRIMARY, fontWeight: '600', lineHeight: 17 },
  suffix: { fontSize: 14, fontWeight: '700', color: TEXT_LIGHT },
  autoTag: {
    backgroundColor: FP_PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 14,
  },
  autoTagText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY, textTransform: 'uppercase' },
  optionalHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
  },
  optionalRow: { flexDirection: 'row', gap: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  errorText: { color: FP_DANGER, fontSize: 13, fontWeight: '600', flex: 1 },
  bottom: { marginTop: 28, gap: 16 },
  skip: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
