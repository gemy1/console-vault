import React from 'react';
import { Pressable } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useVaultTheme } from '../context/ThemeContext';

export function ThemeToggleButton({ size = 46 }: { size?: number }) {
  const { theme, toggleTheme, colors } = useVaultTheme();
  const iconSize = Math.round(size * 0.45);

  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.92 : 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme === 'dark' ? 0.35 : 0.10,
        shadowRadius: 8,
        elevation: 4,
      })}
    >
      {theme === 'dark' ? (
        <Sun size={iconSize} color="#FBBF24" strokeWidth={2.2} />
      ) : (
        <Moon size={iconSize} color="#334155" strokeWidth={2.2} />
      )}
    </Pressable>
  );
}
