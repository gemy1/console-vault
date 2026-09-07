import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export function ThemeToggleButton({ size = 46 }: { size?: number }) {
  const { theme, toggleTheme } = useVaultTheme();
  const styles = useThemedStyles(createStyles);
  const iconSize = Math.round(size * 0.45);

  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.buttonPressed,
      ]}
    >
      {theme === 'dark' ? (
        <Sun size={iconSize} color="#FBBF24" strokeWidth={2.2} />
      ) : (
        <Moon size={iconSize} color="#334155" strokeWidth={2.2} />
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      boxShadow: theme === 'dark' ? '0px 4px 8px rgba(0, 0, 0, 0.35)' : '0px 4px 8px rgba(0, 0, 0, 0.1)',
      elevation: 4,
    },
    buttonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.92 }],
    },
  });
