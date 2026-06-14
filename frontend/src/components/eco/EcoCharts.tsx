// src/components/eco/EcoCharts.tsx — small SVG charts for the EcoTrack tab.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { FP_PRIMARY, FP_DANGER, TEXT_LIGHT, BORDER } from '../../constants/colors';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Stacked daily bars: green = carpool, red = solo.
export function StackedBars({ days, height = 84 }: { days: { carpool: number; solo: number }[]; height?: number }) {
  const W = 320;
  const H = height;
  const padX = 6;
  const barW = 9;
  const max = Math.max(...days.map((d) => d.carpool + d.solo), 1);
  const slot = (W - padX * 2) / days.length;
  const scale = (H - 18) / max;
  return (
    <Svg width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`}>
      {days.map((d, i) => {
        const x = padX + i * slot + (slot - barW) / 2;
        const soloH = d.solo * scale;
        const carpoolH = d.carpool * scale;
        const soloY = H - 18 - soloH;
        const carpoolY = soloY - carpoolH;
        return (
          <React.Fragment key={i}>
            {soloH > 0 && <Rect x={x} y={soloY} width={barW} height={soloH} rx={3} fill={FP_DANGER} opacity={0.85} />}
            {carpoolH > 0 && <Rect x={x} y={carpoolY} width={barW} height={Math.max(2, carpoolH)} rx={3} fill={FP_PRIMARY} />}
            <SvgText x={x + barW / 2} y={H - 2} fontSize={8} fill={TEXT_LIGHT} textAnchor="middle">{DAY_LABELS[i]}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Mini efficiency line.
export function MiniLine({ values, height = 60, color = FP_PRIMARY }: { values: number[]; height?: number; color?: string }) {
  if (values.length < 2) {
    return <View style={[styles.empty, { height }]}><Text style={styles.emptyText}>Not enough data yet</Text></View>;
  }
  const W = 200;
  const H = height;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${pad + (i / (values.length - 1)) * (W - pad * 2)},${pad + (1 - (v - min) / range) * (H - pad * 2)}`)
    .join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <Circle key={i} cx={pad + (i / (values.length - 1)) * (W - pad * 2)} cy={pad + (1 - (v - min) / range) * (H - pad * 2)} r={2.5} fill={color} />
      ))}
    </Svg>
  );
}

// Donut: carpool % vs solo %.
export function Donut({ percent, size = 96, color = FP_PRIMARY }: { percent: number; size?: number; color?: string }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const filled = (pct / 100) * c;
  const center = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={r} stroke={BORDER} strokeWidth={stroke} fill="none" />
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${filled} ${c - filled}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
      <SvgText x={center} y={center + 5} fontSize={18} fontWeight="800" fill={color} textAnchor="middle">{Math.round(pct)}%</SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 11, color: TEXT_LIGHT },
});
