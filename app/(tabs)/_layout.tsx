import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { LayoutDashboard, Gamepad2, ShieldCheck } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

function TabIcon({
  label,
  focused,
  icon: Icon,
  activeColor,
  inactiveColor,
  styles,
}: {
  label: string;
  focused: boolean;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  activeColor: string;
  inactiveColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const iconColor = focused ? activeColor : inactiveColor;
  return (
    <View style={styles.tabIconContainer}>
      <View
        style={[
          styles.tabIconPill,
          focused && styles.tabIconPillFocused,
        ]}
      >
        <Icon size={19} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          { color: focused ? activeColor : inactiveColor },
          focused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useVaultTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  // Flush to screen bottom with zero gap and zero radius
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 6);
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: barHeight, paddingBottom: bottomPadding },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label="Dashboard"
              focused={focused}
              icon={LayoutDashboard}
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
              styles={styles}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label="Game Vault"
              focused={focused}
              icon={Gamepad2}
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
              styles={styles}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sellers"
        options={{
          title: 'Sellers',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label="Sellers"
              focused={focused}
              icon={ShieldCheck}
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
              styles={styles}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.tabBarBg,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      borderWidth: 0,
      borderRadius: 0,
      paddingTop: 6,
      elevation: 8,
      boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.06)',
    },
    tabIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 4,
      minWidth: 70,
    },
    tabIconPill: {
      width: 38,
      height: 28,
      borderRadius: 10,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIconPillFocused: {
      backgroundColor: 'rgba(0, 112, 209, 0.14)',
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 3,
      letterSpacing: 0.1,
    },
    tabLabelFocused: {
      fontWeight: '800',
    },
  });
