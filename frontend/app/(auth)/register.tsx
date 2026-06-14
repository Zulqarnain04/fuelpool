// app/(auth)/register.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CircleCheck,
  CircleAlert,
} from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import {
  FP_PRIMARY,
  FP_WARNING,
  FP_DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  CARD,
  BORDER,
} from '../../src/constants/colors';

type Gender = 'MALE' | 'FEMALE';

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: BORDER };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 8 && /[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (pw.length >= 10 && /[^a-zA-Z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: 'Weak', color: FP_DANGER };
  if (s === 2) return { score: 2, label: 'Medium', color: FP_WARNING };
  return { score: 3, label: 'Strong', color: FP_PRIMARY };
}

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length >= 2;
  const isStudentEmail = /\.(utm|edu)\.my$/i.test(email.trim());
  const strength = useMemo(() => passwordStrength(password), [password]);

  const onContinue = async () => {
    setError(null);
    if (!nameValid) return setError('Please enter your full name.');
    if (!email.includes('@')) return setError('Please enter a valid email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (!gender) return setError('Please select your gender for safe carpool matching.');

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, gender });
      router.replace({ pathname: '/(auth)/welcome', params: { name: name.trim() } });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setError('That email is already registered.');
      else if (e?.response) setError('Could not create account. Please try again.');
      else setError("Can't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.h1}>Create Account</Text>
          <Text style={styles.sub}>Join the smartest commuting network.</Text>

          {/* Full name */}
          <Text style={styles.label}>Full name</Text>
          <Input
            leftIcon={<User size={18} color={TEXT_LIGHT} />}
            value={name}
            onChangeText={setName}
            placeholder="Ahmad bin Abdullah"
            editable={!loading}
            rightElement={nameValid ? <CircleCheck size={18} color={FP_PRIMARY} /> : undefined}
          />

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <Input
            leftIcon={<Mail size={18} color={TEXT_LIGHT} />}
            value={email}
            onChangeText={setEmail}
            placeholder="your@utm.my"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            rightElement={isStudentEmail ? <CircleCheck size={18} color={FP_PRIMARY} /> : undefined}
          />
          {isStudentEmail ? (
            <Text style={styles.studentHint}>✓ Student email detected — eligible for campus rides</Text>
          ) : null}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <Input
            leftIcon={<Lock size={18} color={TEXT_LIGHT} />}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry={!showPw}
            editable={!loading}
            rightElement={
              <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={10}>
                {showPw ? <EyeOff size={18} color={TEXT_LIGHT} /> : <Eye size={18} color={TEXT_LIGHT} />}
              </Pressable>
            }
          />
          {password.length > 0 ? (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBars}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: i <= strength.score ? strength.color : BORDER },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          ) : null}

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {(['MALE', 'FEMALE'] as Gender[]).map((g) => {
              const active = gender === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  disabled={loading}
                  style={[styles.genderPill, active && styles.genderPillActive]}
                >
                  <Text style={[styles.genderText, active && styles.genderTextActive]}>
                    {g === 'MALE' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.genderNote}>Used for safe carpool matching only</Text>

          {error ? (
            <View style={styles.errorRow}>
              <CircleAlert size={15} color={FP_DANGER} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.bottom}>
            <PrimaryButton label="Continue" onPress={onContinue} loading={loading} />
            <View style={styles.loginRow}>
              <Text style={styles.loginMuted}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable disabled={loading}>
                  <Text style={styles.loginLink}>Log in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CARD },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 },
  h1: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6, marginTop: 16 },
  studentHint: { fontSize: 12, color: FP_PRIMARY, fontWeight: '600', marginTop: 6 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  strengthBars: { flexDirection: 'row', gap: 5, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', width: 56, textAlign: 'right' },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderPill: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: { backgroundColor: FP_PRIMARY, borderColor: FP_PRIMARY },
  genderText: { fontSize: 15, fontWeight: '700', color: TEXT_SECONDARY },
  genderTextActive: { color: CARD },
  genderNote: { fontSize: 12, color: TEXT_LIGHT, marginTop: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  errorText: { color: FP_DANGER, fontSize: 13, fontWeight: '600', flex: 1 },
  bottom: { marginTop: 28, gap: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginMuted: { color: TEXT_SECONDARY, fontSize: 14 },
  loginLink: { color: FP_PRIMARY, fontSize: 14, fontWeight: '700' },
});
