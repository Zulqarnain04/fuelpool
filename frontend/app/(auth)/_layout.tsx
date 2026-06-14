// app/(auth)/_layout.tsx — stack for auth screens, no header.
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
