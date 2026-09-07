import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVaultTheme } from '../../context/ThemeContext';

function TabIcon({ label, focused, symbol, activeColor, inactiveColor }: {
  label: string;
  focused: boolean;
  symbol: string;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 4,
        minWidth: 70,   // ← ensures the label always has room
      }}
    >
      <View
        style={{
          width: 36,
          height: 26,
          borderRadius: 8,
          backgroundColor: focused ? 'rgba(0, 112, 209, 0.12)' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>{symbol}</Text>
      </View>
      <Text
        numberOfLines={1}          // ← never wraps to a second line
        style={{
          fontSize: 10,
          fontWeight: focused ? '800' : '600',
          color: focused ? activeColor : inactiveColor,
          marginTop: 2,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}


export default function TabLayout() {
  const { colors } = useVaultTheme();
  const insets = useSafeAreaInsets();

  // Flush to screen bottom with zero gap and zero radius
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 6);
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          borderWidth: 0,
          borderRadius: 0, // Zero radius as requested
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
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
              symbol="⚡"
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
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
              symbol="🎮"
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sellers"
        options={{
          title: 'Vendors',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label="Sellers"
              focused={focused}
              symbol="🛡️"
              activeColor={colors.accent}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
