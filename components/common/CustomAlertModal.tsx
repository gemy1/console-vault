import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from '@/utils/haptics';
import { VaultText as Text } from './VaultText';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

export interface AlertButton {
  text: string;
  subtext?: string;
  style?: 'default' | 'primary' | 'cancel' | 'destructive' | 'secondary';
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress?: () => void | Promise<void>;
}

export interface CustomAlertConfig {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  buttons?: AlertButton[];
  dismissible?: boolean;
  onDismiss?: () => void;
}

interface CustomAlertModalProps {
  visible: boolean;
  config: CustomAlertConfig | null;
  onClose: () => void;
}

export function CustomAlertModal({
  visible,
  config,
  onClose,
}: CustomAlertModalProps) {
  const { theme, colors } = useVaultTheme();
  const { isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const styles = createStyles(colors, theme);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
      scaleAnim.setValue(0.92);
    }
  }, [visible]);

  if (!config && !visible) return null;

  const type = config?.type || 'info';
  const buttons = config?.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: isRTL ? 'حسناً' : 'OK', style: 'default' as const }];

  // Render preset header icon if not overridden
  const renderHeaderIcon = () => {
    if (config?.icon) {
      const CustomIcon = config.icon;
      return <CustomIcon size={24} color={colors.accent} strokeWidth={2.2} />;
    }

    switch (type) {
      case 'danger':
        return <Trash2 size={24} color="#EF4444" strokeWidth={2.2} />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" strokeWidth={2.2} />;
      case 'success':
        return <CheckCircle2 size={24} color="#10B981" strokeWidth={2.2} />;
      case 'info':
      default:
        return <Info size={24} color="#00D2FF" strokeWidth={2.2} />;
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case 'danger':
        return styles.badgeDanger;
      case 'warning':
        return styles.badgeWarning;
      case 'success':
        return styles.badgeSuccess;
      case 'info':
      default:
        return styles.badgeInfo;
    }
  };

  const handleButtonPress = async (btn: AlertButton) => {
    try {
      if (btn.style === 'destructive') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}

    onClose();
    if (btn.onPress) {
      await btn.onPress();
    }
  };

  // Stack buttons vertically if 3+ buttons or any button has subtext
  const isStacked =
    buttons.length > 2 || buttons.some((b) => Boolean(b.subtext));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (config?.dismissible !== false) {
          onClose();
          config?.onDismiss?.();
        }
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (config?.dismissible !== false) {
              onClose();
              config?.onDismiss?.();
            }
          }}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Decorative Border Accent */}
          <View
            style={[
              styles.topAccentBar,
              type === 'danger' && { backgroundColor: '#EF4444' },
              type === 'warning' && { backgroundColor: '#F59E0B' },
              type === 'success' && { backgroundColor: '#10B981' },
              type === 'info' && { backgroundColor: '#00D2FF' },
            ]}
          />

          {/* ICON BADGE */}
          <View style={[styles.iconContainer, getBadgeStyle()]}>
            {renderHeaderIcon()}
          </View>

          {/* TITLE & MESSAGE */}
          <Text style={[styles.title, isRTL && styles.rtlText]}>
            {config?.title}
          </Text>

          {config?.message ? (
            <Text style={[styles.message, isRTL && styles.rtlText]}>
              {config.message}
            </Text>
          ) : null}

          {/* ACTION BUTTONS */}
          <View
            style={[
              isStacked ? styles.buttonStack : styles.buttonRow,
              !isStacked && isNativeRTL && { flexDirection: 'row-reverse' },
            ]}
          >
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isSecondary = btn.style === 'secondary';

              const BtnIcon = btn.icon;

              if (isStacked) {
                return (
                  <Pressable
                    key={`alert-btn-${index}`}
                    onPress={() => handleButtonPress(btn)}
                    style={({ pressed }) => [
                      styles.stackedBtn,
                      isDestructive && styles.stackedBtnDestructive,
                      isSecondary && styles.stackedBtnSecondary,
                      isCancel && styles.stackedBtnCancel,
                      pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View
                      style={[
                        styles.stackedBtnInner,
                        isNativeRTL && { flexDirection: 'row-reverse' },
                      ]}
                    >
                      {BtnIcon ? (
                        <View style={styles.btnIconBox}>
                          <BtnIcon
                            size={16}
                            color={
                              isDestructive
                                ? '#EF4444'
                                : isCancel
                                ? colors.textSecondary
                                : '#00D2FF'
                            }
                            strokeWidth={2}
                          />
                        </View>
                      ) : null}

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stackedBtnText,
                            isDestructive && styles.textDestructive,
                            isCancel && styles.textCancel,
                            isRTL && styles.rtlText,
                          ]}
                        >
                          {btn.text}
                        </Text>
                        {btn.subtext ? (
                          <Text
                            style={[
                              styles.stackedBtnSubtext,
                              isRTL && styles.rtlText,
                            ]}
                          >
                            {btn.subtext}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              }

              // Horizontal Layout (Standard 2 Buttons)
              return (
                <Pressable
                  key={`alert-btn-${index}`}
                  onPress={() => handleButtonPress(btn)}
                  style={({ pressed }) => [
                    styles.rowBtn,
                    isDestructive && styles.rowBtnDestructive,
                    isCancel && styles.rowBtnCancel,
                    !isDestructive && !isCancel && styles.rowBtnPrimary,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowBtnText,
                      isDestructive && styles.textDestructive,
                      isCancel && styles.textCancel,
                      !isDestructive && !isCancel && styles.textPrimary,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, theme: ThemeMode) {
  const isDark = theme === 'dark';

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.74)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
    },
    card: {
      width: '100%',
      maxWidth: 390,
      backgroundColor: isDark ? '#10141E' : '#FFFFFF',
      borderRadius: 24,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.6 : 0.2,
      shadowRadius: 28,
      elevation: 16,
      alignItems: 'center',
      overflow: 'hidden',
    },
    topAccentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3.5,
    },
    iconContainer: {
      width: 54,
      height: 54,
      borderRadius: 27,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    badgeDanger: {
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    badgeWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    badgeSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    badgeInfo: {
      backgroundColor: 'rgba(0, 210, 255, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(0, 210, 255, 0.3)',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    message: {
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    rtlText: {
      textAlign: 'right',
    },

    // Horizontal 2-button row
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
    },
    rowBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    rowBtnPrimary: {
      backgroundColor: '#00D2FF',
    },
    rowBtnDestructive: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    rowBtnCancel: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    rowBtnText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    textPrimary: {
      color: '#000000',
      fontWeight: '700',
    },
    textDestructive: {
      color: '#EF4444',
      fontWeight: '700',
    },
    textCancel: {
      color: colors.textSecondary,
    },

    // Vertical Stack Layout (3+ buttons or buttons with subtext)
    buttonStack: {
      width: '100%',
      gap: 8,
    },
    stackedBtn: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    stackedBtnDestructive: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.07)',
      borderColor: 'rgba(239, 68, 68, 0.28)',
    },
    stackedBtnSecondary: {
      backgroundColor: isDark ? 'rgba(0, 210, 255, 0.08)' : 'rgba(0, 210, 255, 0.06)',
      borderColor: 'rgba(0, 210, 255, 0.25)',
    },
    stackedBtnCancel: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      paddingVertical: 10,
    },
    stackedBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    btnIconBox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stackedBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    stackedBtnSubtext: {
      fontSize: 11.5,
      color: colors.textSecondary,
      lineHeight: 16,
    },
  });
}
