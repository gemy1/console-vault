import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { VaultStorage } from '../services/storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  neon: string;
  accentSubtle: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  warning: string;
  warningBg: string;
  success: string;
  successBg: string;
  pillActiveBg: string;
  pillActiveText: string;
  pillInactiveBg: string;
  pillInactiveText: string;
  tabBarBg: string;
  tabBarBorder: string;
  isDark: boolean;
}

const darkColors: ThemeColors = {
  bg: '#080C16',
  surface: '#0F172A',
  surfaceElevated: '#172033',
  surfaceSubtle: '#141E33',
  border: '#1E293B',
  borderSubtle: '#26334D',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#0070D1',
  neon: '#00D2FF',
  accentSubtle: 'rgba(0, 112, 209, 0.18)',
  danger: '#FF3B30',
  dangerBg: '#261014',
  dangerBorder: '#4A1D24',
  warning: '#FF9F0A',
  warningBg: 'rgba(255, 159, 10, 0.15)',
  success: '#30D158',
  successBg: 'rgba(48, 209, 88, 0.15)',
  pillActiveBg: '#F8FAFC',
  pillActiveText: '#080C16',
  pillInactiveBg: '#141E33',
  pillInactiveText: '#94A3B8',
  tabBarBg: '#0F172A',
  tabBarBorder: '#1E293B',
  isDark: true,
};

const lightColors: ThemeColors = {
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F4F9',
  border: '#E2E8F0',
  borderSubtle: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#0070D1',
  neon: '#005BB5',
  accentSubtle: 'rgba(0, 112, 209, 0.1)',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FEE2E2',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  success: '#10B981',
  successBg: '#ECFDF5',
  pillActiveBg: '#0F172A',
  pillActiveText: '#FFFFFF',
  pillInactiveBg: '#FFFFFF',
  pillInactiveText: '#64748B',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'console_vault_user_theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function VaultThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = VaultStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  // Re-verify on mount for async hydration (native environments)
  useEffect(() => {
    try {
      const saved = VaultStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeState((prev) => (prev !== saved ? saved : prev));
      }
    } catch {}
  }, []);

  // Synchronize document background color on web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        const bg = theme === 'dark' ? '#080C16' : '#F5F7FB';
        document.documentElement.style.backgroundColor = bg;
        if (document.body) {
          document.body.style.backgroundColor = bg;
        }
      } catch {}
    }
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      VaultStorage.setItem(THEME_STORAGE_KEY, mode);
      if (typeof document !== 'undefined') {
        const bg = mode === 'dark' ? '#080C16' : '#F5F7FB';
        document.documentElement.style.backgroundColor = bg;
        if (document.body) {
          document.body.style.backgroundColor = bg;
        }
      }
    } catch {}
  };

  const toggleTheme = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useVaultTheme() {
  return useContext(ThemeContext);
}
