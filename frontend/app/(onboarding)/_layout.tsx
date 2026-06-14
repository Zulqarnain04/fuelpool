// app/(onboarding)/_layout.tsx — stack for onboarding screens, no header.
import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
