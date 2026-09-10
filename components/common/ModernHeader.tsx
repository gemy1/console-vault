import { useRef, useEffect, type ReactNode } from "react";
import {
  View,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  StyleSheet,
} from "react-native";
import { VaultText as Text } from "./VaultText";
import { useRouter } from "expo-router";
import { useSafeAreaInsets, initialWindowMetrics } from "react-native-safe-area-context";
import * as Haptics from '@/utils/haptics';
import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react-native";
import { ThemeColors, ThemeMode } from "../../context/ThemeContext";
import { MenuToggleButton } from "./MenuToggleButton";
import { useLanguage } from "../../context/LanguageContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface ModernHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightAction?: ReactNode;
  showMenuButton?: boolean;
  transparent?: boolean;
  /** Pass an Animated.Value driven by ScrollView onScroll to enable scroll-fade glass effect */
  scrollY?: Animated.Value;
}

export function ModernHeader({
  title,
  subtitle,
  showBackButton = false,
  rightAction,
  showMenuButton = true,
  transparent = false,
  scrollY,
}: ModernHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const styles = useThemedStyles(createStyles);

  // Safe area clearance — use initialWindowMetrics as the stable immediate value so the
  // header height never jumps when useSafeAreaInsets() resolves after the first render.
  const androidFallback =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : 0;
  const stableTop = initialWindowMetrics?.insets?.top ?? 0;
  const resolvedTop = insets.top > 0 ? insets.top : stableTop > 0 ? stableTop : androidFallback;
  const safeTop = resolvedTop;
  const headerPaddingTop = safeTop + 12;

  // Mount spring animation
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      tension: 55,
      friction: 11,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const animatedStyle = {
    opacity: mountAnim,
    transform: [
      {
        translateY: mountAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-12, 0],
        }),
      },
    ],
  };

  // Scroll-driven background opacity
  const bgOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 70],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : new Animated.Value(transparent ? 0 : 1);


  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      {/* Frosted glass overlay */}
      <Animated.View
        style={[styles.glassOverlay, { opacity: bgOpacity }]}
      />

      {/* Thin gradient accent bar just below the notch */}
      <View style={[styles.accentBar, { top: safeTop }]}>
        <View style={styles.accentSegPrimary} />
        <View style={styles.accentSegSecondary} />
        <View style={styles.accentSegTertiary} />
      </View>

      {/* Navigation row */}
      <View style={[styles.row, { paddingTop: headerPaddingTop, flexDirection: Platform.OS !== 'web' && isRTL ? 'row-reverse' : 'row' }]}>
        {/* LEFT: Back or Brand */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            {isRTL ? (
              <ChevronRight size={24} color={styles.iconColor.color} strokeWidth={2.4} />
            ) : (
              <ChevronLeft size={24} color={styles.iconColor.color} strokeWidth={2.4} />
            )}
          </Pressable>
        ) : (
          <View style={styles.pill}>
            <Gamepad2 size={22} color={styles.brandIcon.color} strokeWidth={2.2} />
          </View>
        )}

        {/* CENTER: Title stack */}
        {title ? (
          <View style={styles.titleBlock}>
            {subtitle ? (
              <Text style={styles.subtitleLabel} numberOfLines={1}>
                {subtitle.toUpperCase()}
              </Text>
            ) : null}

            <Text style={styles.titleLabel} numberOfLines={1}>
              {title}
            </Text>

            {/* Accent dot underline */}
            <View style={styles.dotRow}>
              <View style={styles.dotPrimary} />
              <View style={styles.dotSecondary} />
            </View>
          </View>
        ) : (
          <View style={styles.flexOne} />
        )}

        {/* RIGHT: Actions */}
        <View style={styles.actions}>
          {rightAction}
          {showMenuButton && <MenuToggleButton size={46} />}
        </View>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    wrapper: {
      zIndex: 100,
      backgroundColor: theme === "dark" ? "#080C16" : "#F5F7FB",
    },
    glassOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme === "dark" ? "rgba(8, 12, 22, 0.9)" : "rgba(245, 247, 251, 0.9)",
      borderBottomWidth: 1,
      borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      pointerEvents: "none",
    },
    accentBar: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      flexDirection: "row",
      pointerEvents: "none",
    },
    accentSegPrimary: {
      flex: 1,
      height: 2,
      backgroundColor: "#0070D1",
      opacity: 0.9,
    },
    accentSegSecondary: {
      flex: 1,
      height: 2,
      backgroundColor: "#00D2FF",
      opacity: 0.55,
    },
    accentSegTertiary: {
      flex: 1,
      height: 2,
      backgroundColor: "#00D2FF",
      opacity: 0.18,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    pill: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.9)",
      borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.07)",
      boxShadow: theme === "dark" ? "0px 4px 12px rgba(0, 0, 0, 0.45)" : "0px 4px 12px rgba(0, 0, 0, 0.12)",
      elevation: 5,
    },
    pillPressed: {
      opacity: 0.6,
      transform: [{ scale: 0.9 }],
    },
    iconColor: {
      color: colors.text,
    },
    brandIcon: {
      color: colors.accent,
    },
    titleBlock: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 10,
    },
    subtitleLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 2,
      marginBottom: 2,
    },
    titleLabel: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.4,
      textAlign: "center",
    },
    dotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 5,
    },
    dotPrimary: {
      width: 16,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#0070D1",
    },
    dotSecondary: {
      width: 5,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#00D2FF",
      opacity: 0.45,
    },
    flexOne: {
      flex: 1,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  });
