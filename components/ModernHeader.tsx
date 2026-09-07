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
import { useVaultTheme } from "../context/ThemeContext";
import { ThemeToggleButton } from "./ThemeToggleButton";

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

  // ─── Safe area clearance ──────────────────────────────────────────────────
  // Trust insets.top completely — it already accounts for notch / Dynamic Island.
  // On Android, fall back to RNStatusBar.currentHeight if insets isn't ready yet.
  const androidFallback =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : 0;
  const safeTop = insets.top > 0 ? insets.top : androidFallback;
  // 12pt comfortable gap below the notification bar
  const headerPaddingTop = safeTop + 12;

  // ─── Mount spring animation (slides in from top) ──────────────────────────
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

  // ─── Scroll-driven background opacity ────────────────────────────────────
  const bgOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 70],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : new Animated.Value(transparent ? 0 : 1);

  // ─── Design tokens ────────────────────────────────────────────────────────
  const isDark = theme === "dark";
  const buttonBg = isDark
    ? "rgba(255, 255, 255, 0.07)"
    : "rgba(255, 255, 255, 0.9)";
  const buttonBorder = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.07)";
  const buttonShadowOpacity = isDark ? 0.45 : 0.12;
  const headerBg = isDark ? "rgba(8, 12, 22, 0.9)" : "rgba(245, 247, 251, 0.9)";

  // ─── Handlers ─────────────────────────────────────────────────────────────
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
    <Animated.View
      style={[
        styles.wrapper,
        animatedStyle,
        // Solid bg ensures nothing bleeds behind the notification bar
        { backgroundColor: isDark ? "#080C16" : "#F5F7FB" },
      ]}
    >
      {/* ── Frosted glass overlay (fades in as user scrolls) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: headerBg,
            opacity: bgOpacity,
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      />
      {/* ── Thin gradient accent bar just below the notch ── */}
      <View pointerEvents="none" style={[styles.accentBar, { top: safeTop }]}>
        <View
          style={[
            styles.accentSeg,
            { backgroundColor: "#0070D1", opacity: 0.9 },
          ]}
        />
        <View
          style={[
            styles.accentSeg,
            { backgroundColor: "#00D2FF", opacity: 0.55 },
          ]}
        />
        <View
          style={[
            styles.accentSeg,
            { backgroundColor: "#00D2FF", opacity: 0.18 },
          ]}
        />
      </View>
      {/* ── Navigation row ── */}
      <View
        style={[
          styles.row,
          { paddingTop: headerPaddingTop, paddingBottom: 14 },
        ]}
      >
        {/* LEFT: Back or Brand */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: buttonBg,
                borderColor: buttonBorder,
                shadowOpacity: buttonShadowOpacity,
                opacity: pressed ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: "500",
                marginLeft: -1,
                lineHeight: 26,
                includeFontPadding: false,
              }}
            >
              ‹
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: buttonBg,
                borderColor: buttonBorder,
                shadowOpacity: buttonShadowOpacity,
              },
            ]}
          >
            <Text style={{ fontSize: 20 }}>🎮</Text>
          </View>
        )}

        {/* CENTER: Title stack */}
        {title ? (
          <View style={styles.titleBlock}>
            {subtitle ? (
              <Text
                style={[styles.subtitleLabel, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {subtitle.toUpperCase()}
              </Text>
            ) : null}

            <Text
              style={[styles.titleLabel, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {/* Accent dot underline */}
            <View style={styles.dotRow}>
              <View style={[styles.dot, { backgroundColor: "#0070D1" }]} />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: "#00D2FF", width: 5, opacity: 0.45 },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
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
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.88 : 1 }],
                },
              ]}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontWeight: "300",
                  lineHeight: 26,
                  marginTop: -1,
                  includeFontPadding: false,
                }}
              >
                +
              </Text>
            </Pressable>
          )}

          {rightAction}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 100,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    flexDirection: "row",
  },
  accentSeg: {
    flex: 1,
    height: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  pill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  accentPill: {
    backgroundColor: "#0070D1",
    borderColor: "rgba(0, 112, 209, 0.35)",
    shadowColor: "#0070D1",
    shadowOpacity: 0.6,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  subtitleLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  titleLabel: {
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
  dot: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
