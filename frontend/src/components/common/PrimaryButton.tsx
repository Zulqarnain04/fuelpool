// src/components/common/PrimaryButton.tsx
// Primary CTA — FP_PRIMARY fill, 52px tall, radius 14, spinner while loading.

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { FP_PRIMARY, CARD } from '../../constants/colors';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={CARD} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: FP_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    color: CARD,
    fontSize: 16,
    fontWeight: '700',
  },
});
