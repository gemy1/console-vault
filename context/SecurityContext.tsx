import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { VaultStorage } from '../services/storage';

const BIOMETRICS_ENABLED_KEY = 'vault_security_biometrics_enabled_v1';
const MASTER_PIN_KEY = 'vault_security_master_pin_v1';

interface SecurityContextType {
  isVaultUnlocked: boolean;
  isBiometricsAvailable: boolean;
  isBiometricsEnabled: boolean;
  hasMasterPin: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPin: (pin: string) => boolean;
  setMasterPin: (pin: string | null) => void;
  toggleBiometrics: (enabled: boolean) => Promise<boolean>;
  lockVault: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(() => {
    return VaultStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
  });
  const [hasMasterPin, setHasMasterPin] = useState<boolean>(() => {
    return Boolean(VaultStorage.getItem(MASTER_PIN_KEY));
  });

  // Vault starts unlocked ONLY if neither biometrics nor PIN is enabled
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(() => {
    const bio = VaultStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
    const pin = Boolean(VaultStorage.getItem(MASTER_PIN_KEY));
    return !bio && !pin;
  });

  // Check hardware availability on mount
  useEffect(() => {
    async function checkHardware() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricsAvailable(hasHardware && isEnrolled);
      } catch {
        setIsBiometricsAvailable(false);
      }
    }
    checkHardware();
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      if (!isBiometricsAvailable && Platform.OS === 'web') {
        setIsVaultUnlocked(true);
        return true;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Console Vault',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsVaultUnlocked(true);
        return true;
      }
      return false;
    } catch {
      if (Platform.OS === 'web') {
        setIsVaultUnlocked(true);
        return true;
      }
      return false;
    }
  }, [isBiometricsAvailable]);

  const unlockWithPin = useCallback((pin: string): boolean => {
    const saved = VaultStorage.getItem(MASTER_PIN_KEY);
    if (saved && saved === pin) {
      setIsVaultUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const setMasterPin = useCallback((pin: string | null) => {
    if (pin) {
      VaultStorage.setItem(MASTER_PIN_KEY, pin);
      setHasMasterPin(true);
    } else {
      VaultStorage.removeItem(MASTER_PIN_KEY);
      setHasMasterPin(false);
    }
  }, []);

  const toggleBiometrics = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      if (isBiometricsAvailable) {
        const success = await unlockWithBiometrics();
        if (success) {
          VaultStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
          setIsBiometricsEnabled(true);
          return true;
        }
        return false;
      } else {
        VaultStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
        setIsBiometricsEnabled(true);
        return true;
      }
    } else {
      VaultStorage.setItem(BIOMETRICS_ENABLED_KEY, 'false');
      setIsBiometricsEnabled(false);
      return true;
    }
  }, [isBiometricsAvailable, unlockWithBiometrics]);

  const lockVault = useCallback(() => {
    setIsVaultUnlocked(false);
  }, []);

  const value = useMemo(
    () => ({
      isVaultUnlocked,
      isBiometricsAvailable,
      isBiometricsEnabled,
      hasMasterPin,
      unlockWithBiometrics,
      unlockWithPin,
      setMasterPin,
      toggleBiometrics,
      lockVault,
    }),
    [
      isVaultUnlocked,
      isBiometricsAvailable,
      isBiometricsEnabled,
      hasMasterPin,
      unlockWithBiometrics,
      unlockWithPin,
      setMasterPin,
      toggleBiometrics,
      lockVault,
    ]
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
