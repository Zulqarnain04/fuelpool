// src/components/common/Input.tsx
// Text field with a left icon slot, optional right element, and focus/error borders.

import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { FP_PRIMARY, FP_DANGER, TEXT_LIGHT, TEXT_PRIMARY } from '../../constants/colors';

interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function Input({
  leftIcon,
  rightElement,
  error = false,
  containerStyle,
  editable = true,
  onFocus,
  onBlur,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? FP_DANGER : focused ? FP_PRIMARY : 'transparent';

  return (
    <View
      style={[
        styles.container,
        { borderColor },
        !editable && styles.disabled,
        containerStyle,
      ]}
    >
      {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={TEXT_LIGHT}
        editable={editable}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F5',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.6 },
  leftIcon: { marginRight: 10 },
  rightElement: { marginLeft: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
});
