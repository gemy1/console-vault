import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { VaultStorage } from '../services/storage';
import { Language, TRANSLATIONS, TranslationKey } from '../constants/translations';

const LANGUAGE_STORAGE_KEY = 'vault_app_language_v1';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isRTL: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: TranslationKey) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load persisted language
  useEffect(() => {
    try {
      const saved = VaultStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      VaultStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'en' ? 'ar' : 'en';
      try {
        VaultStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let text: string = dict[key] || TRANSLATIONS.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    },
    [language]
  );

  const value = {
    language,
    isRTL: language === 'ar',
    setLanguage,
    toggleLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
