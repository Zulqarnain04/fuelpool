// src/components/common/OptionSheet.tsx
// Simple bottom-sheet list picker (Expo Go friendly — uses core Modal, no native deps).

import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { CARD, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, FP_PRIMARY } from '../../constants/colors';

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: string[];
  selected?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function OptionSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list} bounces={false}>
            {options.map((opt) => {
              const active = opt === selected;
              return (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{opt}</Text>
                  {active && <Check size={18} color={FP_PRIMARY} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 8 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { fontSize: 15, color: TEXT_SECONDARY },
  rowTextActive: { color: TEXT_PRIMARY, fontWeight: '700' },
});
