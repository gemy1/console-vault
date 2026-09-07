import React from 'react';
import { Pressable, Text } from 'react-native';
import { useVaultTheme } from '../context/ThemeContext';

export function ThemeToggleButton({ size = 48 }: { size?: number }) {
  const { theme, toggleTheme, colors } = useVaultTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        opacity: pressed ? 0.8 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme === 'dark' ? 0.35 : 0.10,
        shadowRadius: 8,
        elevation: 4,
      })}
    >
      <Text style={{ fontSize: Math.round(size * 0.42) }}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </Text>
    </Pressable>
  );
}
