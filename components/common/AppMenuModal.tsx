import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VaultText as Text } from './VaultText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Moon,
  Sun,
  Globe,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Cloud,
} from 'lucide-react-native';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.8));

interface AppMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppMenuModal({ visible, onClose }: AppMenuModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useVaultTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const styles = useThemedStyles(createStyles);

  const animValue = useRef(new Animated.Value(0)).current;
  const [modalRendered, setModalRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setModalRendered(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
    });
  };

  const handleSelectTheme = (newTheme: ThemeMode) => {
    if (newTheme === theme) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setTheme(newTheme);
  };

  const handleSelectLanguage = (newLang: 'en' | 'ar') => {
    if (newLang === language) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setLanguage(newLang);
  };

  const handleOpenArchitecture = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    handleDismiss();
    setTimeout(() => {
      router.push('/modal');
    }, 120);
  };

  const handleOpenLinkedIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL('https://www.linkedin.com/in/gamal-haroun/');
    } catch {}
  };

  if (!modalRendered && !visible) {
    return null;
  }

  // Slide animation output
  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isRTL ? -DRAWER_WIDTH : DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const safeTop = Math.max(insets.top, 24) + 10;
  const safeBottom = Math.max(insets.bottom, 20);

  return (
    <Modal
      visible={modalRendered}
      transparent={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        {/* BACKDROP OVERLAY */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={handleDismiss} />
        </Animated.View>

        {/* CLEAN SIDE DRAWER */}
        <Animated.View
          style={[
            styles.drawer,
            isRTL ? styles.drawerLeft : styles.drawerRight,
            {
              paddingTop: safeTop,
              paddingBottom: safeBottom,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* HEADER ROW */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerLeft, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.brandIconCircle}>
                <ShieldCheck size={19} color={styles.brandIcon.color} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                  {t('menuDrawerTitle')}
                </Text>
                <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
                  {t('menuDrawerSubtitle')}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <X size={17} color={styles.closeIcon.color} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. THEME SEGMENTED SELECTOR */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('menuSectionAppearance')}
              </Text>

              <View style={[styles.segmentTrack, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Pressable
                  onPress={() => handleSelectTheme('dark')}
                  style={[
                    styles.segmentButton,
                    theme === 'dark' && styles.segmentButtonActive,
                  ]}
                >
                  <Moon
                    size={15}
                    color={theme === 'dark' ? '#00D2FF' : styles.mutedText.color}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      theme === 'dark' && styles.segmentTextActive,
                    ]}
                  >
                    {isRTL ? 'داكن' : 'Dark'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectTheme('light')}
                  style={[
                    styles.segmentButton,
                    theme === 'light' && styles.segmentButtonActive,
                  ]}
                >
                  <Sun
                    size={15}
                    color={theme === 'light' ? '#0070D1' : styles.mutedText.color}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      theme === 'light' && styles.segmentTextActive,
                    ]}
                  >
                    {isRTL ? 'فاتح' : 'Light'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 2. LANGUAGE SEGMENTED SELECTOR */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('menuSectionLanguage')}
              </Text>

              <View style={[styles.segmentTrack, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Pressable
                  onPress={() => handleSelectLanguage('en')}
                  style={[
                    styles.segmentButton,
                    language === 'en' && styles.segmentButtonActive,
                  ]}
                >
                  <Globe
                    size={15}
                    color={language === 'en' ? '#00D2FF' : styles.mutedText.color}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      language === 'en' && styles.segmentTextActive,
                    ]}
                  >
                    English
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectLanguage('ar')}
                  style={[
                    styles.segmentButton,
                    language === 'ar' && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      styles.arabicFontAdjust,
                      language === 'ar' && styles.segmentTextActive,
                    ]}
                  >
                    العربية
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 3. SYSTEM & SECURITY INSET GROUP */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('menuSectionSecurity')}
              </Text>

              <View style={styles.insetGroup}>
                {/* ARCHITECTURE LINK */}
                <Pressable
                  onPress={handleOpenArchitecture}
                  style={({ pressed }) => [
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: 'row-reverse' },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View style={[styles.groupItemLeft, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.itemIconCircle}>
                      <ShieldCheck size={16} color={styles.brandIcon.color} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.groupItemText, isRTL && styles.rtlText]}>
                      {t('menuArchitectureBtn')}
                    </Text>
                  </View>

                  {isRTL ? (
                    <ChevronLeft size={15} color={styles.mutedText.color} strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={15} color={styles.mutedText.color} strokeWidth={2.4} />
                  )}
                </Pressable>

                {/* CLOUD SYNC & AUTH ROW */}
                <View style={[styles.groupItem, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.groupItemLeft, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.itemIconCircle}>
                      <Cloud size={16} color="#00D2FF" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.groupItemText, isRTL && styles.rtlText]}>
                      {isRTL ? 'الخزينة المحلية' : 'Local Vault'}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>
                      {isRTL ? 'زائر' : 'Guest'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* FOOTER: APP NAME, VERSION & GAMAL HAROUN ATTRIBUTION */}
          <View style={styles.footer}>
            <Text style={styles.footerAppName}>
              Console Vault <Text style={styles.footerVersion}>• v1.0.0</Text>
            </Text>

            <Pressable
              onPress={handleOpenLinkedIn}
              style={({ pressed }) => [
                styles.authorPill,
                isNativeRTL && { flexDirection: 'row-reverse' },
                pressed && styles.authorPillPressed,
              ]}
              accessibilityRole="link"
              accessibilityLabel="Gamal Haroun LinkedIn profile"
            >
              <Text style={styles.authorText}>
                {isRTL ? 'صُنع بكل ❤️ بواسطة ' : 'Made with ❤️ by '}
                <Text style={styles.authorHighlight}>Gamal Haroun</Text>
              </Text>
              <View style={styles.linkedInCircle}>
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="#0A66C2">
                  <Path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28" />
                </Svg>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    backdropPressable: {
      flex: 1,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      boxShadow: theme === 'dark' ? '-8px 0px 32px rgba(0, 0, 0, 0.6)' : '-8px 0px 32px rgba(0, 0, 0, 0.12)',
      elevation: 20,
    },
    drawerRight: {
      right: 0,
      borderLeftWidth: 1,
      borderColor: colors.border,
    },
    drawerLeft: {
      left: 0,
      borderRightWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '8px 0px 32px rgba(0, 0, 0, 0.6)' : '8px 0px 32px rgba(0, 0, 0, 0.12)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    brandIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 112, 209, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0, 210, 255, 0.25)',
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '500',
      marginTop: 1,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeBtnPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.93 }],
    },
    scrollContent: {
      gap: 20,
      paddingBottom: 16,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      paddingHorizontal: 2,
    },

    /* MODERN SEGMENTED TRACK */
    segmentTrack: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 9,
      borderRadius: 11,
    },
    segmentButtonActive: {
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.16)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#00D2FF' : 'rgba(0, 112, 209, 0.25)',
      boxShadow: theme === 'dark' ? '0px 2px 6px rgba(0, 0, 0, 0.3)' : '0px 2px 6px rgba(0, 0, 0, 0.08)',
      elevation: 2,
    },
    segmentText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontWeight: '800',
    },
    arabicFontAdjust: {
      fontSize: 14,
    },

    /* INSET GROUP LIST */
    insetGroup: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    groupItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    groupItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemPressed: {
      backgroundColor: colors.surfaceSubtle,
    },
    groupItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    itemIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupItemText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
      borderWidth: 0.5,
      borderColor: '#10B981',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    statusPillText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '800',
    },

    /* FOOTER */
    footer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 12,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    footerAppName: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    footerVersion: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '500',
    },
    authorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    authorPillPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    authorText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '500',
    },
    authorHighlight: {
      color: colors.accent,
      fontWeight: '700',
    },
    linkedInCircle: {
      width: 16,
      height: 16,
      borderRadius: 3,
      backgroundColor: theme === 'dark' ? 'rgba(10, 102, 194, 0.18)' : '#E8F3FC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* UTILITIES */
    brandIcon: {
      color: colors.accent,
    },
    closeIcon: {
      color: colors.textSecondary,
    },
    mutedText: {
      color: colors.textMuted,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
