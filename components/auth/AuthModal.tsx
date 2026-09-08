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
import { Shield, Mail, Lock, Eye, EyeOff, X, ArrowRight, ArrowLeft, CircleCheck } from 'lucide-react-native';
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
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleClose = () => {
    if (signUpSuccess) {
      setSignUpSuccess(false);
      setMode('signin');
      setPassword('');
    }
    setErrorMessage(null);
    onClose();
  };

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setSubmittedEmail(email.trim());
      setSignUpSuccess(true);
      setErrorMessage(null);
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      handleClose();
      onSuccess?.();
    }
  };

  const handleGuestContinue = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerTitleGroup, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.headerIconCircle, signUpSuccess && styles.headerIconCircleSuccess]}>
                {signUpSuccess ? (
                  <CircleCheck size={18} color="#10B981" strokeWidth={2.4} />
                ) : (
                  <Shield size={18} color={colors.accent} strokeWidth={2.4} />
                )}
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                {signUpSuccess
                  ? isRTL
                    ? 'تأكيد الحساب'
                    : 'Check Your Inbox'
                  : mode === 'signin'
                  ? isRTL
                    ? 'تسجيل الدخول'
                    : 'Sign In to Vault'
                  : isRTL
                  ? 'إنشاء حساب جديد'
                  : 'Create Vault Account'}
              </Text>
            </View>

            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {signUpSuccess ? (
            /* DEDICATED SIGNUP SUCCESS VIEW */
            <View style={styles.successContainer}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <CircleCheck size={38} color="#10B981" strokeWidth={2.2} />
                </View>
              </View>

              <Text style={[styles.successTitle, isRTL && styles.rtlText]}>
                {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check Your Inbox'}
              </Text>

              <Text style={[styles.successSubtitle, isRTL && styles.rtlText]}>
                {isRTL
                  ? 'تم إرسال رابط التفعيل وتأكيد الحساب إلى:'
                  : 'We have sent a verification link to:'}
              </Text>

              <View style={[styles.emailBadge, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Mail size={16} color={colors.accent} strokeWidth={2} />
                <Text style={styles.emailBadgeText} numberOfLines={1}>
                  {submittedEmail}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={[styles.infoBoxText, isRTL && styles.rtlText]}>
                  {isRTL
                    ? 'يرجى فتح رسالتك والضغط على رابط التحقق لتفعيل حسابك. بعد التفعيل، اضغط على الزر أدناه لتسجيل الدخول.'
                    : 'Click the verification link in your email to activate your account. Once verified, click below to sign in.'}
                </Text>
                <Text style={[styles.spamHintText, isRTL && styles.rtlText]}>
                  {isRTL
                    ? '💡 لم تجد الرسالة؟ تفقد مجلد الرسائل غير المرغوب فيها (Spam / Junk).'
                    : "💡 Didn't receive it? Check your Spam or Junk folder."}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setSignUpSuccess(false);
                  setMode('signin');
                  setPassword('');
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.submitBtn,
                  styles.successProceedBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={[styles.submitBtnContent, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.submitBtnText}>
                    {isRTL ? 'الانتقال لتسجيل الدخول' : 'Proceed to Sign In'}
                  </Text>
                  {isRTL ? (
                    <ArrowLeft size={16} color="#000000" strokeWidth={2.4} />
                  ) : (
                    <ArrowRight size={16} color="#000000" strokeWidth={2.4} />
                  )}
                </View>
              </Pressable>

              <Pressable onPress={handleClose} style={styles.guestBtn}>
                <Text style={styles.guestBtnText}>
                  {isRTL ? 'إغلاق ومتابعة الاستخدام لاحقاً' : 'Dismiss & Continue'}
                </Text>
              </Pressable>
            </View>
          ) : (
            /* STANDARD AUTH FORM */
            <>
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
            </>
          )}
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
    headerIconCircleSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    successContainer: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    successIconOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    successIconInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    emailBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.08)' : 'rgba(0, 112, 209, 0.08)',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.25)' : 'rgba(0, 112, 209, 0.25)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 16,
    },
    emailBadgeText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
    infoBox: {
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      width: '100%',
    },
    infoBoxText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 8,
      textAlign: 'center',
    },
    spamHintText: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
      textAlign: 'center',
    },
    successProceedBtn: {
      width: '100%',
      marginTop: 2,
      marginBottom: 8,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
