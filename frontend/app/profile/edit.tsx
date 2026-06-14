// app/profile/edit.tsx — update name + notification token (PUT /users/me).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Bell } from 'lucide-react-native';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import useAuth from '../../src/hooks/useAuth';
import { userApi } from '../../src/services/api';
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_LIGHT, FP_DANGER } from '../../src/constants/colors';

export default function EditProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [fcmToken, setFcmToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi.getMe().then((r) => { if (r.data?.name) setName(r.data.name); }).catch(() => {});
  }, []);

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Please enter your name.');
    setLoading(true);
    try {
      await userApi.updateMe({ name: name.trim(), ...(fcmToken ? { fcmToken } : {}) });
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
    } catch (e: any) {
      setError(e?.response ? 'Could not save changes.' : "Can't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={22} color={TEXT_PRIMARY} /></Pressable>
          <Text style={styles.topTitle}>Edit Profile</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Full name</Text>
          <Input leftIcon={<User size={18} color={TEXT_LIGHT} />} value={name} onChangeText={setName} placeholder="Your name" />

          <Text style={styles.label}>Notification token (optional)</Text>
          <Input leftIcon={<Bell size={18} color={TEXT_LIGHT} />} value={fcmToken} onChangeText={setFcmToken} placeholder="FCM / push token" autoCapitalize="none" />
          <Text style={styles.hint}>Used to deliver fuel-price and ride-match push notifications.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ height: 24 }} />
          <PrimaryButton label="Save changes" onPress={save} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 8, marginTop: 18 },
  hint: { fontSize: 12, color: TEXT_LIGHT, marginTop: 6 },
  error: { color: FP_DANGER, fontSize: 13, fontWeight: '600', marginTop: 16 },
});
