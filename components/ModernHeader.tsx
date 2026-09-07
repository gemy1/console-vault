import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../context/ThemeContext';
import { ThemeToggleButton } from './ThemeToggleButton';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  rightElement?: React.ReactNode;
}

export function ModernHeader({
  title,
  subtitle = 'PlayStation 5 Vault',
  showAddButton = true,
  onAddPress,
  rightElement,
}: ModernHeaderProps) {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const handleAddPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onAddPress) {
      onAddPress();
    } else {
      router.push('/game/add');
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* LEFT: AVATAR & TITLE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 20 }}>🎮</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: colors.textSecondary,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: colors.text,
                marginTop: 1,
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>

        {/* RIGHT: THEME TOGGLE & ADD BUTTON */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThemeToggleButton size={38} />

          {rightElement}

          {showAddButton && !rightElement && (
            <Pressable
              onPress={handleAddPress}
              style={({ pressed }) => ({
                backgroundColor: colors.text,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: pressed ? 0.85 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: theme === 'dark' ? 0.25 : 0.08,
                shadowRadius: 4,
              })}
            >
              <Text style={{ color: colors.bg, fontSize: 13, fontWeight: '800' }}>+ Add</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
