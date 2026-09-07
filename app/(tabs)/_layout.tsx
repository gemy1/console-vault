import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';

// Custom Tab Bar Icon Helper
function TabIcon({ label, focused, symbol }: { label: string; focused: boolean; symbol: string }) {
  const color = focused ? '#00D2FF' : '#64748B';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
      <Text style={{ fontSize: 20, color }}>{symbol}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '700' : '500',
          color,
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0E1A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dashboard" focused={focused} symbol="⚡" />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Game Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Library" focused={focused} symbol="🎮" />
          ),
        }}
      />
      <Tabs.Screen
        name="sellers"
        options={{
          title: 'Sellers',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Sellers" focused={focused} symbol="🛡️" />
          ),
        }}
      />
    </Tabs>
  );
}
