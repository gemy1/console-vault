import React from 'react';
import { Pressable, Text } from 'react-native';
import { useVaultTheme } from '../context/ThemeContext';

export function ThemeToggleButton({ size = 38 }: { size?: number }) {
  const { theme, toggleTheme, colors } = useVaultTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.75 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
        shadowRadius: 4,
      })}
    >
      <Text style={{ fontSize: size * 0.44 }}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </Text>
    </Pressable>
  );
}
