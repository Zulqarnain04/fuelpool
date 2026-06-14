// app/(tabs)/_layout.tsx — bottom tabs: Home | Fuel | Ride | Eco.
// Per-tab active tint matches each layer's brand color.
import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Droplet, Users, Leaf } from 'lucide-react-native';
import {
  FP_PRIMARY,
  FP_SECONDARY,
  FP_CARPOOL,
  TEXT_LIGHT,
  CARD,
  BORDER,
} from '../../src/constants/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: TEXT_LIGHT,
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopWidth: 1,
          borderTopColor: BORDER,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarActiveTintColor: FP_PRIMARY,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarActiveTintColor: FP_SECONDARY,
          tabBarIcon: ({ color, size }) => <Droplet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ride"
        options={{
          title: 'Ride',
          tabBarActiveTintColor: FP_CARPOOL,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="eco"
        options={{
          title: 'Eco',
          tabBarActiveTintColor: FP_PRIMARY,
          tabBarIcon: ({ color, size }) => <Leaf color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
