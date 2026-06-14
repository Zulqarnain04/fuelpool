// app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Droplet, Mail, Lock, Eye, EyeOff, CircleAlert, ArrowRight } from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import Input from '../../src/components/common/Input';
import PrimaryButton from '../../src/components/common/PrimaryButton';
import { toast } from '../../src/components/common/Toast';
import {
  FP_PRIMARY,
  FP_DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_LIGHT,
  CARD,
} from '../../src/constants/colors';

export default function Login() {
  const router = useRouter();
  const { login, seedDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    if (!email.includes('@') || password.length < 1) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setError('Incorrect password. Please try again.');
      } else if (e?.response) {
        setError('Login failed. Please try again.');
      } else {
        setError("Can't reach the server. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDemo = async () => {
    setError(null);
    setSeeding(true);
    try {
      await seedDemo();
      toast.success('Demo data loaded!');
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(
        e?.response
          ? 'Could not seed demo data.'
          : "Can't reach the server to load demo data.",
      );
    } finally {
      setSeeding(false);
    }
  };

  const disabled = loading || seeding;

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
          {/* ── Top: logo + heading ── */}
          <View style={styles.top}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Droplet size={22} color={CARD} fill={CARD} />
              </View>
              <Text style={styles.brand}>FuelPool</Text>
            </View>

            <Text style={styles.h1}>Welcome back</Text>
            <Text style={styles.sub}>Log in to track your fuel and find rides.</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <Input
              leftIcon={<Mail size={18} color={TEXT_LIGHT} />}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              placeholder="your@utm.my"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!disabled}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Pressable
                onPress={() => Alert.alert('Forgot Password', 'Password reset is coming soon.')}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>
            </View>
            <Input
              leftIcon={<Lock size={18} color={TEXT_LIGHT} />}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              error={!!error}
              editable={!disabled}
              rightElement={
                <Pressable
                  onPress={() => setShowPw((s) => !s)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <EyeOff size={18} color={TEXT_LIGHT} />
                  ) : (
                    <Eye size={18} color={TEXT_LIGHT} />
                  )}
                </Pressable>
              }
            />

            {error ? (
              <View style={styles.errorRow}>
                <CircleAlert size={15} color={FP_DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Bottom: actions ── */}
          <View style={styles.bottom}>
            <PrimaryButton label="Log In" onPress={onLogin} loading={loading} disabled={disabled} />

            <Pressable
              onPress={onDemo}
              disabled={disabled}
              style={styles.demoBtn}
              accessibilityRole="button"
              accessibilityLabel={seeding ? 'Loading demo data' : 'Use demo data'}
            >
              <Text style={styles.demoText}>{seeding ? 'Loading demo…' : 'Use Demo Data'}</Text>
              {!seeding && <ArrowRight size={14} color={FP_PRIMARY} />}
            </Pressable>

            <View style={styles.signupRow}>
              <Text style={styles.signupMuted}>New user? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Sign up for a new account">
                  <Text style={styles.signupLink}>Sign up</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32 },
  top: { minHeight: '34%', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FP_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY },
  h1: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT_SECONDARY },
  form: { gap: 8, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6, marginTop: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forgot: { fontSize: 13, fontWeight: '700', color: FP_PRIMARY, marginTop: 10 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  errorText: { color: FP_DANGER, fontSize: 13, fontWeight: '600', flex: 1 },
  bottom: { marginTop: 28, gap: 16 },
  demoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  demoText: { color: FP_PRIMARY, fontSize: 14, fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  signupMuted: { color: TEXT_SECONDARY, fontSize: 14 },
  signupLink: { color: FP_PRIMARY, fontSize: 14, fontWeight: '700' },
});
