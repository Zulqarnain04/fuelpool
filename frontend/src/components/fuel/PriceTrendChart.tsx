// src/components/fuel/PriceTrendChart.tsx
// Historical (solid) + predicted (dashed) price line with area fill, today marker,
// and minimal value labels (current + predicted, faint min/max) for at-a-glance insight.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path, Polyline, Line, Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText,
} from 'react-native-svg';
import { FP_PRIMARY, FP_WARNING, TEXT_LIGHT } from '../../constants/colors';

interface Props {
  history: number[];
  predicted?: number[]; // continues after history
  height?: number;
}

export default function PriceTrendChart({ history, predicted = [], height = 130 }: Props) {
  const all = [...history, ...predicted];
  if (history.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Not enough price history to chart yet.</Text>
      </View>
    );
  }

  const W = 320;
  const H = height;
  const padL = 6;
  const padR = 34; // room for the predicted value label on the right
  const padT = 20; // room for value labels above the line
  const padB = 14;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const n = all.length;
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const histPts = history.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const lastHist = history.length - 1;
  const predPts =
    predicted.length > 0
      ? [history[lastHist], ...predicted].map((v, k) => `${x(lastHist + k)},${y(v)}`).join(' ')
      : '';
  const areaPath =
    `M ${x(0)},${y(history[0])} ` +
    history.map((v, i) => `L ${x(i)},${y(v)}`).join(' ') +
    ` L ${x(lastHist)},${H - padB} L ${x(0)},${H - padB} Z`;
  const todayX = x(lastHist);
  const step = Math.max(1, Math.ceil(history.length / 6));

  const curVal = history[lastHist];
  const lastPredIdx = lastHist + predicted.length;
  const lastPredVal = predicted.length > 0 ? predicted[predicted.length - 1] : null;
  const fmt = (v: number) => v.toFixed(2);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={FP_PRIMARY} stopOpacity={0.22} />
          <Stop offset="1" stopColor={FP_PRIMARY} stopOpacity={0} />
        </SvgGradient>
      </Defs>

      {/* faint min / max guide labels */}
      <SvgText x={padL} y={padT - 8} fontSize={8} fill={TEXT_LIGHT}>{`hi ${fmt(max)}`}</SvgText>
      <SvgText x={padL} y={H - padB + 10} fontSize={8} fill={TEXT_LIGHT}>{`lo ${fmt(min)}`}</SvgText>

      <Path d={areaPath} fill="url(#priceArea)" />
      <Polyline points={histPts} fill="none" stroke={FP_PRIMARY} strokeWidth={2} strokeLinejoin="round" />
      {predicted.length > 0 && (
        <Polyline points={predPts} fill="none" stroke={FP_WARNING} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
      )}

      {/* today marker */}
      <Line x1={todayX} y1={padT} x2={todayX} y2={H - padB} stroke={FP_PRIMARY} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />

      {/* dots */}
      {history.map((v, i) =>
        i % step === 0 || i === lastHist ? <Circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={FP_PRIMARY} /> : null,
      )}
      {predicted.map((v, k) => (
        <Circle key={`p${k}`} cx={x(lastHist + 1 + k)} cy={y(v)} r={2.5} fill={FP_WARNING} />
      ))}

      {/* current value label (anchored over today's point) */}
      <SvgText x={Math.min(todayX, W - padR - 30)} y={y(curVal) - 7} fontSize={10} fontWeight="700" fill={FP_PRIMARY} textAnchor="middle">
        {fmt(curVal)}
      </SvgText>
      {/* predicted value label */}
      {lastPredVal != null && (
        <SvgText x={x(lastPredIdx)} y={y(lastPredVal) - 7} fontSize={10} fontWeight="700" fill={FP_WARNING} textAnchor="end">
          {fmt(lastPredVal)}
        </SvgText>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: TEXT_LIGHT },
});
