// src/components/common/SkeletonBox.tsx
// Animated gray placeholder for loading states (pulse opacity 0.4 → 0.8).

import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, Easing } from 'react-native';
import { SKELETON } from '../../constants/colors';

interface SkeletonBoxProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonBox({
  width,
  height,
  borderRadius = 12,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: SKELETON, opacity },
        style,
      ]}
    />
  );
}
