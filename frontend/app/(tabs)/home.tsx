// app/(tabs)/home.tsx — L3 main dashboard. Aggregates L1 (fuel), L2 (carpool), L3 (eco).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import {
  Award,
  Leaf,
  Users,
  Fuel,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  Cpu,
  ChevronRight,
  Droplet,
  ShieldCheck,
  Star,
  Car,
  WifiOff,
  CircleAlert,
  RefreshCw,
  Zap,
} from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import AiBadge from '../../src/components/common/AiBadge';
import SkeletonBox from '../../src/components/common/SkeletonBox';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';
import NotificationBanner from '../../src/components/home/NotificationBanner';
import { checkPendingNotification, markNotificationsSeen, type PendingNotification } from '../../src/utils/notifications';
import { ecoApi, carpoolApi, fuelApi } from '../../src/services/api';
import type { DashboardResponse, EcoWeekly, RideSummary } from '../../src/services/api';
import {
  FP_PRIMARY,
  FP_PRIMARY_LIGHT,
  FP_SECONDARY,
  FP_SECONDARY_LIGHT,
  FP_CARPOOL,
  FP_CARPOOL_LIGHT,
  FP_AI,
  FP_WARNING,
  FP_DANGER,
  BACKGROUND,
  CARD,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
} from '../../src/constants/colors';

// ── helpers ───────────────────────────────────────────────────────────────────
const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};
const rm = (v: unknown) => `RM ${num(v).toFixed(2)}`;
const initialsOf = (name?: string) => {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
};
const greetingFor = (h: number) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
const fmtTime = (iso?: string) => {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return '';
  }
};
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6

type Status = 'loading' | 'default' | 'empty' | 'error';

// ── SVG weekly bar chart ───────────────────────────────────────────────────────
function WeeklyBarChart({ values, highlight }: { values: number[]; highlight: number }) {
  const W = 320;
  const H = 64;
  const padX = 4;
  const barW = 16;
  const max = Math.max(...values, 1);
  const gap = (W - padX * 2 - barW * 7) / 6;
  return (
    <Svg width="100%" height={H + 18} viewBox={`0 0 ${W} ${H + 18}`}>
      {values.map((v, i) => {
        const bh = Math.max(4, (v / max) * (H - 8));
        const x = padX + i * (barW + gap);
        const y = H - bh;
        const hi = i === highlight;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={bh} rx={4} fill={hi ? FP_PRIMARY : '#BBE9D6'} />
            <SvgText
              x={x + barW / 2}
              y={H + 13}
              fontSize={9}
              fontWeight="600"
              fill={hi ? FP_PRIMARY : TEXT_LIGHT}
              textAnchor="middle"
            >
              {DAY_LABELS[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ── small UI pieces ────────────────────────────────────────────────────────────
function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.pill}>
      {icon}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.rowCenter}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}

function HomeContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [status, setStatus] = useState<Status>('loading');
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [eco, setEco] = useState<EcoWeekly | null>(null);
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [aiText, setAiText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [notification, setNotification] = useState<PendingNotification | null>(null);

  const fuelAnim = useRef(new Animated.Value(0)).current;
  const alertAnim = useRef(new Animated.Value(1)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus('loading');
    setAlertDismissed(false);
    alertAnim.setValue(1);
    try {
      const [dRes, eRes, rRes, mRes] = await Promise.allSettled([
        ecoApi.getDashboard(),
        ecoApi.getWeeklyStats(0),
        carpoolApi.getRides({ status: 'OPEN' }),
        fuelApi.getLatestMOFArticle(),
      ]);
      if (dRes.status !== 'fulfilled') throw dRes.reason;

      const d: DashboardResponse = dRes.value.data;
      const e: EcoWeekly = eRes.status === 'fulfilled' ? eRes.value.data : {};
      const rd: RideSummary[] = rRes.status === 'fulfilled' ? rRes.value.data ?? [] : [];
      const mofId: number | undefined = mRes.status === 'fulfilled' ? mRes.value.data?.id : undefined;

      setDash(d);
      setEco(e);
      setRides(rd.slice(0, 2));

      checkPendingNotification(e, mofId).then(setNotification);
      markNotificationsSeen(e, mofId);

      // AI insight text — use cached summary, else generate in the background.
      if (e.ollamaSummary) {
        setAiText(e.ollamaSummary);
      } else {
        setAiText(d.rankSummary ?? null);
        ecoApi
          .generateSummary()
          .then((g) => setAiText(g.data?.summary ?? d.rankSummary ?? null))
          .catch(() => {});
      }

      const hasData = d.vehicleSetUp || (e.totalTrips ?? 0) > 0 || num(d.weeklySavedVsGrab) > 0;
      setStatus(hasData ? 'default' : 'empty');
    } catch {
      setStatus('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [alertAnim]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status === 'default' && dash?.remainingFuelPct != null) {
      fuelAnim.setValue(0);
      Animated.timing(fuelAnim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
    }
  }, [status, dash, fuelAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const dismissAlert = () => {
    Animated.timing(alertAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
      setAlertDismissed(true),
    );
  };

  // bar chart values derived from weekly total (no per-day data from API)
  const weekTotal = num(dash?.weeklySavedVsSolo) || num(eco?.savedVsSolo);
  const barValues = useMemo(() => {
    const weights = [0.16, 0.14, 0.15, 0.2, 0.18, 0.1, 0.07];
    return weights.map((w) => Math.max(1, Math.round(weekTotal * w)));
  }, [weekTotal]);

  // ── Greeting (shared by default + empty) ──
  const dateStr = format(new Date(), 'EEEE, d MMM');
  const greeting = greetingFor(new Date().getHours());
  const firstName = (user?.name ?? 'there').split(' ')[0];

  const GreetingCard = ({ minimal = false }: { minimal?: boolean }) => (
    <LinearGradient
      colors={[FP_PRIMARY, FP_CARPOOL]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.greetCard}
    >
      <View style={styles.greetTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetDate}>{dateStr.toUpperCase()}</Text>
          <Text style={styles.greetHello}>{minimal ? 'Welcome,' : `${greeting},`}</Text>
          <Text style={styles.greetName}>{firstName} 👋</Text>
          {!minimal && dash ? (
            <Text style={styles.greetSub}>You've saved {rm(dash.weeklySavedVsGrab)} this week</Text>
          ) : (
            <Text style={styles.greetSub}>Let's set up your first journey.</Text>
          )}
        </View>
        <Pressable onPress={() => router.push('/profile')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open profile">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
            <View style={styles.onlineDot} />
          </View>
        </Pressable>
      </View>

      {!minimal && dash ? (
        <View style={styles.pillRow}>
          <Pill
            icon={<Award size={11} color={CARD} />}
            label={`Top ${Math.round(dash.percentile ?? 0)}% Saver`}
          />
          <Pill
            icon={<Leaf size={11} color={CARD} />}
            label={`${num(dash.weeklyCarbonSavedKg).toFixed(1)} kg CO₂`}
          />
          <Pill
            icon={<Users size={11} color={CARD} />}
            label={`${eco?.carpoolTrips ?? 0} rides shared`}
          />
        </View>
      ) : null}
    </LinearGradient>
  );

  // ── LOADING ──
  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SkeletonBox width="100%" height={150} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={64} borderRadius={16} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={150} borderRadius={20} />
          <View style={{ height: 12 }} />
          <View style={styles.grid2}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBox key={i} width="48%" height={80} borderRadius={16} style={{ marginBottom: 10 }} />
            ))}
          </View>
          <SkeletonBox width="100%" height={112} borderRadius={20} />
          <View style={{ height: 12 }} />
          {[0, 1].map((i) => (
            <SkeletonBox key={i} width="100%" height={120} borderRadius={20} style={{ marginBottom: 10 }} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ERROR ──
  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.errorHeader}>
            <WifiOff size={26} color={TEXT_LIGHT} />
          </View>
          <View style={styles.errorBody}>
            <View style={styles.errorIcon}>
              <CircleAlert size={28} color={FP_DANGER} />
            </View>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMsg}>
              Unable to load your dashboard. Check your connection and try again.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => load()} accessibilityRole="button" accessibilityLabel="Retry loading dashboard">
              <RefreshCw size={16} color={CARD} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>

          {dash ? (
            <View style={[styles.card, { opacity: 0.6, marginTop: 8 }]}>
              <Text style={styles.cachedLabel}>Showing cached data</Text>
              <View style={styles.grid2}>
                <StatCard emoji="💰" label="Fuel Saved" value={rm(dash.weeklySavedVsSolo)} />
                <StatCard emoji="🌿" label="CO₂ Reduced" value={`${num(dash.weeklyCarbonSavedKg).toFixed(1)} kg`} />
              </View>
            </View>
          ) : null}

          <View style={styles.errCodeCard}>
            <Text style={styles.errCode}>FuelPool API · /api/dashboard</Text>
            <Text style={styles.errCodeSub}>Our servers may be temporarily unavailable.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── EMPTY ──
  if (status === 'empty') {
    const setupCards = [
      { icon: <Fuel size={20} color={FP_SECONDARY} />, bg: FP_SECONDARY_LIGHT, label: 'Log Fuel', desc: 'Track your spend', cta: 'Log', go: () => router.push('/(tabs)/fuel') },
      { icon: <Users size={20} color={FP_CARPOOL} />, bg: FP_PRIMARY_LIGHT, label: 'Find Carpool', desc: 'Match nearby drivers', cta: 'Browse', go: () => router.push('/(tabs)/ride') },
      { icon: <Car size={20} color={FP_AI} />, bg: '#EEEDFE', label: 'Set Up Vehicle', desc: 'For fuel estimates', cta: 'Setup', go: () => router.push('/(onboarding)/vehicle') },
    ];
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FP_PRIMARY} />}
        >
          <GreetingCard minimal />
          <View style={styles.emptyHero}>
            <View style={styles.emptyCircle}>
              <Droplet size={34} color={FP_PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>Log a fill-up or join a carpool to start tracking your impact.</Text>
          </View>
          <View style={{ gap: 10, marginTop: 8 }}>
            {setupCards.map((c) => (
              <View key={c.label} style={styles.setupCard}>
                <View style={[styles.setupIcon, { backgroundColor: c.bg }]}>{c.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.setupLabel}>{c.label}</Text>
                  <Text style={styles.setupDesc}>{c.desc}</Text>
                </View>
                <Pressable style={styles.setupBtn} onPress={c.go} accessibilityRole="button" accessibilityLabel={`${c.cta}: ${c.label}`}>
                  <Text style={styles.setupBtnText}>{c.cta}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.aiTip}>
            <Cpu size={16} color={FP_AI} />
            <Text style={styles.aiTipText}>
              Users who log their first fill-up save an average of RM 38/month within 4 weeks.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DEFAULT ──
  const pct = Math.min(100, Math.max(0, dash?.remainingFuelPct ?? 0));
  const fuelColor = pct > 50 ? FP_PRIMARY : pct >= 25 ? FP_WARNING : FP_DANGER;
  const widthInterp = fuelAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] });

  const action = dash?.refuelAction ?? 'NORMAL';
  const showAlert = action !== 'NORMAL' && !alertDismissed;
  const isWait = action === 'WAIT';

  const prices = dash?.currentPrices;
  const priceChips = [
    { label: 'RON95', value: prices?.ron95, color: FP_PRIMARY, bg: FP_PRIMARY_LIGHT },
    { label: 'RON97', value: prices?.ron97, color: FP_WARNING, bg: '#FBF3E6' },
    { label: 'Diesel', value: prices?.diesel, color: FP_SECONDARY, bg: FP_SECONDARY_LIGHT },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FP_PRIMARY} />}
      >
        <GreetingCard />

        {notification && (
          <NotificationBanner
            message={notification.message}
            onPress={() => {
              const target = notification.target;
              setNotification(null);
              router.push(target);
            }}
          />
        )}

        {/* Fuel alert */}
        {showAlert && (
          <Animated.View style={{ opacity: alertAnim, marginTop: 12 }}>
            <View style={[styles.alertCard, isWait ? styles.alertWait : styles.alertFill]}>
              <View style={[styles.alertIcon, { backgroundColor: isWait ? FP_PRIMARY_LIGHT : '#FBE9D6' }]}>
                {isWait ? (
                  <TrendingDown size={16} color={FP_PRIMARY} />
                ) : (
                  <TriangleAlert size={16} color={FP_WARNING} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowCenter}>
                  <Text style={[styles.alertTitle, { color: isWait ? FP_PRIMARY : FP_WARNING }]}>
                    {action === 'WAIT' ? 'Hold off refuelling' : action === 'FILL_SOON' ? 'Fill up soon' : 'Fill up now'}
                  </Text>
                  <View style={{ marginLeft: 6 }}>
                    <AiBadge label="AI Predicted" />
                  </View>
                </View>
                <Text style={styles.alertReason}>{dash?.refuelReason ?? 'Based on price trend analysis.'}</Text>
              </View>
              <Pressable onPress={dismissAlert} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss alert">
                <Text style={styles.alertClose}>✕</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Fuel level / vehicle prompt */}
        <View style={{ marginTop: 12 }}>
          {dash?.vehicleSetUp ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.rowCenter}>
                  <View style={[styles.iconChip, { backgroundColor: FP_SECONDARY_LIGHT }]}>
                    <Fuel size={15} color={FP_SECONDARY} />
                  </View>
                  <Text style={styles.cardTitle}>Fuel Level</Text>
                </View>
                <Text style={styles.cardMeta}>{Math.round(pct)}% full</Text>
              </View>

              <View style={styles.gaugeRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.gaugeTrack}>
                    <Animated.View style={[styles.gaugeFill, { width: widthInterp, backgroundColor: fuelColor }]} />
                  </View>
                </View>
                <Text style={[styles.gaugePct, { color: fuelColor }]}>{Math.round(pct)}%</Text>
              </View>

              <View style={styles.miniRow}>
                <MiniStat icon={<TrendingUp size={14} color={FP_SECONDARY} />} label="Range" value={`${Math.round(num(dash?.remainingKm))} km`} />
                <MiniStat icon={<Fuel size={14} color={FP_PRIMARY} />} label="Fuel left" value={`${num(dash?.remainingLitres).toFixed(0)} L`} />
                <MiniStat icon={<Droplet size={14} color={TEXT_SECONDARY} />} label="Tank" value={`${Math.round(pct)}%`} />
              </View>
            </View>
          ) : (
            <Pressable style={styles.promptCard} onPress={() => router.push('/(onboarding)/vehicle')} accessibilityRole="button" accessibilityLabel="Set up your vehicle to unlock fuel range and efficiency tracking">
              <View style={[styles.iconChip, { backgroundColor: FP_SECONDARY_LIGHT }]}>
                <Car size={16} color={FP_SECONDARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Set up your vehicle</Text>
                <Text style={styles.cardMeta}>Unlock fuel range & efficiency tracking</Text>
              </View>
              <ChevronRight size={18} color={TEXT_LIGHT} />
            </Pressable>
          )}
        </View>

        {/* Weekly impact */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <SectionHeader
            icon={<View style={[styles.iconChip, { backgroundColor: FP_PRIMARY_LIGHT }]}><TrendingUp size={15} color={FP_PRIMARY} /></View>}
            title="Weekly Impact"
            right={<Text style={styles.rangeChip}>This week</Text>}
          />
          <View style={[styles.grid2, { marginTop: 12 }]}>
            <StatCard emoji="💰" label="Fuel Saved" value={rm(dash?.weeklySavedVsSolo)} delta="vs solo" />
            <StatCard emoji="🌿" label="CO₂ Reduced" value={`${num(dash?.weeklyCarbonSavedKg).toFixed(1)} kg`} delta={`${num(dash?.treesEquivalent).toFixed(1)} trees`} />
            <StatCard emoji="🚗" label="Rides Shared" value={`${eco?.carpoolTrips ?? 0}`} delta={`${eco?.totalTrips ?? 0} trips`} />
            <StatCard emoji="🏆" label="Eco Rank" value={`Top ${Math.round(dash?.percentile ?? 0)}%`} delta={`#${dash?.communityRank ?? '–'} at UTM`} />
          </View>
          <Text style={styles.chartLabel}>Daily savings (RM)</Text>
          <WeeklyBarChart values={barValues} highlight={todayIdx} />
        </View>

        {/* AI insight */}
        <LinearGradient colors={['#1a1040', FP_AI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Cpu size={16} color="#C7C2F0" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.rowCenter, { marginBottom: 6 }]}>
              <Text style={styles.aiTitle}>AI Weekly Insight</Text>
              <View style={{ marginLeft: 8 }}>
                <AiBadge label="Ollama" />
              </View>
            </View>
            <Text style={styles.aiBody}>
              {aiText ?? 'Your personalised weekly summary will appear here once you have a few trips logged.'}
            </Text>
            <View style={styles.aiActions}>
              <Pressable style={styles.aiBtn} onPress={() => router.push('/(tabs)/ride')} accessibilityRole="button" accessibilityLabel="Book a ride">
                <Zap size={12} color="#FBBF24" />
                <Text style={styles.aiBtnText}>Book a ride</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/eco')} accessibilityRole="button" accessibilityLabel="View eco analysis">
                <Text style={styles.aiLink}>View analysis →</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Carpool matches */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader
            icon={<Users size={16} color={FP_SECONDARY} />}
            title="Nearby Matches"
            right={
              <Pressable onPress={() => router.push('/(tabs)/ride')} style={styles.rowCenter} accessibilityRole="button" accessibilityLabel="See all ride matches">
                <Text style={styles.seeAll}>See all</Text>
                <ChevronRight size={14} color={FP_SECONDARY} />
              </Pressable>
            }
          />
          <View style={{ gap: 10, marginTop: 10 }}>
            {rides.length === 0 ? (
              <View style={styles.emptyMatches}>
                <Text style={styles.emptyMatchesText}>{dash?.nearbyRidesSummary ?? 'No open rides right now.'}</Text>
              </View>
            ) : (
              rides.map((r) => (
                <MatchCard
                  key={r.id}
                  ride={r}
                  onPress={() => router.push({ pathname: '/ride/[rideId]', params: { rideId: String(r.id) } })}
                />
              ))
            )}
          </View>
        </View>

        {/* Fuel prices */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader
            icon={<Droplet size={16} color={FP_PRIMARY} />}
            title="Fuel Prices"
            right={
              <Pressable onPress={() => router.push('/(tabs)/fuel')} accessibilityRole="button" accessibilityLabel="View fuel price details">
                <Text style={styles.seeAll}>Details →</Text>
              </Pressable>
            }
          />
          <View style={[styles.grid3, { marginTop: 10 }]}>
            {priceChips.map((c) => (
              <Pressable
                key={c.label}
                style={styles.priceChip}
                onPress={() => router.push('/(tabs)/fuel')}
                accessibilityRole="button"
                accessibilityLabel={`${c.label} price: ${num(c.value) > 0 ? rm(c.value) : 'unavailable'}`}
              >
                <View style={[styles.priceIcon, { backgroundColor: c.bg }]}>
                  <Droplet size={12} color={c.color} />
                </View>
                <Text style={styles.priceType}>{c.label}</Text>
                <Text style={styles.priceValue}>{num(c.value) > 0 ? rm(c.value) : '—'}</Text>
                <Text style={styles.priceDelta}>→ Stable</Text>
              </Pressable>
            ))}
          </View>
          {num(prices?.ron95Budi95) > 0 && (
            <View style={styles.budiChip}>
              <Text style={styles.budiText}>BUDI95 subsidised rate · {rm(prices?.ron95Budi95)}/L</Text>
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── leaf components ──────────────────────────────────────────────────────────
const StatCard = React.memo(function StatCard({ emoji, label, value, delta }: { emoji: string; label: string; value: string; delta?: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.rowCenter}>
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {delta ? <Text style={styles.statDelta}>{delta}</Text> : null}
    </View>
  );
});

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      {icon}
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const MatchCard = React.memo(function MatchCard({ ride, onPress }: { ride: RideSummary; onPress: () => void }) {
  const name = ride.driver?.name ?? 'Driver';
  const seats = Math.max(0, (ride.maxSeats ?? 0) - (ride.confirmedPassengers ?? 0));
  return (
    <Pressable
      style={styles.matchCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ride with ${name}, ${seats} seat${seats === 1 ? '' : 's'} available, ${(ride.originLabel ?? 'origin')} to ${(ride.destinationLabel ?? 'destination')}`}
    >
      <View style={styles.matchAvatar}>
        <Text style={styles.matchAvatarText}>{initialsOf(name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowCenter}>
          <Text style={styles.matchName} numberOfLines={1}>{name}</Text>
          {ride.driver?.isVerified ? <ShieldCheck size={14} color={FP_PRIMARY} style={{ marginLeft: 4 }} /> : null}
          <View style={styles.matchSeats}>
            <Text style={styles.matchSeatsText}>{seats} seat{seats === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <View style={[styles.rowCenter, { marginTop: 2 }]}>
          <Star size={11} color="#FBBF24" fill="#FBBF24" />
          <Text style={styles.matchRating}>{num(ride.driver?.driverRating).toFixed(1)}</Text>
          <Text style={styles.matchDot}> · </Text>
          <Text style={styles.matchRoute} numberOfLines={1}>
            {(ride.originLabel ?? 'Origin')} → {(ride.destinationLabel ?? 'Destination')}
          </Text>
        </View>
        <View style={styles.matchFooter}>
          <View style={styles.rowCenter}>
            <Text style={styles.matchPrice}>{num(ride.estimatedFarePerPerson) > 0 ? rm(ride.estimatedFarePerPerson) : 'Free'}</Text>
            {ride.departureTime ? <Text style={styles.matchTime}>· {fmtTime(ride.departureTime)}</Text> : null}
          </View>
          <View style={styles.requestBtn}>
            <Text style={styles.requestText}>Request</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid3: { flexDirection: 'row', justifyContent: 'space-between' },

  // greeting
  greetCard: { borderRadius: 20, padding: 20, overflow: 'hidden' },
  greetTop: { flexDirection: 'row', alignItems: 'flex-start' },
  greetDate: { color: FP_CARPOOL_LIGHT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  greetHello: { color: CARD, fontSize: 20, fontWeight: '800', lineHeight: 25 },
  greetName: { color: CARD, fontSize: 20, fontWeight: '800' },
  greetSub: { color: FP_CARPOOL_LIGHT, fontSize: 12, fontWeight: '500', marginTop: 6 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: CARD, fontSize: 17, fontWeight: '800' },
  onlineDot: { position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: CARD },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { color: CARD, fontSize: 10, fontWeight: '700' },

  // generic card
  card: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  cardMeta: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600' },

  // section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, marginLeft: 6 },
  rangeChip: { fontSize: 10, fontWeight: '700', color: FP_PRIMARY, backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  seeAll: { fontSize: 12, fontWeight: '700', color: FP_SECONDARY },

  // alert
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, borderWidth: 1, padding: 14 },
  alertFill: { backgroundColor: '#FBF6EC', borderColor: '#EAD9B8' },
  alertWait: { backgroundColor: FP_PRIMARY_LIGHT, borderColor: '#BBE9D6' },
  alertIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 12, fontWeight: '800' },
  alertReason: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 3, lineHeight: 16 },
  alertClose: { color: TEXT_LIGHT, fontSize: 14, fontWeight: '700', paddingLeft: 4 },

  // fuel gauge
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  gaugeTrack: { height: 12, borderRadius: 6, backgroundColor: '#EEF1F4', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugePct: { fontSize: 22, fontWeight: '800' },
  miniRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  miniStat: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 10, alignItems: 'center', gap: 3 },
  miniLabel: { fontSize: 10, color: TEXT_LIGHT, fontWeight: '600' },
  miniValue: { fontSize: 12, fontWeight: '800', color: TEXT_PRIMARY },

  // prompt
  promptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },

  // weekly impact
  statCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 10 },
  statLabel: { fontSize: 10, color: TEXT_SECONDARY, fontWeight: '600', marginLeft: 5 },
  statValue: { fontSize: 19, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 4 },
  statDelta: { fontSize: 10, color: FP_PRIMARY, fontWeight: '700', marginTop: 2 },
  chartLabel: { fontSize: 10, color: TEXT_LIGHT, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },

  // AI insight
  aiCard: { flexDirection: 'row', gap: 10, borderRadius: 20, padding: 16, marginTop: 12 },
  aiIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { color: CARD, fontSize: 13, fontWeight: '800' },
  aiBody: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18 },
  aiActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  aiBtnText: { color: CARD, fontSize: 11, fontWeight: '700' },
  aiLink: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },

  // matches
  matchCard: { flexDirection: 'row', gap: 12, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  matchAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: FP_SECONDARY, alignItems: 'center', justifyContent: 'center' },
  matchAvatarText: { color: CARD, fontSize: 13, fontWeight: '800' },
  matchName: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, maxWidth: '55%' },
  matchSeats: { marginLeft: 'auto', backgroundColor: FP_PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  matchSeatsText: { fontSize: 10, fontWeight: '800', color: FP_PRIMARY },
  matchRating: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '700', marginLeft: 3 },
  matchDot: { fontSize: 11, color: TEXT_LIGHT },
  matchRoute: { fontSize: 11, color: TEXT_SECONDARY, flex: 1 },
  matchFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  matchPrice: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  matchTime: { fontSize: 11, color: TEXT_LIGHT, marginLeft: 6 },
  requestBtn: { backgroundColor: TEXT_PRIMARY, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  requestText: { color: CARD, fontSize: 11, fontWeight: '800' },
  emptyMatches: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, alignItems: 'center' },
  emptyMatchesText: { fontSize: 12, color: TEXT_SECONDARY },

  // prices
  priceChip: { width: '31.5%', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, alignItems: 'center' },
  priceIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  priceType: { fontSize: 10, color: TEXT_SECONDARY, fontWeight: '700' },
  priceValue: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 2 },
  priceDelta: { fontSize: 9, color: TEXT_LIGHT, fontWeight: '700', marginTop: 2 },
  budiChip: { backgroundColor: FP_PRIMARY_LIGHT, borderRadius: 12, padding: 10, marginTop: 10, alignItems: 'center' },
  budiText: { fontSize: 11, fontWeight: '700', color: FP_PRIMARY },

  // empty
  emptyHero: { alignItems: 'center', marginTop: 28 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: FP_PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', maxWidth: 240, marginTop: 4 },
  setupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  setupIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  setupLabel: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },
  setupDesc: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  setupBtn: { backgroundColor: FP_PRIMARY, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  setupBtnText: { color: CARD, fontSize: 12, fontWeight: '800' },
  aiTip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#F4F3FE', borderRadius: 16, padding: 14, marginTop: 16 },
  aiTipText: { flex: 1, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 18 },

  // error
  errorHeader: { height: 90, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  errorBody: { alignItems: 'center', marginTop: 24 },
  errorIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FCEAEA', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  errorMsg: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', maxWidth: 240, marginTop: 6, marginBottom: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
  cachedLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 10 },
  errCodeCard: { backgroundColor: '#FCEFEF', borderRadius: 16, padding: 14, marginTop: 14 },
  errCode: { fontSize: 11, color: FP_DANGER, fontWeight: '700' },
  errCodeSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 3 },
});
