// app/(tabs)/eco.tsx — placeholder (built in a later session).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BACKGROUND, TEXT_PRIMARY } from '../../src/constants/colors';

export default function Eco() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Eco Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
});
