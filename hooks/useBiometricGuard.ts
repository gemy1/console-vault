import { useState, useCallback, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from '@/utils/haptics';

export interface BiometricPromptOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
}

export function useBiometricGuard(autoLockSeconds: number = 60) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestUnlock = useCallback(async (options?: BiometricPromptOptions): Promise<boolean> => {
    try {
      setIsAuthenticating(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // If device has no biometrics set up, allow reveal
      if (!hasHardware || !isEnrolled) {
        setIsUnlocked(true);
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || 'Unlock PSN account credentials',
        fallbackLabel: options?.fallbackLabel || 'Use Device Passcode',
        cancelLabel: options?.cancelLabel || 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setIsUnlocked(true);

        // Clear existing timer if any
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Auto-lock credentials after autoLockSeconds
        timeoutRef.current = setTimeout(() => {
          setIsUnlocked(false);
        }, autoLockSeconds * 1000);

        return true;
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        return false;
      }
    } catch {
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [autoLockSeconds]);

  const lock = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsUnlocked(false);
  }, []);

  return {
    isUnlocked,
    isAuthenticating,
    requestUnlock,
    lock,
  };
}
