import React from 'react';
import { View, Text, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../context/ThemeContext';
import { ThemeToggleButton } from './ThemeToggleButton';

interface ModernHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function ModernHeader({
  title,
  subtitle,
  showBackButton = false,
  showAddButton = false,
  onAddPress,
  rightAction,
  transparent = false,
}: ModernHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useVaultTheme();

  // Dynamic clearance ensuring header sits completely and comfortably below:
  // - iPhone Dynamic Island (height ~37pt, starting at ~12pt -> ends at ~49-54pt)
  // - iPhone camera notches (44-47pt)
  // - Android status bar & camera punch-holes (36-48pt)
  const androidStatusBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 36) : 0;
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? androidStatusBar : 48
  );
  // Add 12pt comfortable spacing below the notification bar
  const headerPaddingTop = safeTop + 12;

  const handleAdd = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onAddPress) {
      onAddPress();
    } else {
      router.push('/game/add');
    }
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
  };

  const buttonBg = theme === 'dark' ? colors.surfaceElevated : '#FFFFFF';
  const buttonBorder = theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View
      style={{
        paddingTop: headerPaddingTop,
        paddingBottom: 14,
        paddingHorizontal: 20,
        backgroundColor: transparent ? 'transparent' : colors.bg,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* TOP NAVIGATION ROW WITH PROMINENT CIRCULAR PILL BUTTONS (MATCHING REFERENCE IMAGE) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* LEFT CIRCULAR PILL BUTTON */}
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: buttonBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: buttonBorder,
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme === 'dark' ? 0.35 : 0.12,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: '700',
                marginLeft: -2,
                marginTop: -1,
                includeFontPadding: false,
              }}
            >
              ‹
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: buttonBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: buttonBorder,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme === 'dark' ? 0.35 : 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 22 }}>🎮</Text>
          </View>
        )}

        {/* CENTER TITLE & SUBTITLE */}
        {title ? (
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 12 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 2,
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* RIGHT CIRCULAR PILL ACTIONS */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThemeToggleButton size={48} />

          {showAddButton && (
            <Pressable
              onPress={handleAdd}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: buttonBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: buttonBorder,
                opacity: pressed ? 0.8 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: theme === 'dark' ? 0.35 : 0.12,
                shadowRadius: 8,
                elevation: 4,
              })}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: '700',
                  marginTop: -2,
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
    </View>
  );
}
