// app/profile.tsx — opened from the Home greeting-card avatar. Placeholder + dev logout.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import useAuth from '../src/hooks/useAuth';
import {
  BACKGROUND,
  CARD,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  FP_PRIMARY,
  FP_DANGER,
} from '../src/constants/colors';

function initialsOf(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}

        <View style={styles.note}>
          <Text style={styles.noteText}>Full profile, vehicles, and settings come in a later session.</Text>
        </View>

        {/* TEMP (dev only) — remove when real settings/logout lands. */}
        <Pressable style={styles.logout} onPress={handleLogout}>
          <LogOut size={16} color={FP_DANGER} />
          <Text style={styles.logoutText}>Log out (dev)</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: FP_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { color: CARD, fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY },
  email: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 },
  note: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 28,
    width: '100%',
  },
  noteText: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: FP_DANGER,
    backgroundColor: CARD,
    marginTop: 28,
  },
  logoutText: { color: FP_DANGER, fontSize: 14, fontWeight: '700' },
});
