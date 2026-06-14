// src/components/fuel/FuelOverview.tsx — Fuel Intelligence overview (sub-screen 1).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Zap, Cpu, TrendingUp, TrendingDown, Minus, FileText, Plus, ShieldCheck,
  ChevronRight, RefreshCw, WifiOff, Eye, EyeOff,
} from 'lucide-react-native';
import AiBadge from '../common/AiBadge';
import SkeletonBox from '../common/SkeletonBox';
import PriceTrendChart from './PriceTrendChart';
import { FUEL_META, FUEL_ORDER } from './fuelMeta';
import { fuelApi } from '../../services/api';
import type {
  FuelType, FuelPrices, RefuelRecommendation, EnhancedPrediction, FuelTrend, MofArticle, Budi95Status,
} from '../../services/api';
import { num, rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_AI, FP_WARNING, FP_DANGER, FP_SECONDARY,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

const TANK_L = 42;
const PERIODS = [
  { label: '1M', weeks: 5 },
  { label: '3M', weeks: 13 },
  { label: '6M', weeks: 26 },
];

interface Props {
  userFuel: FuelType;
  onOpenArticle: () => void;
  onAddLog: () => void;
  onHistory: () => void;
}

type Status = 'loading' | 'default' | 'error';

// Build a one-line teaser like "RON95 is increasing because crude prices rose."
function mofTeaser(article: MofArticle | null): string {
  if (!article) return 'No recent announcement.';
  try {
    const a = JSON.parse(article.ollamaAnalysis ?? '{}');
    const changes: { fuelType?: string; direction?: string }[] = a.fuelChanges ?? [];
    const reason = String(a.mainReason ?? article.mainReason ?? '').trim();
    const moved = changes.find((c) => c.direction && c.direction !== 'UNCHANGED');
    if (moved) {
      const verb = moved.direction === 'UP' ? 'increasing' : 'decreasing';
      const because = reason ? ` because ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : '';
      return `${moved.fuelType} is ${verb}${because}`.replace(/\.?$/, '.');
    }
    if (reason) return `Prices unchanged — ${reason}`.replace(/\.?$/, '.');
    return article.userTip ?? article.title ?? 'Latest fuel price update.';
  } catch {
    return article.userTip ?? article.mainReason ?? article.title ?? 'Latest fuel price update.';
  }
}

export default function FuelOverview({ userFuel, onOpenArticle, onAddLog, onHistory }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [selected, setSelected] = useState<FuelType>(userFuel);
  const [periodIdx, setPeriodIdx] = useState(1);

  const [prices, setPrices] = useState<FuelPrices | null>(null);
  const [rec, setRec] = useState<RefuelRecommendation | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [predicted, setPredicted] = useState<number[]>([]); // from /fuel/trend (always available)
  const [enhanced, setEnhanced] = useState<EnhancedPrediction | null>(null); // Ollama, best-effort
  const [mof, setMof] = useState<MofArticle | null>(null);
  const [budi, setBudi] = useState<Budi95Status | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [recRefreshing, setRecRefreshing] = useState(false);
  const [predRefreshing, setPredRefreshing] = useState(false);
  const [showPrediction, setShowPrediction] = useState(true);

  const meta = FUEL_META[selected];

  const loadHistory = useCallback(async (fuel: FuelType, weeks: number) => {
    try {
      const res = await fuelApi.getPriceHistory(weeks);
      const list: FuelPrices[] = ((res.data ?? []) as FuelPrices[])
        .slice()
        .sort((a: FuelPrices, b: FuelPrices) => (a.priceDate ?? '').localeCompare(b.priceDate ?? ''));
      const key = FUEL_META[fuel].priceKey;
      setHistory(list.map((p) => num(p[key])).filter((v) => v > 0));
    } catch {
      setHistory([]);
    }
  }, []);

  // Linear-regression forecast (fast, no Ollama) — chart prediction is always present.
  const loadTrend = useCallback(async (fuel: FuelType) => {
    try {
      const res = await fuelApi.getTrend(fuel);
      const t: FuelTrend = res.data;
      setPredicted((t.predicted ?? []).map((v) => num(v)).filter((v) => v > 0).slice(0, 4));
    } catch {
      setPredicted([]);
    }
  }, []);

  // Ollama-backed richer forecast text — best effort, only enriches the banner.
  const loadEnhanced = useCallback(async (fuel: FuelType) => {
    setEnhanced(null);
    try {
      const res = await fuelApi.getEnhancedTrend(fuel);
      setEnhanced(res.data);
    } catch {
      setEnhanced(null);
    }
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setStatus('loading');
      try {
        const [pRes, rRes, mRes, bRes] = await Promise.allSettled([
          fuelApi.getCurrentPrices(),
          fuelApi.getRecommendation(),
          fuelApi.getLatestMOFArticle(),
          fuelApi.getBudi95Status(),
        ]);
        if (pRes.status !== 'fulfilled') throw pRes.reason;
        setPrices(pRes.value.data);
        setRec(rRes.status === 'fulfilled' ? rRes.value.data : null);
        setMof(mRes.status === 'fulfilled' ? mRes.value.data : null);
        setBudi(bRes.status === 'fulfilled' ? bRes.value.data : null);
        setStatus('default');
        loadHistory(selected, PERIODS[periodIdx].weeks);
        loadTrend(selected);
        loadEnhanced(selected);
      } catch {
        setStatus('error');
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [selected, periodIdx, loadHistory, loadTrend, loadEnhanced],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'default') {
      loadHistory(selected, PERIODS[periodIdx].weeks);
      loadTrend(selected);
      loadEnhanced(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, periodIdx]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // Manual refresh of the refuel recommendation (banner).
  const refreshRec = async () => {
    setRecRefreshing(true);
    try {
      const res = await fuelApi.getRecommendation();
      setRec(res.data);
      loadEnhanced(selected);
    } catch {
      /* keep old */
    } finally {
      setRecRefreshing(false);
    }
  };

  // Manual update of the chart prediction (daily regression value).
  const refreshPrediction = async () => {
    setPredRefreshing(true);
    await Promise.all([loadHistory(selected, PERIODS[periodIdx].weeks), loadTrend(selected), loadEnhanced(selected)]);
    setPredRefreshing(false);
  };

  // ── LOADING ──
  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SkeletonBox width="40%" height={26} borderRadius={8} />
          <View style={{ height: 16 }} />
          <SkeletonBox width="100%" height={44} borderRadius={999} />
          <View style={{ height: 14 }} />
          <SkeletonBox width="100%" height={150} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={110} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={190} borderRadius={20} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ERROR ──
  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorWrap}>
          <View style={styles.errorIcon}><WifiOff size={26} color={TEXT_LIGHT} /></View>
          <Text style={styles.errorTitle}>Couldn't load fuel data</Text>
          <Text style={styles.errorMsg}>Check your connection and try again.</Text>
          <Pressable style={styles.retryBtn} onPress={() => load()}>
            <RefreshCw size={16} color={CARD} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── DEFAULT ──
  const price = num(prices?.[meta.priceKey]);
  const dir = enhanced?.prediction;
  const weeklyChange = num(enhanced?.weeklyChangeSen);
  const nextWeek = predicted[0] ?? enhanced?.predictedPrice ?? null;

  const TrendIcon = dir === 'UP' ? TrendingUp : dir === 'DOWN' ? TrendingDown : Minus;
  const trendColor = dir === 'UP' ? FP_DANGER : dir === 'DOWN' ? FP_PRIMARY : TEXT_LIGHT;

  const action = rec?.action ?? 'NORMAL';
  const showBudi = selected === 'RON95_BUDI95' || userFuel === 'RON95_BUDI95';
  const forecastText = enhanced?.reason || (nextWeek != null
    ? `Forecast next week: ${rm(nextWeek)} (${weeklyChange >= 0 ? '+' : ''}${weeklyChange.toFixed(1)} sen/wk).`
    : 'Forecast updating…');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FP_PRIMARY} />}
      >
        {/* header */}
        <View style={styles.header}>
          <View style={styles.rowCenter}>
            <Text style={styles.title}>Fuel Intel</Text>
            <View style={styles.l1Badge}><Text style={styles.l1Text}>L1</Text></View>
          </View>
          <View>
            <Bell size={22} color={TEXT_SECONDARY} />
            {mof ? <View style={styles.bellDot} /> : null}
          </View>
        </View>

        {/* fuel selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {FUEL_ORDER.map((f) => {
            const m = FUEL_META[f];
            const active = selected === f;
            return (
              <Pressable key={f} onPress={() => setSelected(f)} style={[styles.chip, active ? { backgroundColor: m.color, borderColor: m.color } : null]}>
                <Text style={[styles.chipText, active && { color: CARD }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* big price card */}
        <View style={[styles.priceCard, { backgroundColor: meta.bg }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.priceLabel, { color: meta.color }]}>{meta.label}</Text>
              <Text style={[styles.priceValue, { color: meta.color }]}>{price > 0 ? rm(price) : '—'}</Text>
              <Text style={styles.tankText}>Full tank ({TANK_L}L): {price > 0 ? rm(price * TANK_L) : '—'}</Text>
            </View>
            <View style={styles.trendBadge}>
              <TrendIcon size={14} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {weeklyChange !== 0 ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} sen/wk` : 'Stable'}
              </Text>
            </View>
          </View>
          {meta.subsidised ? <View style={styles.subsidyTag}><Text style={styles.subsidyText}>Subsidised</Text></View> : null}
        </View>

        {/* AI recommendation banner */}
        <LinearGradient colors={['#1a1040', FP_AI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBanner}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.rowCenter}>
              <View style={styles.aiIcon}><Zap size={15} color="#FBBF24" /></View>
              <Text style={styles.aiTitle}>  AI Recommendation</Text>
              <View style={{ marginLeft: 8 }}><AiBadge label={action} /></View>
            </View>
            <Pressable onPress={refreshRec} hitSlop={10} style={styles.aiRefresh}>
              {recRefreshing ? <ActivityIndicator size="small" color="#C7C2F0" /> : <RefreshCw size={15} color="#C7C2F0" />}
            </Pressable>
          </View>

          <Text style={styles.aiReason}>{rec?.reason ?? 'Tap refresh for a recommendation.'}</Text>

          <View style={styles.aiMetaRow}>
            {rec?.confidence != null && <Text style={styles.aiMeta}>Confidence: {rec.confidence}%</Text>}
            {num(rec?.suggestedAmount) > 0 && (
              <Text style={styles.aiMetaStrong}>
                Fill {num(rec?.suggestedAmount).toFixed(0)}L{num(rec?.estimatedSavings) > 0 ? ` · save ${rm(rec?.estimatedSavings)}` : ''}
              </Text>
            )}
          </View>

          {/* prediction toggle (chart prediction is independent + always shown) */}
          <Pressable style={styles.predToggle} onPress={() => setShowPrediction((s) => !s)}>
            {showPrediction ? <EyeOff size={13} color="#C7C2F0" /> : <Eye size={13} color="#C7C2F0" />}
            <Text style={styles.predToggleText}>{showPrediction ? 'Hide price prediction' : 'Show price prediction'}</Text>
          </Pressable>
          {showPrediction && (
            <View style={styles.forecastBox}>
              <Text style={styles.forecastText}>{forecastText}</Text>
            </View>
          )}
        </LinearGradient>

        {/* price trend chart */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <Cpu size={14} color={FP_AI} />
              <Text style={styles.cardTitle}>  Price Trend</Text>
              <Pressable onPress={refreshPrediction} hitSlop={8} style={{ marginLeft: 8 }}>
                {predRefreshing ? <ActivityIndicator size="small" color={FP_AI} /> : <RefreshCw size={14} color={FP_AI} />}
              </Pressable>
            </View>
            <View style={styles.periodRow}>
              {PERIODS.map((p, i) => (
                <Pressable key={p.label} onPress={() => setPeriodIdx(i)} style={[styles.periodChip, periodIdx === i && styles.periodChipActive]}>
                  <Text style={[styles.periodText, periodIdx === i && { color: CARD }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {nextWeek != null && (
            <View style={styles.predLabelRow}>
              <View style={styles.predDot} />
              <Text style={styles.predLabel}>AI Predicted next week: {rm(nextWeek)} · updates daily</Text>
            </View>
          )}
          <View style={{ marginTop: 8 }}>
            <PriceTrendChart history={history} predicted={predicted} height={140} />
          </View>
        </View>

        {/* BUDI95 tracker */}
        {showBudi && budi ? <Budi95Tracker budi={budi} /> : null}

        {/* MOF teaser */}
        <Pressable style={styles.mofCard} onPress={onOpenArticle}>
          <View style={styles.mofIcon}><FileText size={18} color={FP_SECONDARY} /></View>
          <View style={{ flex: 1 }}>
            <View style={[styles.rowCenter, { marginBottom: 2 }]}>
              <Text style={styles.mofTitle}>MOF Price Update</Text>
              <View style={{ marginLeft: 8 }}><AiBadge label="AI Summary" /></View>
            </View>
            <Text style={styles.mofText} numberOfLines={2}>{mofTeaser(mof)}</Text>
            <Text style={styles.mofMore}>Read full summary →</Text>
          </View>
          <ChevronRight size={18} color={TEXT_LIGHT} />
        </Pressable>

        <Pressable style={styles.historyLink} onPress={onHistory}>
          <Text style={styles.historyLinkText}>View fuel history →</Text>
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={onAddLog}>
        <Plus size={26} color={CARD} />
      </Pressable>
    </SafeAreaView>
  );
}

function Budi95Tracker({ budi }: { budi: Budi95Status }) {
  const used = num(budi.usedLitres);
  const limit = num(budi.limitLitres) || 300;
  const pctUsed = Math.min(100, (used / limit) * 100);
  const color = pctUsed > 90 ? FP_DANGER : pctUsed > 70 ? FP_WARNING : FP_PRIMARY;
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysToReset = Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000);

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <ShieldCheck size={16} color={FP_PRIMARY} />
          <Text style={styles.cardTitle}>  BUDI95 Quota</Text>
        </View>
        <Text style={styles.budiMeta}>Resets in {daysToReset}d</Text>
      </View>
      <View style={styles.budiBarTrack}>
        <View style={[styles.budiBarFill, { width: `${pctUsed}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.rowBetween}>
        <Text style={[styles.budiUsed, { color }]}>{used.toFixed(1)} L used</Text>
        <Text style={styles.budiLimit}>{num(budi.remainingLitres).toFixed(0)} L left of {limit} L</Text>
      </View>
      {budi.limitExceeded ? <Text style={styles.budiWarn}>Quota reached — market rate now applies.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY },
  l1Badge: { marginLeft: 8, backgroundColor: FP_SECONDARY, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  l1Text: { color: CARD, fontSize: 10, fontWeight: '800' },
  bellDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: FP_DANGER },

  chipScroll: { marginBottom: 14, flexGrow: 0 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },

  priceCard: { borderRadius: 20, padding: 20, marginBottom: 12 },
  priceLabel: { fontSize: 13, fontWeight: '800' },
  priceValue: { fontSize: 36, fontWeight: '800', marginTop: 2 },
  tankText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4, fontWeight: '600' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trendText: { fontSize: 11, fontWeight: '800' },
  subsidyTag: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subsidyText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY },

  aiBanner: { borderRadius: 20, padding: 16, marginBottom: 12 },
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  aiIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { color: CARD, fontSize: 13, fontWeight: '800' },
  aiRefresh: { padding: 4 },
  aiReason: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 18 },
  aiMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  aiMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  aiMetaStrong: { color: '#9FE1CB', fontSize: 11, fontWeight: '800' },
  predToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  predToggleText: { color: '#C7C2F0', fontSize: 11, fontWeight: '700' },
  forecastBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 8 },
  forecastText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18 },

  card: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  periodRow: { flexDirection: 'row', backgroundColor: BACKGROUND, borderRadius: 999, padding: 3 },
  periodChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  periodChipActive: { backgroundColor: FP_PRIMARY },
  periodText: { fontSize: 11, fontWeight: '800', color: TEXT_SECONDARY },
  predLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  predDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: FP_WARNING },
  predLabel: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '700' },

  budiMeta: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '700' },
  budiBarTrack: { height: 12, borderRadius: 6, backgroundColor: '#EEF1F4', overflow: 'hidden', marginTop: 14, marginBottom: 8 },
  budiBarFill: { height: '100%', borderRadius: 6 },
  budiUsed: { fontSize: 13, fontWeight: '800' },
  budiLimit: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '600' },
  budiWarn: { fontSize: 11, color: FP_DANGER, fontWeight: '700', marginTop: 8 },

  mofCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  mofIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E6F1FB', alignItems: 'center', justifyContent: 'center' },
  mofTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  mofText: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },
  mofMore: { fontSize: 11, color: FP_SECONDARY, fontWeight: '700', marginTop: 4 },
  historyLink: { alignItems: 'center', paddingVertical: 16 },
  historyLinkText: { fontSize: 13, fontWeight: '700', color: FP_SECONDARY },

  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: FP_PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: FP_PRIMARY, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  errorMsg: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 6, marginBottom: 18, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
});
