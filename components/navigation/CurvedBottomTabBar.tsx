import { useState, useCallback, type ReactNode } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { VaultText as Text } from "../common/VaultText";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import * as Haptics from '@/utils/haptics';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  Gamepad2,
  ShieldCheck,
  TrendingUp,
  Package,
  Users,
  LucideIcon,
} from "lucide-react-native";
import {
  useVaultTheme,
  ThemeColors,
  ThemeMode,
} from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { usePersona } from "../../context/PersonaContext";

export interface BottomTabBarProps {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: object;
    }>;
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarLabel?:
          | string
          | ((props: { focused: boolean; color: string }) => ReactNode);
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string, params?: object) => void;
  };
  insets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function CurvedBottomTabBar({
  state,
  descriptors,
  navigation,
  insets: navInsets,
}: BottomTabBarProps) {
  const { colors } = useVaultTheme();
  const { t, isRTL } = useLanguage();
  const { isSeller } = usePersona();
  const hookInsets = useSafeAreaInsets();
  const insets = navInsets || hookInsets;

  const getTabConfig = (name: string) => {
    if (isSeller) {
      if (name === "index") return { label: t("tabSalesHub"), icon: TrendingUp };
      if (name === "vault") return { label: t("tabInventory"), icon: Package };
      if (name === "sellers") return { label: t("tabClients"), icon: Users };
    } else {
      if (name === "index") return { label: t("tabDashboard"), icon: LayoutDashboard };
      if (name === "vault") return { label: t("tabVault"), icon: Gamepad2 };
      if (name === "sellers") return { label: t("tabSellers"), icon: ShieldCheck };
    }
    return { label: name, icon: LayoutDashboard };
  };
  const [layoutWidth, setLayoutWidth] = useState<number>(
    () => Dimensions.get("window").width,
  );

  // Safe bottom padding with fallback to avoid layout snap
  const defaultDeviceBottom = Platform.OS === "ios" ? 24 : 10;
  const bottomPadding = Math.max(insets?.bottom ?? 0, defaultDeviceBottom);
  const totalBarHeight = 72 + bottomPadding;

  const styles = useThemedStyles(
    useCallback(
      (themeColors, themeMode) =>
        createStyles(themeColors, themeMode, totalBarHeight, bottomPadding),
      [totalBarHeight, bottomPadding],
    ),
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && Math.abs(width - layoutWidth) > 1) {
      setLayoutWidth(width);
    }
  };

  const activeIndex = state.index;
  const numTabs = state.routes.length || 3;
  const slotWidth = layoutWidth / numTabs;
  const activeCenterX = isRTL
    ? layoutWidth - slotWidth * (activeIndex + 0.5)
    : slotWidth * (activeIndex + 0.5);

  // Wave dome curve parameters: perfectly smooth, organic bell-curve dome
  const yBase = 18;
  const yPeak = 2;
  const cornerR = 16;
  const waveHalfWidth = 52; // Wide, natural arch around the 54px circle

  const leftStart = Math.max(cornerR, activeCenterX - waveHalfWidth);
  const rightEnd = Math.min(
    layoutWidth - cornerR,
    activeCenterX + waveHalfWidth,
  );

  // Smooth S-curve control points for continuous bell curve dome (zero slope at edges and peak)
  const leftSpan = activeCenterX - leftStart;
  const cpL1x = leftStart + leftSpan * 0.42;
  const cpL1y = yBase;
  const cpL2x = activeCenterX - leftSpan * 0.42;
  const cpL2y = yPeak;

  const rightSpan = rightEnd - activeCenterX;
  const cpR1x = activeCenterX + rightSpan * 0.42;
  const cpR1y = yPeak;
  const cpR2x = rightEnd - rightSpan * 0.42;
  const cpR2y = yBase;

  // Closed filled path: small top corner radii, smooth organic dome, flush bottom
  const barPath = [
    `M 0 ${yBase + cornerR}`,
    `Q 0 ${yBase} ${cornerR} ${yBase}`,
    `L ${leftStart} ${yBase}`,
    `C ${cpL1x} ${cpL1y} ${cpL2x} ${cpL2y} ${activeCenterX} ${yPeak}`,
    `C ${cpR1x} ${cpR1y} ${cpR2x} ${cpR2y} ${rightEnd} ${yBase}`,
    `L ${layoutWidth - cornerR} ${yBase}`,
    `Q ${layoutWidth} ${yBase} ${layoutWidth} ${yBase + cornerR}`,
    `L ${layoutWidth} ${totalBarHeight}`,
    `L 0 ${totalBarHeight}`,
    "Z",
  ].join(" ");

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* SVG Wave Background - 100% solid opaque, flush to bottom */}
      <View style={styles.svgWrapper}>
        <Svg
          width={layoutWidth}
          height={totalBarHeight}
          viewBox={`0 0 ${layoutWidth} ${totalBarHeight}`}
        >
          <Defs>
            <LinearGradient id="waveBarGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={colors.isDark ? "#111B30" : "#FFFFFF"}
                stopOpacity={1}
              />
              <Stop
                offset="100%"
                stopColor={colors.isDark ? "#080E1A" : "#F1F5F9"}
                stopOpacity={1}
              />
            </LinearGradient>
          </Defs>
          <Path d={barPath} fill="url(#waveBarGrad)" />
        </Svg>
      </View>

      {/* Interactive Tab Buttons */}
      <View style={[styles.tabsRow, { flexDirection: Platform.OS !== 'web' && isRTL ? 'row-reverse' : 'row' }]}>
        {state.routes.map((route, index) => {
          const isFocused = index === state.index;
          const config = getTabConfig(route.name);
          const Icon = config.icon;
          const tabLabel = config.label;

          const handlePress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tabLabel}
              style={styles.tabButton}
            >
              {({ hovered }: { hovered?: boolean }) =>
                isFocused ? (
                  <View style={styles.activeTabContainer}>
                    {/* Perfectly Round Concentric Circular Button */}
                    <View
                      style={[
                        styles.activeCircle,
                        hovered && styles.activeCircleHovered,
                      ]}
                    >
                      <View style={styles.activeInnerCircle}>
                        <Icon
                          size={22}
                          color={colors.isDark ? "#00D2FF" : "#0070D1"}
                          strokeWidth={2.4}
                        />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.activeTabLabel}>
                      {tabLabel}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inactiveTabContent}>
                    {/* Perfectly Round Inactive Icon Container & Hover */}
                    <View
                      style={[
                        styles.inactiveCircle,
                        hovered && styles.inactiveCircleHovered,
                      ]}
                    >
                      <Icon
                        size={20}
                        color={colors.textMuted}
                        strokeWidth={1.8}
                      />
                    </View>
                    <Text numberOfLines={1} style={styles.inactiveTabLabel}>
                      {tabLabel}
                    </Text>
                  </View>
                )
              }
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (
  colors: ThemeColors,
  _theme: ThemeMode,
  totalBarHeight: number,
  bottomPadding: number,
) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: totalBarHeight,
      backgroundColor: "transparent",
    },
    svgWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
    },
    tabsRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      paddingBottom: bottomPadding,
    },
    tabButton: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent: "flex-start",
      userSelect: "none",
    },
    activeTabContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 3,
    },
    activeCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.isDark
        ? "rgba(0, 210, 255, 0.14)"
        : "rgba(0, 112, 209, 0.08)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 3,
    },
    activeCircleHovered: {
      backgroundColor: colors.isDark
        ? "rgba(0, 210, 255, 0.24)"
        : "rgba(0, 112, 209, 0.15)",
      transform: [{ scale: 1.04 }],
    },
    activeInnerCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.isDark
        ? "rgba(0, 210, 255, 0.24)"
        : "rgba(0, 112, 209, 0.14)",
      borderWidth: 1.5,
      borderColor: colors.isDark
        ? "rgba(0, 210, 255, 0.55)"
        : "rgba(0, 112, 209, 0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    activeTabLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.isDark ? "#00D2FF" : "#0070D1",
      letterSpacing: 0.1,
    },
    inactiveTabContent: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
    },
    inactiveCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      marginBottom: 2,
    },
    inactiveCircleHovered: {
      backgroundColor: colors.isDark
        ? "rgba(0, 210, 255, 0.12)"
        : "rgba(0, 112, 209, 0.10)",
      transform: [{ scale: 1.06 }],
    },
    inactiveTabLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textMuted,
      letterSpacing: 0.1,
    },
  });
