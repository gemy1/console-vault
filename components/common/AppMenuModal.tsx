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
  Gamepad2,
  Store,
  Coins,
  CheckCircle2,
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
import { usePersona, SUPPORTED_CURRENCIES } from "../../context/PersonaContext";
import { SupportedCurrency } from "../../types/vault";
import { useAuthModal } from "../../context/AuthModalContext";
import { isSupabaseConfigured } from "../../services/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(310, Math.round(SCREEN_WIDTH * 0.8));
const CURRENCIES: SupportedCurrency[] = ["USD", "EGP", "SAR", "AED"];

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
  const { openAuthModal } = useAuthModal();
  const { persona, setPersona, currency, setCurrency, currencyConfig } = usePersona();

  const animValue = useRef(new Animated.Value(0)).current;
  const [modalRendered, setModalRendered] = useState(visible);

  const handleCycleTheme = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleCycleLanguage = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLanguage(language === "en" ? "ar" : "en");
  };

  const handleCycleCurrency = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const currentIdx = CURRENCIES.indexOf(currency as SupportedCurrency);
    const nextIdx = (currentIdx + 1) % CURRENCIES.length;
    setCurrency(CURRENCIES[nextIdx]);
  };

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

  const handleDismiss = (onComplete?: () => void) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      setModalRendered(false);
      onClose();
      if (typeof onComplete === "function") {
        setTimeout(onComplete, Platform.OS === "ios" ? 260 : 60);
      }
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
    handleDismiss(() => {
      router.push("/modal");
    });
  };

  const handleSyncPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (!isSupabaseConfigured) {
      handleDismiss(() => {
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
      });
      return;
    }

    if (!authState.user) {
      handleDismiss(() => {
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
              onPress: () => {
                setTimeout(() => {
                  openAuthModal();
                }, Platform.OS === 'ios' ? 250 : 60);
              },
            },
            { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
          ],
        });
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
    handleDismiss(() => {
      securityState.lockVault();
    });
  };

  const handleResetVault = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    handleDismiss(() => {
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
              },
            },
            {
              text: isRTL ? "إلغاء" : "Cancel",
              style: "cancel",
            },
          ],
        });
      }
    });
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

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isRTL ? -DRAWER_WIDTH : DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const safeTop = Math.max(insets.top, 24);
  const safeBottom = Math.max(insets.bottom, 20);

  const syncColor =
    syncState.syncStatus === "synced" ? "#30D158"
    : syncState.syncStatus === "syncing" ? "#00D2FF"
    : syncState.syncStatus === "local_only" ? "#64748B"
    : "#FF9F0A";

  const syncLabel =
    syncState.syncStatus === "synced" ? (isRTL ? "متزامن" : "Synced")
    : syncState.syncStatus === "syncing" ? (isRTL ? "مزامنة..." : "Syncing...")
    : syncState.syncStatus === "local_only" ? (isRTL ? "محلي" : "Local Vault")
    : (isRTL ? `معلق (${syncState.pendingCount})` : `Offline`);

  return (
    <Modal
      visible={modalRendered}
      transparent={true}
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <View style={styles.container}>
        {/* BACKDROP */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={() => handleDismiss()} />
        </Animated.View>

        {/* DRAWER */}
        <Animated.View
          style={[
            styles.drawer,
            isRTL ? styles.drawerLeft : styles.drawerRight,
            { paddingTop: safeTop, paddingBottom: safeBottom, transform: [{ translateX }] },
          ]}
        >
          {/* ── HEADER ── */}
          <View style={[styles.header, isNativeRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.headerBrand, isNativeRTL && { flexDirection: "row-reverse" }]}>
              <View style={styles.brandMark}>
                <ShieldCheck size={18} color="#00D2FF" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                  {t("menuDrawerTitle")}
                </Text>
                <View style={[styles.syncRow, isNativeRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
                  <Text style={styles.syncLabel}>{syncLabel}</Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => handleDismiss()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <X size={16} color={styles.closeBtnIcon.color} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* ── SCROLLABLE BODY ── */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* MODE */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>{t("menuSectionMode")}</Text>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} setPersona("gamer"); }}
                  style={({ pressed }) => [styles.modeCard, persona === "gamer" && styles.modeCardActive, pressed && styles.modeCardPressed]}
                >
                  <View style={[styles.modeIconWrap, persona === "gamer" && styles.modeIconWrapActive]}>
                    <Gamepad2 size={17} color={persona === "gamer" ? "#00D2FF" : styles.mutedIcon.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.modeCardLabel, persona === "gamer" && styles.modeCardLabelActive, isRTL && styles.rtlText]} numberOfLines={1}>
                    {t("personaGamer")}
                  </Text>
                  {persona === "gamer" && <CheckCircle2 size={13} color="#00D2FF" strokeWidth={2.5} />}
                </Pressable>

                <Pressable
                  onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} setPersona("seller"); }}
                  style={({ pressed }) => [styles.modeCard, persona === "seller" && styles.modeCardActive, pressed && styles.modeCardPressed]}
                >
                  <View style={[styles.modeIconWrap, persona === "seller" && styles.modeIconWrapActive]}>
                    <Store size={17} color={persona === "seller" ? "#00D2FF" : styles.mutedIcon.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.modeCardLabel, persona === "seller" && styles.modeCardLabelActive, isRTL && styles.rtlText]} numberOfLines={1}>
                    {t("personaSeller")}
                  </Text>
                  {persona === "seller" && <CheckCircle2 size={13} color="#00D2FF" strokeWidth={2.5} />}
                </Pressable>
              </View>
            </View>

            {/* PREFERENCES */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>{t("menuSectionPreferences")}</Text>
              <View style={styles.listGroup}>
                {/* THEME */}
                <Pressable
                  onPress={handleCycleTheme}
                  style={({ pressed }) => [styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      {theme === "dark" ? <Moon size={18} color="#00D2FF" strokeWidth={2} /> : <Sun size={18} color="#FF9F0A" strokeWidth={2} />}
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{t("menuSectionAppearance")}</Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>{isRTL ? "فاتح · داكن" : "Light · Dark"}</Text>
                    </View>
                  </View>
                  <View style={styles.valueBadge}>
                    <Text style={styles.valueBadgeText}>{theme === "dark" ? "Dark" : "Light"}</Text>
                  </View>
                </Pressable>

                {/* LANGUAGE */}
                <Pressable
                  onPress={handleCycleLanguage}
                  style={({ pressed }) => [styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <Globe size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{t("menuSectionLanguage")}</Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>English · عربي</Text>
                    </View>
                  </View>
                  <View style={styles.valueBadge}>
                    <Text style={styles.valueBadgeText}>{language === "ar" ? "عربي" : "EN"}</Text>
                  </View>
                </Pressable>

                {/* CURRENCY */}
                <Pressable
                  onPress={handleCycleCurrency}
                  style={({ pressed }) => [styles.row, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <Coins size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{t("preferenceCurrency")}</Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>USD · EGP · SAR · AED</Text>
                    </View>
                  </View>
                  <View style={styles.valueBadge}>
                    <Text style={styles.valueBadgeText}>{currency}</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* SECURITY */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>{t("menuSectionSecurity")}</Text>
              <View style={styles.listGroup}>
                {/* ARCHITECTURE */}
                <Pressable
                  onPress={handleOpenArchitecture}
                  style={({ pressed }) => [styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <ShieldCheck size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{t("menuArchitectureBtn")}</Text>
                  </View>
                  {isRTL ? <ChevronLeft size={16} color={styles.chevron.color} strokeWidth={2.2} /> : <ChevronRight size={16} color={styles.chevron.color} strokeWidth={2.2} />}
                </Pressable>

                {/* ACCOUNT */}
                <View style={[styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <Cloud size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>
                        {authState.user ? authState.user.email?.split("@")[0] || (isRTL ? "المستخدم" : "Account") : isRTL ? "الخزينة المحلية" : "Local Vault"}
                      </Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>
                        {authState.user ? authState.user.email : isRTL ? "وضع الضيف" : "Guest Mode"}
                      </Text>
                    </View>
                  </View>
                  {authState.user ? (
                    <Pressable onPress={async () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} await authState.signOut(); }} style={styles.dangerPill}>
                      <LogOut size={12} color="#FF3B30" strokeWidth={2.2} />
                      <Text style={styles.dangerPillText}>{isRTL ? "خروج" : "Sign Out"}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} handleDismiss(() => openAuthModal()); }} style={styles.primaryPill}>
                      <LogIn size={12} color="#00D2FF" strokeWidth={2.2} />
                      <Text style={styles.primaryPillText}>{isRTL ? "دخول" : "Sign In"}</Text>
                    </Pressable>
                  )}
                </View>

                {/* CLOUD SYNC */}
                <View style={[styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <RefreshCw size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <View>
                      <View style={[{ flexDirection: "row", alignItems: "center", gap: 6 }, isNativeRTL && { flexDirection: "row-reverse" }]}>
                        <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>
                          {syncState.syncStatus === "local_only" ? (isRTL ? "وضع الخزينة" : "Vault Storage") : (isRTL ? "مزامنة سحابية" : "Cloud Sync")}
                        </Text>
                        <View style={[styles.syncStatusDot, { backgroundColor: syncColor }]} />
                      </View>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>
                        {syncState.syncStatus === "synced" ? (isRTL ? "متزامن بالكامل" : "Fully synced")
                          : syncState.syncStatus === "syncing" ? (isRTL ? "جاري المزامنة..." : "Syncing...")
                          : syncState.syncStatus === "local_only" ? (!isSupabaseConfigured ? (isRTL ? "حفظ محلي فقط" : "Saved locally") : (isRTL ? "وضع الضيف" : "Guest mode"))
                          : (isRTL ? `${syncState.pendingCount} معلق` : `${syncState.pendingCount} pending`)}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={handleSyncPress} style={({ pressed }) => [styles.primaryPill, pressed && { opacity: 0.7 }]}>
                    <RefreshCw size={11} color="#00D2FF" strokeWidth={2.2} />
                    <Text style={styles.primaryPillText}>
                      {syncState.syncStatus === "local_only" ? (!isSupabaseConfigured ? (isRTL ? "معلومات" : "Info") : (isRTL ? "تفعيل" : "Connect")) : (isRTL ? "مزامنة" : "Sync")}
                    </Text>
                  </Pressable>
                </View>

                {/* BIOMETRICS */}
                <Pressable
                  onPress={handleToggleBio}
                  style={({ pressed }) => [styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <Fingerprint size={18} color="#00D2FF" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{isRTL ? "قفل بالبصمة" : "Biometric Lock"}</Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>{isRTL ? "Face ID / بصمة الإصبع" : "Face ID / Touch ID"}</Text>
                    </View>
                  </View>
                  <View style={[styles.toggle, securityState.isBiometricsEnabled && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, securityState.isBiometricsEnabled && styles.toggleThumbActive]} />
                  </View>
                </Pressable>

                {/* LOCK NOW */}
                <Pressable
                  onPress={handleLockPress}
                  style={({ pressed }) => [styles.row, styles.rowBorder, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.rowIcon, styles.rowIconDanger]}>
                      <Lock size={18} color="#FF3B30" strokeWidth={2} />
                    </View>
                    <Text style={[styles.rowTitle, { color: "#FF3B30" }, isRTL && styles.rtlText]}>{isRTL ? "قفل الخزينة الآن" : "Lock Vault"}</Text>
                  </View>
                  {isRTL ? <ChevronLeft size={16} color="#FF3B30" strokeWidth={2.2} /> : <ChevronRight size={16} color="#FF3B30" strokeWidth={2.2} />}
                </Pressable>

                {/* RESET */}
                <Pressable
                  onPress={handleResetVault}
                  style={({ pressed }) => [styles.row, isNativeRTL && { flexDirection: "row-reverse" }, pressed && styles.rowPressed]}
                >
                  <View style={[styles.rowLeft, isNativeRTL && { flexDirection: "row-reverse" }]}>
                    <View style={styles.rowIcon}>
                      <RotateCcw size={18} color={styles.mutedIcon.color} strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.rowTitle, isRTL && styles.rtlText]}>{t("menuResetVault")}</Text>
                      <Text style={[styles.rowSub, isRTL && styles.rtlText]}>{t("menuResetVaultSub")}</Text>
                    </View>
                  </View>
                  {isRTL ? <ChevronLeft size={16} color={styles.chevron.color} strokeWidth={2.2} /> : <ChevronRight size={16} color={styles.chevron.color} strokeWidth={2.2} />}
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* ── FOOTER ── */}
          <View style={styles.footer}>
            <Text style={styles.footerApp}>
              Console Vault{"  "}<Text style={styles.footerVersion}>v1.0.0</Text>
            </Text>
            <Pressable
              onPress={handleOpenLinkedIn}
              style={({ pressed }) => [styles.authorRow, isNativeRTL && { flexDirection: "row-reverse" }, pressed && { opacity: 0.65 }]}
              accessibilityRole="link"
              accessibilityLabel="Gamal Haroun LinkedIn profile"
            >
              <Text style={styles.authorText}>
                {isRTL ? "صُنع بكل ❤️ بواسطة " : "Made with ❤️ by "}
                <Text style={styles.authorName}>Gamal Haroun</Text>
              </Text>
              <View style={styles.liIcon}>
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
    // ── LAYOUT ──
    container: {
      flex: 1,
      position: "relative",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    backdropPressable: {
      flex: 1,
    },
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: theme === "dark" ? "#0D1117" : "#F8FAFC",
      paddingHorizontal: 20,
    },
    drawerRight: {
      right: 0,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
      boxShadow: theme === "dark"
        ? "-12px 0px 40px rgba(0, 0, 0, 0.7)"
        : "-12px 0px 40px rgba(0, 0, 0, 0.1)",
      elevation: 24,
    },
    drawerLeft: {
      left: 0,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
      boxShadow: theme === "dark"
        ? "12px 0px 40px rgba(0, 0, 0, 0.7)"
        : "12px 0px 40px rgba(0, 0, 0, 0.1)",
      elevation: 24,
    },

    // ── HEADER ──
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 18,
      marginBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    },
    headerBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      flex: 1,
    },
    brandMark: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.1)" : "rgba(0, 112, 209, 0.08)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.22)" : "rgba(0, 112, 209, 0.18)",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    syncRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 2,
    },
    syncDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    syncLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "600",
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnPressed: {
      opacity: 0.5,
      transform: [{ scale: 0.92 }],
    },
    closeBtnIcon: {
      color: colors.textSecondary,
    },

    // ── SCROLL CONTENT ──
    scrollContent: {
      gap: 24,
      paddingBottom: 8,
    },

    // ── SECTIONS ──
    section: {
      gap: 9,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      paddingHorizontal: 2,
    },

    // ── PERSONA MODE CARDS (side by side) ──
    modeRow: {
      flexDirection: "row",
      gap: 8,
    },
    modeCard: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme === "dark" ? "#161B22" : "#FFFFFF",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      gap: 6,
    },
    modeCardActive: {
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.07)" : "rgba(0, 112, 209, 0.06)",
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.45)" : "rgba(0, 112, 209, 0.35)",
    },
    modeCardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.97 }],
    },
    modeIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    },
    modeIconWrapActive: {
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.14)" : "rgba(0, 112, 209, 0.1)",
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.35)" : "rgba(0, 112, 209, 0.3)",
    },
    modeCardLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    modeCardLabelActive: {
      color: theme === "dark" ? "#FFFFFF" : "#0F172A",
      fontWeight: "800",
    },

    // ── LIST GROUP ──
    listGroup: {
      backgroundColor: theme === "dark" ? "#161B22" : "#FFFFFF",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      overflow: "hidden",
    },

    // ── ROW ──
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      paddingHorizontal: 14,
      minHeight: 56,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    },
    rowPressed: {
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    },
    rowIconDanger: {
      backgroundColor: "rgba(255, 59, 48, 0.08)",
      borderColor: "rgba(255, 59, 48, 0.18)",
    },
    rowTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: -0.1,
    },
    rowSub: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "500",
      marginTop: 2,
    },

    // ── VALUE BADGE (tap-to-cycle indicator) ──
    valueBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.09)" : "rgba(0, 112, 209, 0.07)",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.22)" : "rgba(0, 112, 209, 0.2)",
    },
    valueBadgeText: {
      color: theme === "dark" ? "#00D2FF" : "#0070D1",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    // ── INLINE SYNC STATUS DOT ──
    syncStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    // ── ACTION PILLS ──
    primaryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.1)" : "#E8F3FC",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.3)" : "rgba(0, 112, 209, 0.22)",
    },
    primaryPillText: {
      color: theme === "dark" ? "#00D2FF" : "#0070D1",
      fontSize: 11,
      fontWeight: "800",
    },
    dangerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor: "rgba(255, 59, 48, 0.09)",
      borderWidth: 1,
      borderColor: "rgba(255, 59, 48, 0.22)",
    },
    dangerPillText: {
      color: "#FF3B30",
      fontSize: 11,
      fontWeight: "800",
    },

    // ── TOGGLE SWITCH ──
    toggle: {
      width: 42,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)",
      padding: 3,
      justifyContent: "center",
    },
    toggleActive: {
      backgroundColor: "#00D2FF",
    },
    toggleThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
      alignSelf: "flex-start",
    },
    toggleThumbActive: {
      alignSelf: "flex-end",
    },

    // ── FOOTER ──
    footer: {
      alignItems: "center",
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      gap: 5,
    },
    footerApp: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    footerVersion: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "400",
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    authorText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "400",
    },
    authorName: {
      color: colors.accent,
      fontWeight: "700",
    },
    liIcon: {
      width: 16,
      height: 16,
      borderRadius: 3,
      backgroundColor: theme === "dark" ? "rgba(10,102,194,0.18)" : "#E8F3FC",
      alignItems: "center",
      justifyContent: "center",
    },

    // ── UTILITIES ──
    mutedIcon: {
      color: colors.textMuted,
    },
    chevron: {
      color: colors.textMuted,
    },
    rtlText: {
      textAlign: "right",
    },
  });
