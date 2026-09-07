import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export function LanguageToggleButton({ size = 46 }: { size?: number }) {
  const { language, toggleLanguage } = useLanguage();
  const styles = useThemedStyles(createStyles);
  const iconSize = Math.round(size * 0.32);

  return (
    <Pressable
      onPress={toggleLanguage}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.contentRow}>
        <Globe size={iconSize} color={styles.iconColor.color} strokeWidth={2.2} />
        <Text style={styles.badgeText}>
          {language === 'en' ? 'عربي' : 'EN'}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      boxShadow: theme === 'dark' ? '0px 4px 8px rgba(0, 0, 0, 0.35)' : '0px 4px 8px rgba(0, 0, 0, 0.1)',
      elevation: 4,
    },
    buttonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.92 }],
    },
    contentRow: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    iconColor: {
      color: colors.accent,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
      marginTop: 1,
    },
  });
