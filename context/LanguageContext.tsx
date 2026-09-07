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

// Prevent native iOS/Android Yoga engine from inverting row-directions unpredictably on modal mount
if (Platform.OS !== 'web') {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);
  const isRTL = language === 'ar';

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
    // Lock I18nManager native layout to false to prevent native Modals from dynamically
    // flipping native Yoga into an inconsistent split-brain layout state.
    if (Platform.OS !== 'web') {
      try {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      } catch {}
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      if (document.body) {
        document.body.dir = isRTL ? 'rtl' : 'ltr';
      }
      if (isRTL) {
        document.documentElement.classList.add('rtl-mode');
        if (document.body) document.body.classList.add('rtl-mode');
      } else {
        document.documentElement.classList.remove('rtl-mode');
        if (document.body) document.body.classList.remove('rtl-mode');
      }
    }
  }, [language, isRTL]);

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
