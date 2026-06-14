// app/(auth)/welcome.tsx — post-register success screen.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CircleCheck, ArrowRight } from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import { FP_PRIMARY, FP_PRIMARY_LIGHT, CARD } from '../../src/constants/colors';

export default function Welcome() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ name?: string }>();
  const name = params.name || user?.name || 'there';

  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);

  return (
    <View style={styles.container}>
      {/* decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
            <CircleCheck size={56} color={FP_PRIMARY} fill={CARD} />
          </Animated.View>

          <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
            <Text style={styles.title}>Welcome, {name}!</Text>
            <Text style={styles.subtitle}>
              Your account is ready. Let's set up your vehicle to start saving fuel.
            </Text>
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.replace('/(onboarding)/vehicle')}
          >
            <Text style={styles.primaryBtnText}>Setup Vehicle</Text>
            <ArrowRight size={18} color={FP_PRIMARY} />
          </Pressable>

          <Pressable onPress={() => router.replace('/(tabs)/home')} hitSlop={8}>
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FP_PRIMARY, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 28 },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  circleTop: { width: 240, height: 240, top: -60, right: -70 },
  circleBottom: { width: 320, height: 320, bottom: -120, left: -90 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 32, fontWeight: '800', color: CARD, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: {
    fontSize: 16,
    color: FP_PRIMARY_LIGHT,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 23,
    maxWidth: 300,
  },
  bottom: { gap: 18, paddingBottom: 16 },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: FP_PRIMARY, fontSize: 16, fontWeight: '800' },
  skip: { color: CARD, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
