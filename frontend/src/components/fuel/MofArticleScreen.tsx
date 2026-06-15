// src/components/fuel/MofArticleScreen.tsx — MOF announcement detail (sub-screen 2).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, FileText, Cpu, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, WifiOff,
} from 'lucide-react-native';
import AiBadge from '../common/AiBadge';
import SkeletonBox from '../common/SkeletonBox';
import { fuelApi } from '../../services/api';
import type { MofArticle } from '../../services/api';
import { num, rm } from '../../utils/format';
import {
  FP_AI, FP_SECONDARY, FP_PRIMARY, FP_DANGER, FP_WARNING,
  BACKGROUND, CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT,
} from '../../constants/colors';

interface FuelChange {
  fuelType?: string;
  oldPrice?: number;
  newPrice?: number;
  changeAmount?: number;
  direction?: string; // UP | DOWN | UNCHANGED
}
interface Analysis {
  fuelChanges?: FuelChange[];
  effectiveDate?: string;
  mainReason?: string;
  userTip?: string;
  affectedUsers?: string;
}

type Status = 'loading' | 'default' | 'empty' | 'error';

export default function MofArticleScreen({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<Status>('loading');
  const [article, setArticle] = useState<MofArticle | null>(null);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await fuelApi.getLatestMOFArticle();
      // backend returns 204 No Content when there's no article
      if (!res.data || res.status === 204) {
        setStatus('empty');
        return;
      }
      setArticle(res.data);
      setStatus('default');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const analysis: Analysis = (() => {
    if (!article?.ollamaAnalysis) return {};
    let parsed: Analysis & Record<string, unknown> = {};
    try {
      parsed = JSON.parse(article.ollamaAnalysis);
    } catch {
      return {};
    }
    // Live scraper stores flat price fields (ron95, ron97, …) instead of a
    // fuelChanges array — synthesise rows so real articles render their prices.
    if (!Array.isArray(parsed.fuelChanges) || parsed.fuelChanges.length === 0) {
      const flat: { key: string; label: string }[] = [
        { key: 'ron95', label: 'RON95' },
        { key: 'ron95Budi95', label: 'BUDI95' },
        { key: 'budi95', label: 'BUDI95' },
        { key: 'ron97', label: 'RON97' },
        { key: 'diesel', label: 'Diesel' },
        { key: 'dieselEastMalaysia', label: 'Diesel E.M.' },
      ];
      const seen = new Set<string>();
      const changes: FuelChange[] = [];
      for (const f of flat) {
        const v = parsed[f.key];
        if (typeof v === 'number' && !seen.has(f.label)) {
          seen.add(f.label);
          changes.push({ fuelType: f.label, newPrice: v });
        }
      }
      parsed.fuelChanges = changes;
    }
    return parsed;
  })();

  const impact: { impactLevel?: string; estimatedCostImpact?: string; driverAdvice?: string; summary?: string } | null = (() => {
    if (!article?.impactAnalysis) return null;
    try {
      return JSON.parse(article.impactAnalysis);
    } catch {
      return null;
    }
  })();
  const impactColor = (lvl?: string) =>
    lvl === 'HIGH' ? FP_DANGER : lvl === 'MEDIUM' ? FP_WARNING : FP_PRIMARY;

  const dirColor = (d?: string) => (d === 'UP' ? FP_DANGER : d === 'DOWN' ? FP_PRIMARY : TEXT_LIGHT);
  const DirIcon = (d?: string) => (d === 'UP' ? TrendingUp : d === 'DOWN' ? TrendingDown : Minus);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.topTitle}>MOF Update</Text>
        <View style={{ width: 22 }} />
      </View>

      {status === 'loading' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonBox width="100%" height={90} borderRadius={16} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={160} borderRadius={20} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={140} borderRadius={20} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <View style={styles.errIcon}><WifiOff size={26} color={TEXT_LIGHT} /></View>
          <Text style={styles.errTitle}>Couldn't load the article</Text>
          <Pressable style={styles.retryBtn} onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading article">
            <RefreshCw size={16} color={CARD} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : status === 'empty' ? (
        <View style={styles.center}>
          <View style={styles.emptyCircle}><FileText size={30} color={FP_SECONDARY} /></View>
          <Text style={styles.errTitle}>No Announcement This Week</Text>
          <Text style={styles.emptySub}>MOF hasn't posted a new fuel price update. Current prices remain in effect.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* official header */}
          <View style={styles.officialCard}>
            <View style={styles.officialBadge}>
              <Text style={styles.officialBadgeText}>OFFICIAL · MOF MALAYSIA</Text>
            </View>
            <Text style={styles.articleTitle}>{article?.title ?? 'Fuel Price Announcement'}</Text>
            {article?.effectiveDate ? (
              <Text style={styles.articleDate}>Effective {article.effectiveDate}</Text>
            ) : null}
          </View>

          {/* AI summary */}
          <LinearGradient colors={['#1a1040', FP_AI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
            <View style={[styles.rowCenter, { marginBottom: 10 }]}>
              <Cpu size={16} color="#C7C2F0" />
              <Text style={styles.aiTitle}>  AI Summary</Text>
              <View style={{ marginLeft: 8 }}>
                <AiBadge label="Ollama" />
              </View>
            </View>

            {(analysis.fuelChanges ?? []).map((c, i) => {
              const Icon = DirIcon(c.direction);
              const hasDelta = c.changeAmount != null || c.oldPrice != null || c.direction != null;
              return (
                <View key={i} style={styles.changeRow}>
                  <Text style={styles.changeFuel}>{c.fuelType}</Text>
                  <View style={styles.rowCenter}>
                    <Text style={styles.changeNew}>{rm(c.newPrice)}</Text>
                    {hasDelta ? (
                      <>
                        <View style={{ marginLeft: 6 }}>
                          <Icon size={13} color={dirColor(c.direction)} />
                        </View>
                        <Text style={[styles.changeDelta, { color: dirColor(c.direction) }]}>
                          {num(c.changeAmount) === 0 ? 'no change' : `${num(c.changeAmount) > 0 ? '+' : ''}${num(c.changeAmount).toFixed(2)}`}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.changeDelta, { color: 'rgba(255,255,255,0.55)' }]}>effective</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {analysis.mainReason || article?.mainReason ? (
              <Text style={styles.aiReason}>📌 {analysis.mainReason ?? article?.mainReason}</Text>
            ) : null}
            {analysis.userTip || article?.userTip ? (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>💡 {analysis.userTip ?? article?.userTip}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* AI summary text */}
          {article?.summary ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Summary</Text>
              <Text style={styles.bodyText}>{article.summary}</Text>
            </View>
          ) : null}

          {/* AI impact analysis */}
          {impact && (impact.driverAdvice || impact.estimatedCostImpact || impact.summary) ? (
            <View style={styles.card}>
              <View style={[styles.rowCenter, { justifyContent: 'space-between' }]}>
                <Text style={styles.sectionLabel}>What this means for you</Text>
                {impact.impactLevel ? (
                  <View style={[styles.impactBadge, { backgroundColor: impactColor(impact.impactLevel) }]}>
                    <Text style={styles.impactBadgeText}>{impact.impactLevel} IMPACT</Text>
                  </View>
                ) : null}
              </View>
              {impact.summary ? <Text style={styles.bodyText}>{impact.summary}</Text> : null}
              {impact.driverAdvice ? <Text style={styles.bodyText}>🚗 {impact.driverAdvice}</Text> : null}
              {impact.estimatedCostImpact ? <Text style={styles.impactCost}>💸 {impact.estimatedCostImpact}</Text> : null}
            </View>
          ) : null}

          {/* impact grid */}
          {(analysis.fuelChanges ?? []).length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Impact on your wallet</Text>
              <View style={styles.grid}>
                {(analysis.fuelChanges ?? []).slice(0, 4).map((c, i) => (
                  <View key={i} style={styles.gridCard}>
                    <Text style={styles.gridFuel}>{c.fuelType}</Text>
                    <Text style={[styles.gridPrice, { color: dirColor(c.direction) }]}>{rm(c.newPrice)}</Text>
                    <Text style={styles.gridPrev}>{c.oldPrice != null ? `was ${rm(c.oldPrice)}` : 'effective price'}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* link */}
          {article?.sourceUrl ? (
            <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(article.sourceUrl!)} accessibilityRole="button" accessibilityLabel="Read full article on MOF website">
              <ExternalLink size={16} color={FP_SECONDARY} />
              <Text style={styles.linkText}>Read full article on MOF website</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  officialCard: { backgroundColor: '#E6F1FB', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: FP_SECONDARY },
  officialBadge: { alignSelf: 'flex-start', backgroundColor: FP_SECONDARY, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  officialBadgeText: { color: CARD, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  articleTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, lineHeight: 22 },
  articleDate: { fontSize: 12, color: FP_SECONDARY, fontWeight: '700', marginTop: 6 },

  aiCard: { borderRadius: 20, padding: 16, marginBottom: 12 },
  aiTitle: { color: CARD, fontSize: 14, fontWeight: '800' },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  changeFuel: { color: CARD, fontSize: 13, fontWeight: '700' },
  changeNew: { color: CARD, fontSize: 14, fontWeight: '800' },
  changeDelta: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  aiReason: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18, marginTop: 12 },
  tipBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, marginTop: 10 },
  tipText: { color: '#9FE1CB', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  gridCard: { width: '48%', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  gridFuel: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '700' },
  gridPrice: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  gridPrev: { fontSize: 11, color: TEXT_LIGHT, marginTop: 2 },

  card: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  bodyText: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20, marginTop: 4 },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  impactBadgeText: { color: CARD, fontSize: 9, fontWeight: '800' },
  impactCost: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '700', marginTop: 8 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E6F1FB', borderRadius: 14, paddingVertical: 14 },
  linkText: { color: FP_SECONDARY, fontSize: 14, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E6F1FB', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center' },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 6, maxWidth: 260 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 18 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
});
