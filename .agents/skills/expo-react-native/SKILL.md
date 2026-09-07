---
name: expo-react-native
description: >-
  Architectural patterns, best practices, and code templates for building mobile apps with Expo, Expo Router, NativeWind (Tailwind), and React Native Reanimated. Use when building or refactoring React Native components, navigation, styling, and animations.
---

# Skill: Expo & React Native Best Practices

This skill provides architectural guidelines, design tokens, and reference implementations for building production-grade React Native apps using **Expo Router**, **NativeWind (Tailwind CSS)**, and **React Native Reanimated**.

---

## 1. Project Architecture (Expo Router v3/v4)

Structure all navigation under the `app/` directory with file-based routing:

```text
app/
├── _layout.tsx              # Root layout: ThemeProvider, QueryClient, GestureHandlerRootView
├── (tabs)/
│   ├── _layout.tsx          # Bottom tab bar (Dashboard, Vault, Sellers, Settings)
│   ├── index.tsx            # Dashboard: Summary metrics, active warranties, attention alerts
│   ├── library.tsx          # Game Vault library with filter/search
│   └── sellers.tsx          # Sellers management & reputation board
├── game/
│   ├── [id].tsx             # Game details screen (sensitive credentials guarded)
│   ├── add.tsx              # Add new game modal
│   └── padlock.tsx          # Padlock Protocol modal (WhatsApp claim generator)
└── +not-found.tsx
```

### Essential Root Layout Boilerplate
```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E1A' }
        }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="game/padlock" 
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

---

## 2. Design System & NativeWind v4

"Console Vault" adopts a premium PlayStation 5 dark OLED aesthetic:

### Tailwind Theme Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0A0E1A',           // Deep Obsidian
          surface: '#121829',      // Elevated Card Surface
          border: '#1E2942',       // Subtle border
          accent: '#0070D1',       // PlayStation Signature Blue
          neon: '#00D2FF',         // Cyan Glow
          danger: '#FF3B30',       // Locked / Revoked alert
          warning: '#FF9500',      // Warranty expiring soon
          success: '#34C759',      // Warranty Active
          secondary: '#8E9BB0',    // Muted text
        }
      }
    },
  },
  plugins: [],
};
```

---

## 3. Reanimated 3: Pulsing Padlock Indicator

When a game status is `'Locked'`, display an animated pulsing beacon:

```tsx
import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { View } from 'react-native';

export function PulsingPadlockBadge() {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    scale.value = withRepeat(
      withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <View className="relative items-center justify-center">
      <Animated.View 
        style={animatedStyle} 
        className="absolute w-7 h-7 rounded-full bg-vault-danger/30" 
      />
      <View className="w-4 h-4 rounded-full bg-vault-danger border-2 border-vault-bg" />
    </View>
  );
}
```

---

## 4. Best Practices Checklist

- **Never place complex work on JS Thread**: Use Reanimated worklets for gestures and animations.
- **Haptic Feedback**: Always trigger `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` on sensitive reveals and padlock toggles.
- **Avoid FlatList lag**: Use `flash-list` or configure `windowSize={5}`, `maxToRenderPerBatch={10}`, and `removeClippedSubviews={true}` for large game libraries.
