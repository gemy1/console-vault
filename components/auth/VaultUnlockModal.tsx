import { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Shield, Lock, Eye, EyeOff, X, KeyRound, Fingerprint } from 'lucide-react-native';
import * as Haptics from '@/utils/haptics';
import { VaultText as Text } from '../common/VaultText';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface VaultUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userEmail?: string;
}

export function VaultUnlockModal({ visible, onClose, onSuccess, userEmail }: VaultUnlockModalProps) {
  const { theme, colors } = useVaultTheme();
  const { isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const styles = createStyles(colors, theme);
  const { restoreVaultKey, user } = useAuth();
  const { isBiometricsAvailable, unlockWithBiometrics } = useSecurity();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayEmail = userEmail || user?.email || 'Your Account';

  const handleClose = () => {
    setPassword('');
    setErrorMessage(null);
    onClose();
  };

  const handlePasswordUnlock = async () => {
    if (!password.trim()) {
      setErrorMessage(isRTL ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setLoading(true);
    setErrorMessage(null);

    const success = await restoreVaultKey(password);
    setLoading(false);

    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      handleClose();
      onSuccess?.();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMessage(
        isRTL
          ? 'كلمة المرور غير صحيحة لفك تشفير الخزنة'
          : 'Invalid password. Could not unlock vault key.'
      );
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const ok = await unlockWithBiometrics();
      if (ok) {
        handleClose();
        onSuccess?.();
      }
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.badgeIconWrap}>
              <KeyRound size={20} color={colors.accent} strokeWidth={2.4} />
            </View>
            <View style={[styles.headerTitleWrap, isRTL && { alignItems: 'flex-end' }]}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'فك تشفير الخزنة' : 'Unlock Encryption Key'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isRTL
                  ? 'أدخل كلمة مرور حسابك لتفعيل مفتاح التشفير'
                  : 'Enter your account password to unlock credentials'}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* USER EMAIL BADGE (Read-Only) */}
          <View style={[styles.userBadge, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Shield size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.userBadgeText} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>

          {/* ERROR ALERT */}
          {errorMessage && (
            <View style={[styles.errorBanner, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.errorText, isRTL && styles.rtlText]}>{errorMessage}</Text>
            </View>
          )}

          {/* PASSWORD INPUT */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
              {isRTL ? 'كلمة مرور الحساب' : 'ACCOUNT PASSWORD'}
            </Text>
            <View style={[styles.inputWrapper, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Lock size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.inputField, isRTL && styles.rtlText]}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? (
                  <EyeOff size={16} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={16} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          {/* UNLOCK ACTION BUTTON */}
          <Pressable
            onPress={handlePasswordUnlock}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              loading && styles.submitBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isRTL ? 'فك تشفير ومتابعة' : 'Unlock & Continue'}
              </Text>
            )}
          </Pressable>

          {/* BIOMETRICS SHORTCUT */}
          {isBiometricsAvailable && (
            <Pressable
              onPress={handleBiometricUnlock}
              style={[styles.biometricBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}
            >
              <Fingerprint size={16} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.biometricBtnText}>
                {isRTL ? 'استخدام البصمة / Face ID' : 'Use Biometrics / Face ID'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) => {
  const isDark = theme === 'dark';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 24,
      elevation: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    badgeIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleWrap: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBadgeText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      flex: 1,
    },
    errorBanner: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      marginBottom: 14,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    },
    inputField: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
      paddingVertical: 0,
    },
    eyeBtn: {
      padding: 4,
    },
    submitBtn: {
      backgroundColor: colors.accent,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    },
    submitBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    biometricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      marginTop: 6,
    },
    biometricBtnText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    rtlText: {
      textAlign: 'right',
    },
  });
};
