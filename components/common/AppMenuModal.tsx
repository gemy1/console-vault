import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { VaultText as Text } from "./VaultText";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/utils/haptics";
import {
  X,
  Moon,
  Sun,
  Globe,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Cloud,
  Fingerprint,
  RefreshCw,
  LogOut,
  LogIn,
  Lock,
  RotateCcw,
  Trash2,
  HardDrive,
} from "lucide-react-native";
import {
  useVaultTheme,
  ThemeColors,
  ThemeMode,
} from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useAuth } from "../../context/AuthContext";
import { useSecurity } from "../../context/SecurityContext";
import { useVaultSync } from "../../context/VaultSyncContext";
import { useCustomAlert } from "../../context/AlertContext";
import { AuthModal } from "../auth/AuthModal";
import { isSupabaseConfigured } from "../../services/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.8));

interface AppMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppMenuModal({ visible, onClose }: AppMenuModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, colors } = useVaultTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== "web" && isRTL;
  const styles = useThemedStyles(createStyles);
  const { showAlert } = useCustomAlert();

  const animValue = useRef(new Animated.Value(0)).current;
  const [modalRendered, setModalRendered] = useState(visible);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  let authState = { user: null as any, signOut: async () => {} };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    if (auth) authState = auth;
  } catch {}

  let securityState = {
    isBiometricsAvailable: false,
    isBiometricsEnabled: false,
    toggleBiometrics: async (_val: boolean) => true,
    lockVault: () => {},
  };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sec = useSecurity();
    if (sec) securityState = sec;
  } catch {}

  let syncState: {
    syncStatus: import("../../types/vault").SyncStatus;
    pendingCount: number;
    lastSyncedAt: string | null;
    syncNow: () => Promise<boolean>;
    clearLocalVault: () => void;
    clearCloudAndLocalVault: () => Promise<boolean>;
  } = {
    syncStatus: isSupabaseConfigured ? "synced" : "local_only",
    pendingCount: 0,
    lastSyncedAt: null,
    syncNow: async () => true,
    clearLocalVault: () => {},
    clearCloudAndLocalVault: async () => true,
  };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sync = useVaultSync();
    if (sync) syncState = sync;
  } catch {}

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
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
      useNativeDriver: Platform.OS !== "web",
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

  const handleSelectLanguage = (newLang: "en" | "ar") => {
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
      router.push("/modal");
    }, 120);
  };

  const handleSyncPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (!isSupabaseConfigured) {
      showAlert({
        title: isRTL
          ? "الخزينة المحلية (وضع غير متصل)"
          : "Local Vault (Offline Mode)",
        message: isRTL
          ? "تطبيقك يعمل حالياً كخزينة محلية بالكامل، حيث يتم حفظ وتشفير كافة ألعابك ومبيعاتك بأمان على هذا الجهاز."
          : "Your vault is operating in 100% offline local storage mode. All your games and data are safely encrypted and saved on this device.",
        type: "info",
        buttons: [{ text: isRTL ? "حسناً" : "Understood", style: "default" }],
      });
      return;
    }

    if (!authState.user) {
      showAlert({
        title: isRTL
          ? "تسجيل الدخول للمزامنة السحابية"
          : "Sign In Required for Cloud Sync",
        message: isRTL
          ? "المزامنة السحابية متوفرة ولكنك في وضع الضيف. سجّل الدخول الآن لتفعيل المزامنة الفورية عبر الأجهزة."
          : "Cloud sync is available, but you are currently in Guest mode. Sign in to sync your vault across devices.",
        type: "info",
        buttons: [
          {
            text: isRTL ? "تسجيل الدخول" : "Sign In",
            style: "default",
            onPress: () => setAuthModalVisible(true),
          },
          { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        ],
      });
      return;
    }

    await syncState.syncNow();
  };

  const handleToggleBio = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await securityState.toggleBiometrics(!securityState.isBiometricsEnabled);
  };

  const handleLockPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    handleDismiss();
    setTimeout(() => {
      securityState.lockVault();
    }, 220);
  };

  const handleResetVault = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (authState.user) {
      // Authenticated User: Offer choice between Local Only vs Local + Cloud
      showAlert({
        title: t("alertResetChoiceTitle"),
        message: t("alertResetChoiceLoggedInMsg"),
        type: "danger",
        buttons: [
          {
            text: t("alertResetLocalAndCloud"),
            subtext: t("alertResetLocalAndCloudSub"),
            style: "destructive",
            icon: Trash2,
            onPress: async () => {
              try {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch {}
              await syncState.clearCloudAndLocalVault();
              handleDismiss();
            },
          },
          {
            text: t("alertResetLocalOnly"),
            subtext: t("alertResetLocalOnlySub"),
            style: "secondary",
            icon: HardDrive,
            onPress: () => {
              try {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch {}
              syncState.clearLocalVault();
              handleDismiss();
            },
          },
          {
            text: isRTL ? "إلغاء" : "Cancel",
            style: "cancel",
          },
        ],
      });
    } else {
      // Guest / Offline Mode: Clear local only with explicit disclaimer
      showAlert({
        title: t("alertResetTitle"),
        message: t("alertResetGuestMsg"),
        type: "warning",
        buttons: [
          {
            text: t("alertResetConfirmGuest"),
            style: "destructive",
            icon: Trash2,
            onPress: () => {
              try {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch {}
              syncState.clearLocalVault();
              handleDismiss();
            },
          },
          {
            text: isRTL ? "إلغاء" : "Cancel",
            style: "cancel",
          },
        ],
      });
    }
  };

  const handleOpenLinkedIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL("https://www.linkedin.com/in/gamal-haroun/");
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
          <View
            style={[
              styles.headerRow,
              isNativeRTL && { flexDirection: "row-reverse" },
            ]}
          >
            <View
              style={[
                styles.headerLeft,
                isNativeRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <View style={styles.brandIconCircle}>
                <ShieldCheck
                  size={19}
                  color={styles.brandIcon.color}
                  strokeWidth={2.2}
                />
              </View>
              <View>
                <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                  {t("menuDrawerTitle")}
                </Text>
                <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
                  {t("menuDrawerSubtitle")}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.headerRightGroup,
                isNativeRTL && { flexDirection: "row-reverse" },
              ]}
            >
              {/* CLOUD SYNC LIVE BADGE */}
              <Pressable
                onPress={handleSyncPress}
                style={({ pressed }) => [
                  styles.headerSyncBadge,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                  isNativeRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <View
                  style={[
                    styles.syncLiveDot,
                    syncState.syncStatus === "synced"
                      ? styles.syncDotSuccess
                      : syncState.syncStatus === "syncing"
                        ? styles.syncDotSyncing
                        : syncState.syncStatus === "offline"
                          ? styles.syncDotOffline
                          : syncState.syncStatus === "local_only"
                            ? styles.syncDotLocal
                            : styles.syncDotOffline,
                  ]}
                />
                <Text style={styles.headerSyncBadgeText}>
                  {syncState.syncStatus === "synced"
                    ? isRTL
                      ? "متزامن"
                      : "Synced"
                    : syncState.syncStatus === "syncing"
                      ? isRTL
                        ? "مزامنة..."
                        : "Syncing..."
                      : syncState.syncStatus === "local_only"
                        ? isRTL
                          ? "خزينة محلية"
                          : "Local Vault"
                        : isRTL
                          ? `معلق (${syncState.pendingCount})`
                          : `Offline (${syncState.pendingCount})`}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.closeBtnPressed,
                ]}
              >
                <X size={17} color={styles.closeIcon.color} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. PREFERENCES INSET GROUP (APPEARANCE & LANGUAGE) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t("menuSectionPreferences")}
              </Text>

              <View style={styles.insetGroup}>
                {/* THEME (APPEARANCE) ROW */}
                <Pressable
                  onPress={() =>
                    handleSelectTheme(theme === "dark" ? "light" : "dark")
                  }
                  style={({ pressed }) => [
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      {theme === "dark" ? (
                        <Moon size={16} color="#00D2FF" strokeWidth={2.2} />
                      ) : (
                        <Sun size={16} color="#FF9F0A" strokeWidth={2.2} />
                      )}
                    </View>
                    <View>
                      <Text
                        style={[styles.groupItemText, isRTL && styles.rtlText]}
                      >
                        {t("menuSectionAppearance")}
                      </Text>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {theme === "dark"
                          ? t("menuThemeDark")
                          : t("menuThemeLight")}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.miniSegmentTrack,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleSelectTheme("dark");
                      }}
                      style={[
                        styles.miniSegmentBtn,
                        theme === "dark" && styles.miniSegmentBtnActive,
                      ]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Moon
                        size={13}
                        color={
                          theme === "dark" ? "#00D2FF" : styles.mutedText.color
                        }
                        strokeWidth={2.2}
                      />
                    </Pressable>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleSelectTheme("light");
                      }}
                      style={[
                        styles.miniSegmentBtn,
                        theme === "light" && styles.miniSegmentBtnActive,
                      ]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Sun
                        size={13}
                        color={
                          theme === "light" ? "#0070D1" : styles.mutedText.color
                        }
                        strokeWidth={2.2}
                      />
                    </Pressable>
                  </View>
                </Pressable>

                {/* LANGUAGE ROW */}
                <Pressable
                  onPress={() =>
                    handleSelectLanguage(language === "en" ? "ar" : "en")
                  }
                  style={({ pressed }) => [
                    styles.groupItem,
                    isNativeRTL && { flexDirection: "row-reverse" },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <Globe
                        size={16}
                        color={colors.accent}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View>
                      <Text
                        style={[styles.groupItemText, isRTL && styles.rtlText]}
                      >
                        {t("menuSectionLanguage")}
                      </Text>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {language === "ar"
                          ? t("menuLangArabic")
                          : t("menuLangEnglish")}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.miniSegmentTrack,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleSelectLanguage("en");
                      }}
                      style={[
                        styles.miniSegmentBtn,
                        language === "en" && styles.miniSegmentBtnActive,
                      ]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Text
                        style={[
                          styles.miniSegmentText,
                          language === "en" && styles.miniSegmentTextActive,
                        ]}
                      >
                        EN
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleSelectLanguage("ar");
                      }}
                      style={[
                        styles.miniSegmentBtn,
                        language === "ar" && styles.miniSegmentBtnActive,
                      ]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Text
                        style={[
                          styles.miniSegmentText,
                          styles.arabicFontAdjust,
                          language === "ar" && styles.miniSegmentTextActive,
                        ]}
                      >
                        عربي
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* 3. SYSTEM & SECURITY INSET GROUP */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t("menuSectionSecurity")}
              </Text>

              <View style={styles.insetGroup}>
                {/* ARCHITECTURE LINK */}
                <Pressable
                  onPress={handleOpenArchitecture}
                  style={({ pressed }) => [
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <ShieldCheck
                        size={16}
                        color={styles.brandIcon.color}
                        strokeWidth={2.2}
                      />
                    </View>
                    <Text
                      style={[styles.groupItemText, isRTL && styles.rtlText]}
                    >
                      {t("menuArchitectureBtn")}
                    </Text>
                  </View>

                  {isRTL ? (
                    <ChevronLeft
                      size={15}
                      color={styles.mutedText.color}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <ChevronRight
                      size={15}
                      color={styles.mutedText.color}
                      strokeWidth={2.4}
                    />
                  )}
                </Pressable>

                {/* CLOUD SYNC & AUTH ROW */}
                <View
                  style={[
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <Cloud size={16} color="#00D2FF" strokeWidth={2.2} />
                    </View>
                    <View>
                      <Text
                        style={[styles.groupItemText, isRTL && styles.rtlText]}
                      >
                        {authState.user
                          ? authState.user.email?.split("@")[0] ||
                            (isRTL ? "المستخدم" : "Account")
                          : isRTL
                            ? "الخزينة المحلية"
                            : "Local Vault"}
                      </Text>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {authState.user
                          ? authState.user.email
                          : isRTL
                            ? "مزامنة السحابة غير مفعلة"
                            : "Guest Mode (No Cloud)"}
                      </Text>
                    </View>
                  </View>

                  {authState.user ? (
                    <Pressable
                      onPress={async () => {
                        try {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        } catch {}
                        await authState.signOut();
                      }}
                      style={styles.actionPillDanger}
                    >
                      <LogOut
                        size={12}
                        color={colors.danger}
                        strokeWidth={2.2}
                      />
                      <Text style={styles.actionPillDangerText}>
                        {isRTL ? "خروج" : "Sign Out"}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        try {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        } catch {}
                        setAuthModalVisible(true);
                      }}
                      style={styles.actionPillPrimary}
                    >
                      <LogIn size={12} color="#00D2FF" strokeWidth={2.2} />
                      <Text style={styles.actionPillPrimaryText}>
                        {isRTL ? "دخول" : "Sign In"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* CLOUD SYNC NOW ROW */}
                <View
                  style={[
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <RefreshCw
                        size={15}
                        color={colors.accent}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View>
                      <View
                        style={[
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          },
                          isNativeRTL && { flexDirection: "row-reverse" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.groupItemText,
                            isRTL && styles.rtlText,
                          ]}
                        >
                          {syncState.syncStatus === "local_only"
                            ? isRTL
                              ? "وضع الخزينة"
                              : "Vault Storage"
                            : isRTL
                              ? "حالة المزامنة"
                              : "Cloud Sync"}
                        </Text>
                        <View
                          style={[
                            styles.syncLiveDot,
                            syncState.syncStatus === "synced"
                              ? styles.syncDotSuccess
                              : syncState.syncStatus === "syncing"
                                ? styles.syncDotSyncing
                                : syncState.syncStatus === "offline"
                                  ? styles.syncDotOffline
                                  : syncState.syncStatus === "local_only"
                                    ? styles.syncDotLocal
                                    : styles.syncDotOffline,
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {syncState.syncStatus === "synced"
                          ? isRTL
                            ? "متزامن بالكامل مع السحابة"
                            : "All changes synced with cloud"
                          : syncState.syncStatus === "syncing"
                            ? isRTL
                              ? "جاري رفع التغييرات للسحابة..."
                              : "Syncing changes to cloud..."
                            : syncState.syncStatus === "local_only"
                              ? !isSupabaseConfigured
                                ? isRTL
                                  ? "غير متصل بالسحابة • الحفظ محلي بالجهاز"
                                  : "Cloud not connected • Saved locally"
                                : isRTL
                                  ? "وضع الضيف • سجّل الدخول لتفعيل المزامنة"
                                  : "Guest mode • Sign in to sync across devices"
                              : isRTL
                                ? `وضع غير متصل (${syncState.pendingCount} معلق)`
                                : `Offline (${syncState.pendingCount} pending)`}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSyncPress}
                    style={({ pressed }) => [
                      styles.actionPillPrimary,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <RefreshCw size={11} color="#00D2FF" strokeWidth={2.2} />
                    <Text style={styles.actionPillPrimaryText}>
                      {syncState.syncStatus === "local_only"
                        ? !isSupabaseConfigured
                          ? isRTL
                            ? "معلومات"
                            : "Info"
                          : isRTL
                            ? "تفعيل"
                            : "Connect"
                        : isRTL
                          ? "مزامنة الآن"
                          : "Sync Now"}
                    </Text>
                  </Pressable>
                </View>

                {/* BIOMETRIC FACE ID / TOUCH ID TOGGLE */}
                <Pressable
                  onPress={handleToggleBio}
                  style={[
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <Fingerprint
                        size={16}
                        color={colors.accent}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View>
                      <Text
                        style={[styles.groupItemText, isRTL && styles.rtlText]}
                      >
                        {isRTL ? "قفل الخزينة بالبصمة" : "Biometric Lock"}
                      </Text>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {isRTL
                          ? "Face ID / بصمة الإصبع"
                          : "Require Face ID / Touch ID"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.toggleTrack,
                      securityState.isBiometricsEnabled &&
                        styles.toggleTrackActive,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        securityState.isBiometricsEnabled &&
                          styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                {/* LOCK VAULT NOW */}
                <Pressable
                  onPress={handleLockPress}
                  style={({ pressed }) => [
                    styles.groupItem,
                    styles.groupItemBorder,
                    isNativeRTL && { flexDirection: "row-reverse" },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <Lock size={15} color={colors.danger} strokeWidth={2.2} />
                    </View>
                    <Text
                      style={[
                        styles.groupItemText,
                        { color: colors.danger },
                        isRTL && styles.rtlText,
                      ]}
                    >
                      {isRTL ? "قفل الخزينة الآن" : "Lock Vault Now"}
                    </Text>
                  </View>

                  <Lock size={14} color={colors.danger} strokeWidth={2} />
                </Pressable>

                {/* RESET VAULT / START FRESH */}
                <Pressable
                  onPress={handleResetVault}
                  style={({ pressed }) => [
                    styles.groupItem,
                    isNativeRTL && { flexDirection: "row-reverse" },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.groupItemLeft,
                      isNativeRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <View style={styles.itemIconCircle}>
                      <RotateCcw
                        size={15}
                        color={colors.textMuted}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View>
                      <Text
                        style={[styles.groupItemText, isRTL && styles.rtlText]}
                      >
                        {t("menuResetVault")}
                      </Text>
                      <Text
                        style={[styles.groupSubText, isRTL && styles.rtlText]}
                      >
                        {t("menuResetVaultSub")}
                      </Text>
                    </View>
                  </View>

                  <RotateCcw
                    size={14}
                    color={colors.textMuted}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* AUTH MODAL DIALOG */}
          <AuthModal
            visible={authModalVisible}
            onClose={() => setAuthModalVisible(false)}
          />

          {/* FOOTER: APP NAME, VERSION & GAMAL HAROUN ATTRIBUTION */}
          <View style={styles.footer}>
            <Text style={styles.footerAppName}>
              Console Vault <Text style={styles.footerVersion}>• v1.0.0</Text>
            </Text>

            <Pressable
              onPress={handleOpenLinkedIn}
              style={({ pressed }) => [
                styles.authorPill,
                isNativeRTL && { flexDirection: "row-reverse" },
                pressed && styles.authorPillPressed,
              ]}
              accessibilityRole="link"
              accessibilityLabel="Gamal Haroun LinkedIn profile"
            >
              <Text style={styles.authorText}>
                {isRTL ? "صُنع بكل ❤️ بواسطة " : "Made with ❤️ by "}
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
      position: "relative",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    backdropPressable: {
      flex: 1,
    },
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      boxShadow:
        theme === "dark"
          ? "-8px 0px 32px rgba(0, 0, 0, 0.6)"
          : "-8px 0px 32px rgba(0, 0, 0, 0.12)",
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
      boxShadow:
        theme === "dark"
          ? "8px 0px 32px rgba(0, 0, 0, 0.6)"
          : "8px 0px 32px rgba(0, 0, 0, 0.12)",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    brandIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: "rgba(0, 112, 209, 0.14)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(0, 210, 255, 0.25)",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: "500",
      marginTop: 1,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnPressed: {
      opacity: 0.6,
    },
    headerRightGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerSyncBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    },
    headerSyncBadgeText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: "700",
    },
    syncLiveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    syncDotSuccess: {
      backgroundColor: "#30D158",
    },
    syncDotSyncing: {
      backgroundColor: "#00D2FF",
    },
    syncDotOffline: {
      backgroundColor: "#FF9F0A",
    },
    syncDotLocal: {
      backgroundColor: "#64748B",
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
      fontWeight: "800",
      letterSpacing: 1.1,
      textTransform: "uppercase",
      paddingHorizontal: 2,
    },

    /* MINI COMPACT SEGMENTED SWITCH */
    miniSegmentTrack: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 10,
      padding: 2.5,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    miniSegmentBtn: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 32,
    },
    miniSegmentBtnActive: {
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.18)" : "#FFFFFF",
      borderWidth: 1,
      borderColor: theme === "dark" ? "#00D2FF" : "rgba(0, 112, 209, 0.25)",
      boxShadow:
        theme === "dark"
          ? "0px 1px 4px rgba(0, 210, 255, 0.2)"
          : "0px 1px 3px rgba(0, 0, 0, 0.08)",
      elevation: 2,
    },
    miniSegmentText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    miniSegmentTextActive: {
      color: theme === "dark" ? "#00D2FF" : "#0070D1",
      fontWeight: "900",
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
      overflow: "hidden",
    },
    groupItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    itemIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.surfaceSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    groupItemText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    groupSubText: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    actionPillPrimary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9,
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.12)" : "#E8F3FC",
      borderWidth: 1,
      borderColor:
        theme === "dark" ? "rgba(0, 210, 255, 0.3)" : "rgba(0, 112, 209, 0.25)",
    },
    actionPillPrimaryText: {
      color: theme === "dark" ? "#00D2FF" : "#0070D1",
      fontSize: 11,
      fontWeight: "800",
    },
    actionPillDanger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9,
      backgroundColor: "rgba(255, 59, 48, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 59, 48, 0.25)",
    },
    actionPillDangerText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "800",
    },
    toggleTrack: {
      width: 40,
      height: 22,
      borderRadius: 11,
      backgroundColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
      padding: 2,
      justifyContent: "center",
    },
    toggleTrackActive: {
      backgroundColor: colors.accent,
    },
    toggleThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
    },
    toggleThumbActive: {
      alignSelf: "flex-end",
      backgroundColor: "#000000",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor:
        theme === "dark" ? "rgba(16, 185, 129, 0.12)" : "#ECFDF5",
      borderWidth: 0.5,
      borderColor: "#10B981",
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#10B981",
    },
    statusPillText: {
      color: "#10B981",
      fontSize: 10,
      fontWeight: "800",
    },

    /* FOOTER */
    footer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    footerAppName: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    footerVersion: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "500",
    },
    authorPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
      borderWidth: 1,
      borderColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    },
    authorPillPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    authorText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: "500",
    },
    authorHighlight: {
      color: colors.accent,
      fontWeight: "700",
    },
    linkedInCircle: {
      width: 16,
      height: 16,
      borderRadius: 3,
      backgroundColor:
        theme === "dark" ? "rgba(10, 102, 194, 0.18)" : "#E8F3FC",
      alignItems: "center",
      justifyContent: "center",
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
      textAlign: "right",
    },
  });
