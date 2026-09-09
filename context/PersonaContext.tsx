import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '@/utils/haptics';
import { SupportedCurrency } from '../types/vault';

export type UserPersona = 'gamer' | 'seller';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  labelEn: string;
  labelAr: string;
}

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', labelEn: 'USD ($)', labelAr: 'دولار ($)' },
  EGP: { code: 'EGP', symbol: 'EGP', labelEn: 'EGP (ج.م)', labelAr: 'جنيه (ج.م)' },
  SAR: { code: 'SAR', symbol: 'SAR', labelEn: 'SAR (ر.س)', labelAr: 'ريال (ر.س)' },
  AED: { code: 'AED', symbol: 'AED', labelEn: 'AED (د.إ)', labelAr: 'درهم (د.إ)' },
  EUR: { code: 'EUR', symbol: '€', labelEn: 'EUR (€)', labelAr: 'يورو (€)' },
  GBP: { code: 'GBP', symbol: '£', labelEn: 'GBP (£)', labelAr: 'إسترليني (£)' },
};

interface PersonaContextType {
  persona: UserPersona;
  isSeller: boolean;
  isGamer: boolean;
  setPersona: (p: UserPersona) => void;
  togglePersona: () => void;
  currency: SupportedCurrency;
  currencyConfig: CurrencyConfig;
  setCurrency: (c: SupportedCurrency) => void;
  formatCurrency: (amount: number, overrideCurrency?: string) => string;
}

const PERSONA_STORAGE_KEY = 'vault_user_persona_v1';
const CURRENCY_STORAGE_KEY = 'vault_user_currency_v1';

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<UserPersona>('gamer');
  const [currency, setCurrencyState] = useState<SupportedCurrency>('USD');

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedPersona = window.localStorage.getItem(PERSONA_STORAGE_KEY) as UserPersona | null;
          if (savedPersona === 'gamer' || savedPersona === 'seller') {
            setPersonaState(savedPersona);
          }
          const savedCurr = window.localStorage.getItem(CURRENCY_STORAGE_KEY) as SupportedCurrency | null;
          if (savedCurr && SUPPORTED_CURRENCIES[savedCurr]) {
            setCurrencyState(savedCurr);
          }
        } else {
          const [savedPersona, savedCurr] = await AsyncStorage.multiGet([
            PERSONA_STORAGE_KEY,
            CURRENCY_STORAGE_KEY,
          ]);
          if (savedPersona[1] === 'gamer' || savedPersona[1] === 'seller') {
            setPersonaState(savedPersona[1]);
          }
          if (savedCurr[1] && SUPPORTED_CURRENCIES[savedCurr[1] as SupportedCurrency]) {
            setCurrencyState(savedCurr[1] as SupportedCurrency);
          }
        }
      } catch {}
    })();
  }, []);

  const setPersona = useCallback((newPersona: UserPersona) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setPersonaState(newPersona);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PERSONA_STORAGE_KEY, newPersona);
      }
      AsyncStorage.setItem(PERSONA_STORAGE_KEY, newPersona).catch(() => {});
    } catch {}
  }, []);

  const togglePersona = useCallback(() => {
    const next = persona === 'gamer' ? 'seller' : 'gamer';
    setPersona(next);
  }, [persona, setPersona]);

  const setCurrency = useCallback((newCurrency: SupportedCurrency) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCurrencyState(newCurrency);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      }
      AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency).catch(() => {});
    } catch {}
  }, []);

  const formatCurrency = useCallback(
    (amount: number, overrideCurrency?: string): string => {
      const targetCode = (overrideCurrency as SupportedCurrency) || currency;
      const cfg = SUPPORTED_CURRENCIES[targetCode] || SUPPORTED_CURRENCIES.USD;
      const num = Number(amount || 0);
      const formattedNumber = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      if (cfg.code === 'USD' || cfg.code === 'EUR' || cfg.code === 'GBP') {
        return `${cfg.symbol}${formattedNumber}`;
      }
      return `${formattedNumber} ${cfg.symbol}`;
    },
    [currency]
  );

  const value = useMemo(
    () => ({
      persona,
      isSeller: persona === 'seller',
      isGamer: persona === 'gamer',
      setPersona,
      togglePersona,
      currency,
      currencyConfig: SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD,
      setCurrency,
      formatCurrency,
    }),
    [persona, setPersona, togglePersona, currency, setCurrency, formatCurrency]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    return {
      persona: 'gamer' as UserPersona,
      isSeller: false,
      isGamer: true,
      setPersona: () => {},
      togglePersona: () => {},
      currency: 'USD' as SupportedCurrency,
      currencyConfig: SUPPORTED_CURRENCIES.USD,
      setCurrency: () => {},
      formatCurrency: (amount: number) => `$${Number(amount || 0).toFixed(2)}`,
    };
  }
  return context;
}
