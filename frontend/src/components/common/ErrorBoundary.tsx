// src/components/common/ErrorBoundary.tsx
// Wraps a tab screen so an unexpected render error shows a recoverable
// fallback instead of crashing the whole app.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleAlert, RefreshCw } from 'lucide-react-native';
import { FP_PRIMARY, FP_DANGER, BACKGROUND, CARD, TEXT_PRIMARY, TEXT_SECONDARY } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <View style={styles.icon}>
              <CircleAlert size={28} color={FP_DANGER} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.sub}>This screen ran into a problem. You can try refreshing it.</Text>
            <Pressable style={styles.retryBtn} onPress={this.reset} accessibilityRole="button" accessibilityLabel="Refresh screen">
              <RefreshCw size={16} color={CARD} />
              <Text style={styles.retryText}>Refresh</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FCEAEA', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  sub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', maxWidth: 260, marginTop: 6, marginBottom: 18 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: FP_PRIMARY, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: CARD, fontSize: 14, fontWeight: '800' },
});
