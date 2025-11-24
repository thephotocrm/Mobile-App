import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  onChangeText: (text: string) => void;
}

export function Input({ onChangeText, ...props }: InputProps) {
  const { theme } = useTheme();

  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          color: theme.text,
        },
      ]}
      placeholderTextColor={theme.textSecondary}
      onChangeText={onChangeText}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: Spacing.md - 4,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: Spacing.inputHeight,
    textAlignVertical: 'center',
  },
});
