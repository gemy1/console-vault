import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Platform, I18nManager } from 'react-native';
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

const getStoredLanguage = (): Language => {
  try {
    const saved = VaultStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') {
      return saved;
    }
  } catch {}
  return 'en';
};

// Immediate DOM sync on web before component tree mounts
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const initialLang = getStoredLanguage();
    const isRtl = initialLang === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = initialLang;
    if (document.body) {
      document.body.dir = isRtl ? 'rtl' : 'ltr';
    }
    if (isRtl) {
      document.documentElement.classList.add('rtl-mode');
      if (document.body) document.body.classList.add('rtl-mode');
    } else {
      document.documentElement.classList.remove('rtl-mode');
      if (document.body) document.body.classList.remove('rtl-mode');
    }
  } catch {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  // Load persisted language (ensures native AsyncStorage hydration is caught)
  useEffect(() => {
    try {
      const saved = VaultStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') {
        setLanguageState((prev) => (prev !== saved ? saved : prev));
      }
    } catch {}
  }, []);

  // Sync RTL attributes and Cairo font class
  useEffect(() => {
    const isRtlMode = language === 'ar';
    try {
      if (I18nManager.isRTL !== isRtlMode) {
        I18nManager.allowRTL(isRtlMode);
        I18nManager.forceRTL(isRtlMode);
      }
    } catch {}

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = isRtlMode ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      if (document.body) {
        document.body.dir = isRtlMode ? 'rtl' : 'ltr';
      }
      if (isRtlMode) {
        document.documentElement.classList.add('rtl-mode');
        if (document.body) document.body.classList.add('rtl-mode');
      } else {
        document.documentElement.classList.remove('rtl-mode');
        if (document.body) document.body.classList.remove('rtl-mode');
      }
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      VaultStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const isRtl = lang === 'ar';
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        if (document.body) document.body.dir = isRtl ? 'rtl' : 'ltr';
        if (isRtl) {
          document.documentElement.classList.add('rtl-mode');
          if (document.body) document.body.classList.add('rtl-mode');
        } else {
          document.documentElement.classList.remove('rtl-mode');
          if (document.body) document.body.classList.remove('rtl-mode');
        }
      }
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
