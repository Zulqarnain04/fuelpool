// src/components/fuel/MonthlySpendChart.tsx — bar chart for monthly fuel spend, with value labels.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { FP_PRIMARY, FP_DANGER, TEXT_SECONDARY, TEXT_LIGHT } from '../../constants/colors';

interface Props {
  data: { label: string; value: number }[];
  highlightLabel?: string; // current month → FP_PRIMARY
  height?: number;
}

export default function MonthlySpendChart({ data, highlightLabel, height = 96 }: Props) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No spend data yet.</Text>
      </View>
    );
  }
  const W = 320;
  const H = height;
  const topPad = 16; // room for the value label above each bar
  const padX = 4;
  const slot = (W - padX * 2) / data.length;
  const barW = Math.min(26, slot - 10);
  const max = Math.max(...data.map((d) => d.value), 1);
  const maxIdx = data.reduce((m, d, i, arr) => (d.value > arr[m].value ? i : m), 0);

  return (
    <Svg width="100%" height={H + 18} viewBox={`0 0 ${W} ${H + 18}`}>
      {data.map((d, i) => {
        const bh = Math.max(3, (d.value / max) * (H - topPad - 8));
        const x = padX + i * slot + (slot - barW) / 2;
        const yy = H - bh;
        const isCurrent = highlightLabel && d.label === highlightLabel;
        const isMax = i === maxIdx && d.value > 0;
        const fill = isCurrent ? FP_PRIMARY : isMax ? FP_DANGER : '#BBE9D6';
        const labelColor = isCurrent ? FP_PRIMARY : isMax ? FP_DANGER : TEXT_SECONDARY;
        return (
          <React.Fragment key={d.label}>
            {/* value label above the bar */}
            {d.value > 0 && (
              <SvgText x={x + barW / 2} y={yy - 5} fontSize={9} fontWeight="700" fill={labelColor} textAnchor="middle">
                {Math.round(d.value)}
              </SvgText>
            )}
            <Rect x={x} y={yy} width={barW} height={bh} rx={4} fill={fill} />
            <SvgText x={x + barW / 2} y={H + 13} fontSize={9} fontWeight="600" fill={TEXT_LIGHT} textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: TEXT_LIGHT },
});
