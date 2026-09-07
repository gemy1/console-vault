import { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Shield, Mail, Lock, Eye, EyeOff, X, ArrowRight, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VaultText as Text } from '../common/VaultText';
import { useAuth } from '../../context/AuthContext';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const { theme, colors } = useVaultTheme();
  const { isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const styles = createStyles(colors, theme);
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter your email and password');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setLoading(true);
    setErrorMessage(null);

    const action = mode === 'signin' ? signIn : signUp;
    const result = await action(email.trim(), password);

    setLoading(false);

    if (result.error) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMessage(result.error);
    } else if (mode === 'signup' && (result as any).needsConfirmation) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      setErrorMessage(
        isRTL
          ? 'تم إنشاء الحساب! يرجى تفقد بريدك الإلكتروني لتأكيد التسجيل، ثم سجّل الدخول.'
          : 'Account created! If email confirmation is enabled on your Supabase project, check your inbox to confirm, then sign in.'
      );
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onClose();
      onSuccess?.();
    }
  };

  const handleGuestContinue = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerTitleGroup, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.headerIconCircle}>
                <Shield size={18} color={colors.accent} strokeWidth={2.4} />
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                {mode === 'signin'
                  ? isRTL
                    ? 'تسجيل الدخول'
                    : 'Sign In to Vault'
                  : isRTL
                  ? 'إنشاء حساب جديد'
                  : 'Create Vault Account'}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* MODE TOGGLE TABS */}
          <View style={[styles.segmentTrack, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === 'signin' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === 'signin' && styles.segmentTextActive,
                ]}
              >
                {isRTL ? 'دخول' : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === 'signup' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === 'signup' && styles.segmentTextActive,
                ]}
              >
                {isRTL ? 'حساب جديد' : 'New Account'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* ERROR BANNER */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                {isRTL ? 'البريد الإلكتروني' : 'EMAIL ADDRESS'}
              </Text>
              <View style={[styles.inputWrapper, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Mail size={16} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  placeholder={isRTL ? 'your.name@example.com' : 'your.name@example.com'}
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.inputField, isRTL && styles.rtlText]}
                />
              </View>
            </View>

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                {isRTL ? 'كلمة المرور' : 'PASSWORD'}
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
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={colors.textSecondary} strokeWidth={2} />
                  ) : (
                    <Eye size={16} color={colors.textSecondary} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* SUBMIT ACTION BUTTON */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View style={[styles.submitBtnContent, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.submitBtnText}>
                    {mode === 'signin'
                      ? isRTL
                        ? 'تسجيل الدخول إلى الخزينة'
                        : 'Sign In to Vault'
                      : isRTL
                      ? 'إنشاء ومزامنة الخزينة'
                      : 'Create & Sync Vault'}
                  </Text>
                  {isRTL ? (
                    <ArrowLeft size={16} color="#000000" strokeWidth={2.4} />
                  ) : (
                    <ArrowRight size={16} color="#000000" strokeWidth={2.4} />
                  )}
                </View>
              )}
            </Pressable>

            {/* GUEST MODE BYPASS */}
            <Pressable onPress={handleGuestContinue} style={styles.guestBtn}>
              <Text style={styles.guestBtnText}>
                {isRTL ? 'المتابعة كزائر (خزينة محلية فقط)' : 'Continue as Guest (Local Vault Only)'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme === 'dark' ? '#0D1117' : '#FFFFFF',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    headerTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.12)' : 'rgba(0, 112, 209, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentTrack: {
      flexDirection: 'row',
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentBtnActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: '#000000',
    },
    scrollBody: {
      maxHeight: 400,
    },
    errorBanner: {
      backgroundColor: 'rgba(255, 59, 48, 0.15)',
      borderColor: 'rgba(255, 59, 48, 0.3)',
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    inputField: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    eyeBtn: {
      padding: 4,
    },
    submitBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    submitBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    submitBtnText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    guestBtn: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    guestBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
