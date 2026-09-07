import { useMemo } from 'react';
import { useVaultTheme, ThemeColors, ThemeMode } from '../context/ThemeContext';

export function useThemedStyles<T>(
  styleFactory: (colors: ThemeColors, theme: ThemeMode) => T
): T {
  const { colors, theme } = useVaultTheme();
  return useMemo(() => styleFactory(colors, theme), [colors, theme]);
}
