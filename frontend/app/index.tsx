// app/index.tsx — Splash. Runs the auth check, then routes to login or tabs after ~1.5s.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Droplet, Leaf } from 'lucide-react-native';
import useAuth from '../src/hooks/useAuth';
import { FP_PRIMARY, FP_PRIMARY_LIGHT, CARD } from '../src/constants/colors';

export default function Splash() {
  const router = useRouter();
  const { token, isLoading, checkAuth } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  // Kick the auth check + entrance animation on mount.
  useEffect(() => {
    checkAuth();

    Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    const t = setTimeout(() => setMinElapsed(true), 1500);
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [checkAuth, logoScale, spin]);

  // Navigate once both the 1.5s splash and the auth check have completed.
  useEffect(() => {
    if (minElapsed && !isLoading) {
      router.replace(token ? '/(tabs)/home' : '/(auth)/login');
    }
  }, [minElapsed, isLoading, token, router]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, { transform: [{ scale: logoScale }] }]}>
        <Droplet size={44} color={CARD} fill={CARD} />
        <View style={styles.leaf}>
          <Leaf size={20} color={FP_PRIMARY} fill={FP_PRIMARY} />
        </View>
      </Animated.View>

      <Text style={styles.title}>FuelPool</Text>

      <View style={styles.bottom}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
        <Text style={styles.loading}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FP_PRIMARY, alignItems: 'center', justifyContent: 'center' },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  leaf: { position: 'absolute', bottom: 12, right: 12 },
  title: { marginTop: 20, fontSize: 28, fontWeight: '800', color: CARD, letterSpacing: -0.5 },
  bottom: { position: 'absolute', bottom: 72, alignItems: 'center', gap: 12 },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: CARD,
  },
  loading: { color: FP_PRIMARY_LIGHT, fontSize: 14, fontWeight: '500' },
});
