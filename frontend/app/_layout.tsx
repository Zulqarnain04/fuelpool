// app/_layout.tsx — root layout: auth check on mount + route guard.
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAuth from '../src/hooks/useAuth';
import { BACKGROUND } from '../src/constants/colors';

export default function RootLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait for the initial SecureStore read

    const seg0 = segments[0]; // undefined on splash "/", else '(auth)' | '(tabs)' | '(onboarding)'
    const inAuthGroup = seg0 === '(auth)';
    const onSplash = seg0 === undefined;

    // The splash screen drives its own redirect after its animation.
    if (onSplash) return;

    // Only guard the protected area: no token while inside tabs/onboarding → login.
    // We intentionally do NOT bounce signed-in users out of the auth group — the
    // register → welcome → onboarding flow holds a token while still under (auth),
    // and the splash + login screen already route signed-in users to Home directly.
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BACKGROUND },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
