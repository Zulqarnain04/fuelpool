// src/components/common/AiBadge.tsx
// Small pill: Cpu icon + uppercase label. Used to mark AI-generated content.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { FP_AI, FP_AI_LIGHT } from '../../constants/colors';

interface AiBadgeProps {
  label?: string;
}

export default function AiBadge({ label = 'AI Powered' }: AiBadgeProps) {
  return (
    <View style={styles.badge}>
      <Cpu size={10} color={FP_AI} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FP_AI_LIGHT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(83,74,183,0.2)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    color: FP_AI,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
