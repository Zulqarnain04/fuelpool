// src/components/home/NotificationBanner.tsx
// Subtle "what's new" nudge shown at the top of Home when the weekly eco
// summary or a MOF price update wasn't seen yet.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { FP_AI, FP_AI_LIGHT, TEXT_PRIMARY } from '../../constants/colors';

export default function NotificationBanner({ message, onPress }: { message: string; onPress: () => void }) {
  return (
    <Pressable
      style={styles.banner}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={message}
    >
      <View style={styles.iconWrap}>
        <Bell size={14} color={FP_AI} />
      </View>
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
      <ChevronRight size={16} color={FP_AI} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FP_AI_LIGHT,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
});
