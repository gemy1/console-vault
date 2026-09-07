import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { ShieldCheck, Fingerprint, Delete, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VaultText as Text } from '../common/VaultText';
import { useSecurity } from '../../context/SecurityContext';
import { useVaultTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export function BiometricLockScreen() {
  const { colors, theme } = useVaultTheme();
  const { isRTL } = useLanguage();
  const {
    isVaultUnlocked,
    isBiometricsAvailable,
    hasMasterPin,
    unlockWithBiometrics,
    unlockWithPin,
  } = useSecurity();

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinPad, setShowPinPad] = useState(!isBiometricsAvailable && hasMasterPin);
  const pulseAnim = useState(() => new Animated.Value(1))[0];

  // Continuous subtle pulse on the lock shield
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Attempt biometric prompt on initial mount if available
  useEffect(() => {
    if (isBiometricsAvailable && !isVaultUnlocked) {
      const timer = setTimeout(() => {
        unlockWithBiometrics();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isBiometricsAvailable, isVaultUnlocked, unlockWithBiometrics]);

  if (isVaultUnlocked) {
    return null;
  }

  const handleBiometricPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await unlockWithBiometrics();
  };

  const handleDigitPress = (digit: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setPinError(false);

    const nextPin = enteredPin + digit;
    if (nextPin.length <= 4) {
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        // Attempt unlock
        const success = unlockWithPin(nextPin);
        if (!success) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
          setPinError(true);
          setTimeout(() => setEnteredPin(''), 500);
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setPinError(false);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const isDark = theme === 'dark';

  return (
    <View style={[styles.overlay, { backgroundColor: isDark ? '#05070A' : '#F8FAFC' }]}>
      <View style={styles.centerContainer}>
        {/* PULSING LOCK ICON */}
        <Animated.View
          style={[
            styles.iconHalo,
            {
              backgroundColor: isDark ? 'rgba(0, 210, 255, 0.08)' : 'rgba(0, 112, 209, 0.08)',
              borderColor: isDark ? 'rgba(0, 210, 255, 0.2)' : 'rgba(0, 112, 209, 0.2)',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? 'rgba(0, 210, 255, 0.16)' : 'rgba(0, 112, 209, 0.14)' },
            ]}
          >
            <ShieldCheck size={42} color={colors.accent} strokeWidth={2.4} />
          </View>
        </Animated.View>

        {/* VAULT TITLE & ENCRYPTION SUBTEXT */}
        <Text style={[styles.title, { color: colors.text }]}>
          Console Vault
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRTL
            ? 'الخزينة مشفرة ومقفلة محلياً لضمان أمان الحسابات'
            : 'Hardware Encrypted • Protected Console Vault'}
        </Text>

        {/* PIN DOTS (IF IN PIN MODE) */}
        {showPinPad && (
          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = enteredPin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: pinError ? colors.danger : colors.accent,
                      backgroundColor: isFilled
                        ? pinError
                          ? colors.danger
                          : colors.accent
                        : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* BIOMETRIC ACTION BUTTON */}
        {!showPinPad && (
          <Pressable
            onPress={handleBiometricPress}
            style={({ pressed }) => [
              styles.primaryUnlockBtn,
              { backgroundColor: colors.accent },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Fingerprint size={20} color="#000000" strokeWidth={2.4} />
            <Text style={styles.primaryUnlockBtnText}>
              {isBiometricsAvailable
                ? isRTL
                  ? 'فتح القفل بالبصمة / Face ID'
                  : 'Unlock with Biometrics'
                : isRTL
                ? 'فتح قفل الخزينة'
                : 'Unlock Console Vault'}
            </Text>
          </Pressable>
        )}

        {/* SWITCH TO PIN PAD BUTTON */}
        {!showPinPad && hasMasterPin && (
          <Pressable
            onPress={() => setShowPinPad(true)}
            style={styles.switchModeBtn}
          >
            <KeyRound size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.switchModeText, { color: colors.textSecondary }]}>
              {isRTL ? 'استخدام رمز PIN' : 'Use Master PIN Instead'}
            </Text>
          </Pressable>
        )}

        {/* PIN PAD DIGITS GRID */}
        {showPinPad && (
          <View style={styles.keypadContainer}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map(
              (row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((item, colIndex) => {
                    if (item === '') {
                      return <View key={colIndex} style={styles.keypadEmpty} />;
                    }
                    if (item === 'del') {
                      return (
                        <Pressable
                          key={colIndex}
                          onPress={handleDeleteDigit}
                          style={styles.keypadButton}
                        >
                          <Delete size={20} color={colors.textSecondary} strokeWidth={2} />
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={colIndex}
                        onPress={() => handleDigitPress(item)}
                        style={({ pressed }) => [
                          styles.keypadButton,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.08)',
                          },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={[styles.keypadDigit, { color: colors.text }]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )
            )}

            {isBiometricsAvailable && (
              <Pressable
                onPress={() => setShowPinPad(false)}
                style={styles.switchModeBtn}
              >
                <Fingerprint size={15} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.switchModeText, { color: colors.accent }]}>
                  {isRTL ? 'الرجوع إلى البصمة' : 'Back to Biometrics'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  iconHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  primaryUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryUnlockBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 14,
    alignItems: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  keypadButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadDigit: {
    fontSize: 24,
    fontWeight: '700',
  },
  keypadEmpty: {
    width: 68,
    height: 68,
  },
});
