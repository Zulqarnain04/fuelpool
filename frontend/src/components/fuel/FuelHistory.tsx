// src/components/fuel/FuelHistory.tsx — fuel log history (sub-screen 4).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Plus, Droplet, Trash2, TrendingUp, TrendingDown, RefreshCw, WifiOff, Cpu,
} from 'lucide-react-native';
import SkeletonBox from '../common/SkeletonBox';
import MonthlySpendChart from './MonthlySpendChart';
import { FUEL_META } from './fuelMeta';
import { fuelApi } from '../../services/api';
import type { FuelLog, FuelType, Page } from '../../services/api';
import { num, rm } from '../../utils/format';
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_CARPOOL, FP_CARPOOL_LIGHT, FP_DANGER, FP_WARNING,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FILTERS: { label: string; type: FuelType | 'ALL' }[] = [
  { label: 'All', type: 'ALL' },
  { label: 'RON95', type: 'RON95_MARKET' },
  { label: 'RON97', type: 'RON97' },
  { label: 'Diesel', type: 'DIESEL' },
];

interface Stats {
  totalSpend?: number;
  totalLitres?: number;
  avgEfficiency?: number | null;
  monthlyBreakdown?: Record<string, number>;
}

interface Props {
  onBack: () => void;
  onAddLog: () => void;
}

type Status = 'loading' | 'default' | 'empty' | 'error';

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function FuelHistory({ onBack, onAddLog }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FuelType | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [lRes, sRes] = await Promise.allSettled([fuelApi.getLogs(0, 20), fuelApi.getStats()]);
      if (lRes.status !== 'fulfilled') throw lRes.reason;
      const pageData: Page<FuelLog> = lRes.value.data;
      setLogs(pageData.content ?? []);
      setPage(0);
      setLast(!!pageData.last);
      setStats(sRes.status === 'fulfilled' ? sRes.value.data : null);
      setStatus((pageData.content ?? []).length === 0 ? 'empty' : 'default');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fuelApi.getLogs(page + 1, 20);
      const pd: Page<FuelLog> = res.data;
      setLogs((prev) => [...prev, ...(pd.content ?? [])]);
      setPage((p) => p + 1);
      setLast(!!pd.last);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  const onDelete = (id: number) => {
    Alert.alert('Delete log', 'Remove this fill-up entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fuelApi.deleteLog(id);
            setLogs((prev) => prev.filter((l) => l.id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete the log.');
          }
        },
      },
    ]);
  };

  const filtered = useMemo(
    () => (filter === 'ALL' ? logs : logs.filter((l) => l.fuelType === filter)),
    [logs, filter],
  );
  const avgEff = stats?.avgEfficiency != null ? num(stats.avgEfficiency) : null;

  // monthly chart (last 6 months)
  const { monthEntries, curLabel, curSpend, prevSpend, delta, fillUpsThisMonth } = useMemo(() => {
    const monthly = stats?.monthlyBreakdown ?? {};
    const entries = Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => ({ label: MONTHS[parseInt(k.split('-')[1], 10) - 1], value: num(v) }));
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cLabel = MONTHS[now.getMonth()];
    const cSpend = num(monthly[curKey]);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const pSpend = num(monthly[prevKey]);
    const d = pSpend > 0 ? ((cSpend - pSpend) / pSpend) * 100 : 0;
    const fillUps = logs.filter((l) => (l.logDate ?? '').startsWith(curKey)).length;
    return { monthEntries: entries, curLabel: cLabel, curSpend: cSpend, prevSpend: pSpend, delta: d, fillUpsThisMonth: fillUps };
  }, [stats, logs]);

  const Header = () => (
    <View>
      {/* hero */}
      <LinearGradient colors={[FP_PRIMARY, FP_CARPOOL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroMonth}>{curLabel} {new Date().getFullYear()}</Text>
        <Text style={styles.heroSpend}>{rm(curSpend)}</Text>
        {prevSpend > 0 ? (
          <Text style={styles.heroDelta}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}% vs last month
          </Text>
        ) : (
          <Text style={styles.heroDelta}>Total fuel spend this month</Text>
        )}
        <View style={styles.heroStats}>
          <HeroStat label="Fill-ups" value={`${fillUpsThisMonth}`} />
          <HeroStat label="Total litres" value={`${num(stats?.totalLitres).toFixed(0)} L`} />
          <HeroStat label="Avg eff." value={avgEff != null ? `${avgEff.toFixed(1)} km/L` : '—'} />
        </View>
      </LinearGradient>

      {/* monthly chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly spend</Text>
        <View style={{ marginTop: 10 }}>
          <MonthlySpendChart data={monthEntries} highlightLabel={curLabel} />
        </View>
      </View>

      {/* AI analysis */}
      {avgEff != null ? (
        <View style={styles.aiCard}>
          <Cpu size={16} color="#534AB7" />
          <Text style={styles.aiText}>
            Your average efficiency is {avgEff.toFixed(1)} km/L across logged fill-ups. Consistent full-tank logging keeps this accurate.
          </Text>
        </View>
      ) : null}

      {/* filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.type;
          return (
            <Pressable
              key={f.label}
              onPress={() => setFilter(f.type)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${f.label}${active ? ', selected' : ''}`}
            >
              <Text style={[styles.filterText, active && { color: CARD }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar onBack={onBack} onAddLog={onAddLog} />
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonBox width="100%" height={150} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={120} borderRadius={20} />
          <View style={{ height: 12 }} />
          {[0, 1, 2].map((i) => (
            <SkeletonBox key={i} width="100%" height={72} borderRadius={16} style={{ marginBottom: 10 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar onBack={onBack} onAddLog={onAddLog} />
        <View style={styles.center}>
          <View style={styles.errIcon}><WifiOff size={26} color={TEXT_LIGHT} /></View>
          <Text style={styles.errTitle}>Couldn't load history</Text>
          <Pressable style={styles.retryBtn} onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading fuel history">
            <RefreshCw size={16} color={CARD} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar onBack={onBack} onAddLog={onAddLog} />
        <View style={styles.center}>
          <View style={styles.emptyCircle}><Droplet size={32} color={FP_PRIMARY} /></View>
          <Text style={styles.errTitle}>No Fuel Logs Yet</Text>
          <Text style={styles.emptySub}>Log your first fill-up to start tracking spend and efficiency.</Text>
          <Pressable style={styles.retryBtn} onPress={onAddLog} accessibilityRole="button" accessibilityLabel="Log your first fill-up">
            <Plus size={16} color={CARD} />
            <Text style={styles.retryText}>Log First Fill-up</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar onBack={onBack} onAddLog={onAddLog} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={FP_PRIMARY} style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <FuelLogEntry
            item={item}
            avgEff={avgEff}
            isOpen={expanded === item.id}
            onToggle={() => setExpanded((cur) => (cur === item.id ? null : item.id))}
            onDelete={onDelete}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.noFilter}>No {filter === 'ALL' ? '' : FUEL_META[filter as FuelType]?.label + ' '}logs to show.</Text>
        }
      />
    </SafeAreaView>
  );
}

function TopBar({ onBack, onAddLog }: { onBack: () => void; onAddLog: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
        <ArrowLeft size={22} color={TEXT_PRIMARY} />
      </Pressable>
      <Text style={styles.topTitle}>Fuel History</Text>
      <Pressable onPress={onAddLog} hitSlop={10} accessibilityRole="button" accessibilityLabel="Log a new fill-up">
        <Plus size={22} color={TEXT_PRIMARY} />
      </Pressable>
    </View>
  );
}

const FuelLogEntry = React.memo(function FuelLogEntry({
  item,
  avgEff,
  isOpen,
  onToggle,
  onDelete,
}: {
  item: FuelLog;
  avgEff: number | null;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: number) => void;
}) {
  const m = item.fuelType ? FUEL_META[item.fuelType] : null;
  const eff = item.efficiencyThisFill != null ? num(item.efficiencyThisFill) : null;
  return (
    <Pressable
      style={styles.logCard}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${item.stationName || 'Fuel station'} fill-up on ${fmtDate(item.logDate)}, ${rm(item.totalCost)}${isOpen ? ', expanded' : ', collapsed'}`}
    >
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View style={[styles.logIcon, { backgroundColor: m?.bg ?? '#E6F1FB' }]}>
            <Droplet size={16} color={m?.color ?? FP_PRIMARY} />
          </View>
          <View>
            <Text style={styles.logStation}>{item.stationName || 'Fuel station'}</Text>
            <Text style={styles.logDate}>{fmtDate(item.logDate)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.logCost}>{rm(item.totalCost)}</Text>
          {m ? <Text style={[styles.logType, { color: m.color }]}>{m.label}</Text> : null}
        </View>
      </View>

      <View style={styles.logMetaRow}>
        <Text style={styles.logMeta}>{num(item.litresFilled).toFixed(2)} L · {rm(item.pricePerLitre)}/L</Text>
        {eff != null ? (
          <View style={styles.effBadge}>
            {eff >= (avgEff ?? 0) ? <TrendingUp size={11} color={FP_PRIMARY} /> : <TrendingDown size={11} color={FP_WARNING} />}
            <Text style={[styles.effText, { color: eff >= (avgEff ?? 0) ? FP_PRIMARY : FP_WARNING }]}>{eff.toFixed(1)} km/L</Text>
          </View>
        ) : null}
      </View>

      {isOpen ? (
        <View style={styles.expand}>
          <Detail label="Odometer" value={item.odometer != null ? `${item.odometer} km` : '—'} />
          <Detail label="Distance since last" value={item.distanceSinceLast != null ? `${item.distanceSinceLast} km` : '—'} />
          <Detail label="Cost per km" value={item.costPerKm != null ? rm(item.costPerKm, 3) : '—'} />
          <Detail label="Full tank" value={item.fullTank ? 'Yes' : 'No'} />
          {item.notes ? <Detail label="Notes" value={item.notes} /> : null}
          <Pressable
            style={styles.deleteBtn}
            onPress={() => onDelete(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Delete this fill-up entry"
          >
            <Trash2 size={14} color={FP_DANGER} />
            <Text style={styles.deleteText}>Delete entry</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
});

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },

  hero: { borderRadius: 20, padding: 20, marginBottom: 12 },
  heroMonth: { color: FP_CARPOOL_LIGHT, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroSpend: { color: CARD, fontSize: 34, fontWeight: '800', marginTop: 2 },
  heroDelta: { color: FP_CARPOOL_LIGHT, fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroStats: { flexDirection: 'row', marginTop: 16, gap: 10 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 },
  heroStatValue: { color: CARD, fontSize: 15, fontWeight: '800' },
  heroStatLabel: { color: FP_CARPOOL_LIGHT, fontSize: 10, fontWeight: '600', marginTop: 2 },

  card: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  aiCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EEEDFE', borderRadius: 16, padding: 14, marginBottom: 12 },
  aiText: { flex: 1, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 18 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD },
  filterChipActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  filterText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },

  logCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  logIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logStation: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  logDate: { fontSize: 11, color: TEXT_LIGHT, marginTop: 1 },
  logCost: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  logType: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  logMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  logMeta: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  effBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  effText: { fontSize: 12, fontWeight: '800' },
  expand: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: TEXT_SECONDARY },
  detailValue: { fontSize: 12, fontWeight: '700', color: TEXT_PRIMARY },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: FP_DANGER },
  deleteText: { color: FP_DANGER, fontSize: 13, fontWeight: '700' },
  noFilter: { textAlign: 'center', color: TEXT_LIGHT, fontSize: 13, marginTop: 20 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: FP_PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 6, marginBottom: 18, maxWidth: 250 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
});
