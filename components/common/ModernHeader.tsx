import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Gamepad2, Plus } from "lucide-react-native";
import { useVaultTheme, ThemeColors, ThemeMode } from "../../context/ThemeContext";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface ModernHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  /** Pass an Animated.Value driven by ScrollView onScroll to enable scroll-fade glass effect */
  scrollY?: Animated.Value;
}

export function ModernHeader({
  title,
  subtitle,
  showBackButton = false,
  showAddButton = false,
  onAddPress,
  rightAction,
  transparent = false,
  scrollY,
}: ModernHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useVaultTheme();
  const styles = useThemedStyles(createStyles);

  // Safe area clearance
  const androidFallback =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : 0;
  const safeTop = insets.top > 0 ? insets.top : androidFallback;
  const headerPaddingTop = safeTop + 12;

  // Mount spring animation
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      tension: 55,
      friction: 11,
      useNativeDriver: true,
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

  const handleAdd = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onAddPress) {
      onAddPress();
    } else {
      router.push("/game/add");
    }
  };

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
        pointerEvents="none"
        style={[styles.glassOverlay, { opacity: bgOpacity }]}
      />

      {/* Thin gradient accent bar just below the notch */}
      <View pointerEvents="none" style={[styles.accentBar, { top: safeTop }]}>
        <View style={styles.accentSegPrimary} />
        <View style={styles.accentSegSecondary} />
        <View style={styles.accentSegTertiary} />
      </View>

      {/* Navigation row */}
      <View style={[styles.row, { paddingTop: headerPaddingTop }]}>
        {/* LEFT: Back or Brand */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            <ChevronLeft size={24} color={styles.iconColor.color} strokeWidth={2.4} />
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
          <ThemeToggleButton size={46} />

          {showAddButton && (
            <Pressable
              onPress={handleAdd}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.pill,
                styles.accentPill,
                pressed && styles.accentPillPressed,
              ]}
            >
              <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          )}

          {rightAction}
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
    },
    accentBar: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      flexDirection: "row",
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme === "dark" ? 0.45 : 0.12,
      shadowRadius: 12,
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
    accentPill: {
      backgroundColor: "#0070D1",
      borderColor: "rgba(0, 112, 209, 0.35)",
      shadowColor: "#0070D1",
      shadowOpacity: 0.6,
    },
    accentPillPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.88 }],
    },
  });
