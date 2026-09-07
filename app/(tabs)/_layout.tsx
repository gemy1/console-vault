import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { useVaultTheme } from '../../context/ThemeContext';

function TabIcon({ label, focused, symbol, activeColor, inactiveColor }: {
  label: string;
  focused: boolean;
  symbol: string;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
      <View
        style={{
          width: 38,
          height: 28,
          borderRadius: 14,
          backgroundColor: focused ? 'rgba(0, 112, 209, 0.16)' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>{symbol}</Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '800' : '600',
          color: focused ? activeColor : inactiveColor,
          marginTop: 2,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, theme } = useVaultTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          backgroundColor: colors.tabBarBg,
          borderColor: colors.tabBarBorder,
          borderWidth: 1,
          borderRadius: 36,
          height: 66,
          paddingBottom: 8,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme === 'dark' ? 0.45 : 0.12,
          shadowRadius: 16,
          elevation: 10,
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
              label="Hub"
              focused={focused}
              symbol="⚡"
              activeColor={colors.neon}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Game Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label="Vault"
              focused={focused}
              symbol="🎮"
              activeColor={colors.neon}
              inactiveColor={colors.textMuted}
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
              label="Vendors"
              focused={focused}
              symbol="🛡️"
              activeColor={colors.neon}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
