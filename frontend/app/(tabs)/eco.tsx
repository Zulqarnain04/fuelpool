// app/(tabs)/eco.tsx — EcoTrack detailed (L3): carbon, leaderboard, habits, monthly.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Cpu, Trophy, Leaf, Gauge, Clock, ShieldCheck, Users, RefreshCw, WifiOff, Sparkles,
} from 'lucide-react-native';
import AiBadge from '../../src/components/common/AiBadge';
import SkeletonBox from '../../src/components/common/SkeletonBox';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';
import { StackedBars, MiniLine, Donut } from '../../src/components/eco/EcoCharts';
import useAuth from '../../src/hooks/useAuth';
import { ecoApi, userApi, fuelApi } from '../../src/services/api';
import type { EcoWeekly, EcoLeaderRow, EcoHabits, EcoMonthly, FuelLog, Page } from '../../src/services/api';
import { num, rm, initialsOf } from '../../src/utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_AI, FP_WARNING, FP_DANGER, FP_SECONDARY, FP_CARPOOL,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../src/constants/colors';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEIGHTS = [0.16, 0.15, 0.16, 0.18, 0.17, 0.1, 0.08]; // synthetic daily shape (no per-day API data)
type Status = 'loading' | 'default' | 'error';

function weekRange(weekStartIso?: string): string {
  const start = weekStartIso ? new Date(weekStartIso) : (() => { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d; })();
  const end = new Date(start.getTime() + 6 * 86400000);
  return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
}

export default function EcoTab() {
  return (
    <ErrorBoundary>
      <EcoTabContent />
    </ErrorBoundary>
  );
}

function EcoTabContent() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [weekly, setWeekly] = useState<EcoWeekly | null>(null);
  const [leaders, setLeaders] = useState<EcoLeaderRow[]>([]);
  const [habits, setHabits] = useState<EcoHabits | null>(null);
  const [monthly, setMonthly] = useState<EcoMonthly | null>(null);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [myId, setMyId] = useState<number | undefined>(user?.userId);
  const [aiText, setAiText] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lbFilter, setLbFilter] = useState<'week' | 'month' | 'all'>('week');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus('loading');
    try {
      const [wRes, lRes, hRes, mRes, meRes, fRes] = await Promise.allSettled([
        ecoApi.getWeeklyStats(0), ecoApi.getLeaderboard(), ecoApi.getHabits(),
        ecoApi.getMonthlyStats(), userApi.getMe(), fuelApi.getLogs(0, 6),
      ]);
      if (wRes.status !== 'fulfilled') throw wRes.reason;
      const w: EcoWeekly = wRes.value.data;
      setWeekly(w);
      setAiText(w.ollamaSummary ?? null);
      setLeaders(lRes.status === 'fulfilled' ? lRes.value.data ?? [] : []);
      setHabits(hRes.status === 'fulfilled' ? hRes.value.data : null);
      setMonthly(mRes.status === 'fulfilled' ? mRes.value.data : null);
      if (meRes.status === 'fulfilled') setMyId(meRes.value.data?.id);
      const page: Page<FuelLog> | undefined = fRes.status === 'fulfilled' ? fRes.value.data : undefined;
      setLogs(page?.content ?? []);
      setStatus('default');
    } catch {
      setStatus('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await ecoApi.generateSummary();
      setAiText(res.data?.summary ?? aiText);
    } catch {
      /* keep old */
    } finally {
      setGenerating(false);
    }
  };

  // chart data — must run on every render (hooks can't follow early returns)
  const carpool = weekly?.carpoolTrips ?? 0;
  const solo = weekly?.soloTrips ?? 0;
  const days = useMemo(
    () => WEIGHTS.map((wt) => ({ carpool: Math.round(carpool * wt * 1.4), solo: Math.round(solo * wt * 1.4) })),
    [carpool, solo],
  );

  // refuel interval from recent logs
  const refuelDays = useMemo(() => {
    const sortedLogs = [...logs].filter((l) => l.logDate).sort((a, b) => (b.logDate ?? '').localeCompare(a.logDate ?? ''));
    if (sortedLogs.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < sortedLogs.length - 1; i++) {
      total += (new Date(sortedLogs[i].logDate!).getTime() - new Date(sortedLogs[i + 1].logDate!).getTime()) / 86400000;
    }
    return Math.round(total / (sortedLogs.length - 1));
  }, [logs]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <SkeletonBox width="40%" height={26} borderRadius={8} />
          <View style={{ height: 16 }} />
          <SkeletonBox width="100%" height={170} borderRadius={20} />
          <View style={{ height: 12 }} />
          <View style={styles.grid}>{[0, 1, 2, 3].map((i) => <SkeletonBox key={i} width="48%" height={70} borderRadius={14} style={{ marginBottom: 10 }} />)}</View>
          <SkeletonBox width="100%" height={120} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={200} borderRadius={20} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (status === 'error' || !weekly) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <WifiOff size={26} color={TEXT_LIGHT} />
          <Text style={styles.errTitle}>Couldn't load EcoTrack</Text>
          <Pressable style={styles.retry} onPress={() => load()} accessibilityRole="button" accessibilityLabel="Retry loading EcoTrack"><RefreshCw size={15} color={CARD} /><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // derived
  const carbonSaved = num(weekly.carbonSavedKg);
  const trees = num(weekly.treesEquivalent);
  const myRank = weekly.communityRank ?? leaders.findIndex((l) => l.user?.id === myId) + 1;
  const totalUsers = weekly.totalUsersRanked ?? leaders.length;

  const effStatus = habits?.efficiencyStatus ?? 'AVERAGE';
  const effColor = effStatus === 'GOOD' ? FP_PRIMARY : effStatus === 'BELOW' ? FP_DANGER : FP_WARNING;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={FP_PRIMARY} />}
      >
        <View style={styles.header}>
          <View style={styles.rowCenter}><Leaf size={20} color={FP_PRIMARY} /><Text style={styles.title}>  EcoTrack</Text></View>
          <View style={styles.dateChip}><Text style={styles.dateText}>{weekRange(weekly.weekStartDate)}</Text></View>
        </View>

        {/* SECTION 1: hero */}
        <View style={styles.hero}>
          <Text style={styles.heroNum}>{carbonSaved.toFixed(1)} kg</Text>
          <Text style={styles.heroLabel}>CO₂ saved this week</Text>
          <Text style={styles.heroSub}>= {trees.toFixed(1)} trees × 1 day 🌳</Text>
          <View style={{ marginTop: 12 }}><StackedBars days={days} /></View>
          <View style={styles.legendRow}>
            <View style={styles.rowCenter}><View style={[styles.dot, { backgroundColor: FP_PRIMARY }]} /><Text style={styles.legendText}>  Carpool</Text></View>
            <View style={[styles.rowCenter, { marginLeft: 16 }]}><View style={[styles.dot, { backgroundColor: FP_DANGER }]} /><Text style={styles.legendText}>  Solo</Text></View>
          </View>
        </View>

        {/* SECTION 2: 2x2 grid */}
        <View style={[styles.grid, { marginTop: 12 }]}>
          <Stat label="Total trips" value={`${weekly.totalTrips ?? 0}`} />
          <Stat label="Carpool trips" value={`${carpool}`} accent />
          <Stat label="Solo trips" value={`${solo}`} />
          <Stat label="Fuel spent" value={rm(weekly.totalFuelCost)} />
          <Stat label="Carbon saved" value={`${carbonSaved.toFixed(1)} kg`} accent />
          <Stat label="Saved vs Grab" value={rm(weekly.savedVsGrab)} accent />
        </View>

        {/* SECTION 3: AI coaching */}
        <LinearGradient colors={['#1a1040', FP_AI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
          <View style={[styles.rowCenter, { marginBottom: 8 }]}>
            <Cpu size={16} color="#C7C2F0" /><Text style={styles.aiTitle}>  Your weekly insight</Text>
            <View style={{ marginLeft: 8 }}><AiBadge label="Ollama" /></View>
          </View>
          <Text style={styles.aiBody}>{aiText ?? 'Generate your first AI coaching insight from this week’s driving.'}</Text>
          <Pressable
            style={styles.genBtn}
            onPress={generate}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel={generating ? 'Generating AI insight' : 'Generate new AI insight'}
          >
            {generating ? <ActivityIndicator size="small" color={CARD} /> : <Sparkles size={13} color={CARD} />}
            <Text style={styles.genText}>{generating ? 'Generating…' : 'Generate new insight'}</Text>
          </Pressable>
          <Text style={styles.aiFooter}>Generated by llama3.2:3b</Text>
        </LinearGradient>

        {/* SECTION 4: leaderboard */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}><Trophy size={16} color={FP_WARNING} /><Text style={styles.sectionTitle}>  Campus EcoDrivers</Text></View>
            <Text style={styles.sectionMeta}>{weekRange(weekly.weekStartDate)}</Text>
          </View>

          <View style={styles.rankBanner}>
            <Text style={styles.rankBannerText}>You are #{myRank > 0 ? myRank : '—'} of {totalUsers} campus users</Text>
          </View>

          <View style={styles.filterRow}>
            {([['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const).map(([k, lbl]) => (
              <Pressable
                key={k}
                onPress={() => setLbFilter(k)}
                style={[styles.filterChip, lbFilter === k && styles.filterActive]}
                accessibilityRole="button"
                accessibilityLabel={`${lbl}${lbFilter === k ? ', selected' : ''}`}
              >
                <Text style={[styles.filterText, lbFilter === k && { color: CARD }]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            {leaders.slice(0, 10).map((row, i) => {
              const me = row.user?.id === myId;
              const medal = i === 0 ? '#FBBF24' : i === 1 ? '#9CA3AF' : i === 2 ? '#D08B5B' : null;
              return (
                <View key={row.id ?? i} style={[styles.lbRow, me && styles.lbRowMe]}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <View style={[styles.lbAvatar, medal ? { borderColor: medal, borderWidth: 2 } : null]}>
                    <Text style={styles.lbAvatarText}>{initialsOf(row.user?.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbName} numberOfLines={1}>{row.user?.name ?? 'User'}{me ? ' (You)' : ''}</Text>
                    <Text style={styles.lbScore}>Eco score {num(row.ecoScore).toFixed(0)}</Text>
                  </View>
                  <Text style={styles.lbCo2}>{num(row.carbonSavedKg).toFixed(1)} kg</Text>
                </View>
              );
            })}
            {leaders.length === 0 ? <Text style={styles.emptyText}>No leaderboard data yet.</Text> : null}
          </View>
        </View>

        {/* SECTION 5: driving habits */}
        <Text style={styles.groupHeading}>Driving habits</Text>

        {/* A: efficiency trend */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}><Gauge size={15} color={FP_SECONDARY} /><Text style={styles.cardTitle}>  Efficiency trend</Text></View>
            <View style={[styles.statusBadge, { backgroundColor: effColor }]}><Text style={styles.statusText}>{effStatus}</Text></View>
          </View>
          <View style={{ marginTop: 8 }}><MiniLine values={habits?.efficiencyTrend ?? []} color={effColor} /></View>
          <Text style={styles.cardMeta}>Your avg: {num(habits?.avgEfficiencyKmPerL).toFixed(1)} km/L · Vehicle default: {num(habits?.vehicleDefaultEfficiency).toFixed(1)} km/L</Text>
        </View>

        {/* B: refuel pattern */}
        <View style={styles.card}>
          <View style={styles.rowCenter}><Clock size={15} color={FP_PRIMARY} /><Text style={styles.cardTitle}>  Refuelling pattern</Text></View>
          <Text style={styles.bigStat}>{refuelDays > 0 ? `~${refuelDays} days` : 'Log more fills'}</Text>
          <Text style={styles.cardMeta}>{refuelDays > 0 ? `You refuel roughly every ${refuelDays} days` : 'Add a few fuel logs to see your refuelling rhythm.'}</Text>
        </View>

        {/* C: BUDI95 (conditional) */}
        {habits?.budi95 ? (
          <View style={styles.card}>
            <View style={styles.rowCenter}><ShieldCheck size={15} color={FP_PRIMARY} /><Text style={styles.cardTitle}>  BUDI95 usage</Text></View>
            <View style={styles.budiTrack}>
              <View style={{ width: `${Math.min(100, (num(habits.budi95.usedLitres) / (num(habits.budi95.limitLitres) || 300)) * 100)}%`, height: '100%', borderRadius: 6, backgroundColor: habits.budi95.limitExceeded ? FP_DANGER : FP_PRIMARY }} />
            </View>
            <Text style={styles.cardMeta}>{num(habits.budi95.usedLitres).toFixed(1)} L used of {num(habits.budi95.limitLitres) || 300} L this month</Text>
          </View>
        ) : null}

        {/* D: carpool frequency */}
        <View style={styles.card}>
          <View style={styles.rowCenter}><Users size={15} color={FP_CARPOOL} /><Text style={styles.cardTitle}>  Carpool frequency</Text></View>
          <View style={styles.donutRow}>
            <Donut percent={num(habits?.carpoolRatePercent)} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.bigStat}>{habits?.carpoolTripsThisWeek ?? carpool} of {habits?.totalTripsThisWeek ?? weekly.totalTrips ?? 0}</Text>
              <Text style={styles.cardMeta}>trips this week were shared</Text>
              <View style={[styles.statusBadge, { backgroundColor: FP_PRIMARY, alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={styles.statusText}>{num(habits?.carpoolRatePercent) >= 50 ? 'Eco champion' : 'Keep sharing'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 6: monthly */}
        {monthly ? (
          <>
            <Text style={styles.groupHeading}>{monthly.month ?? 'This month'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <MonthCard label="Saved vs solo" value={rm(monthly.totalSavedVsSolo)} />
              <MonthCard label="Saved vs Grab" value={rm(monthly.totalSavedVsGrab)} />
              <MonthCard label="CO₂ saved" value={`${num(monthly.totalCarbonSavedKg).toFixed(1)} kg`} />
              <MonthCard label="Carpool trips" value={`${monthly.totalCarpoolTrips ?? 0}`} />
            </ScrollView>
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: FP_PRIMARY }]}>{value}</Text>
    </View>
  );
}
function MonthCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.monthCard}>
      <Text style={styles.monthValue}>{value}</Text>
      <Text style={styles.monthLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY },
  dateChip: { backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dateText: { fontSize: 12, fontWeight: '800', color: FP_PRIMARY },

  hero: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 20 },
  heroNum: { fontSize: 36, fontWeight: '800', color: FP_PRIMARY },
  heroLabel: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginTop: 2 },
  heroSub: { fontSize: 12, color: TEXT_LIGHT, marginTop: 4 },
  legendRow: { flexDirection: 'row', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 10 },
  statLabel: { fontSize: 10, color: TEXT_SECONDARY, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 4 },

  aiCard: { borderRadius: 20, padding: 16, marginTop: 4, marginBottom: 12 },
  aiTitle: { color: CARD, fontSize: 14, fontWeight: '800' },
  aiBody: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingVertical: 9, marginTop: 12 },
  genText: { color: CARD, fontSize: 12, fontWeight: '800' },
  aiFooter: { color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 8, textAlign: 'center' },

  section: { marginTop: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  sectionMeta: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600' },
  rankBanner: { backgroundColor: FP_PRIMARY, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  rankBannerText: { color: CARD, fontSize: 14, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD },
  filterActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  filterText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 10 },
  lbRowMe: { backgroundColor: FP_PRIMARY_LIGHT, borderColor: FP_PRIMARY },
  lbRank: { width: 20, fontSize: 13, fontWeight: '800', color: TEXT_SECONDARY, textAlign: 'center' },
  lbAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: FP_SECONDARY, alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { color: CARD, fontSize: 12, fontWeight: '800' },
  lbName: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY },
  lbScore: { fontSize: 11, color: TEXT_LIGHT },
  lbCo2: { fontSize: 13, fontWeight: '800', color: FP_PRIMARY },
  emptyText: { fontSize: 12, color: TEXT_LIGHT, textAlign: 'center', paddingVertical: 12 },

  groupHeading: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  cardMeta: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 8 },
  bigStat: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { color: CARD, fontSize: 10, fontWeight: '800' },
  budiTrack: { height: 12, borderRadius: 6, backgroundColor: '#EEF1F4', overflow: 'hidden', marginTop: 12 },
  donutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  monthCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, width: 130 },
  monthValue: { fontSize: 18, fontWeight: '800', color: FP_PRIMARY },
  monthLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
});
