import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Menu } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { AppMenuModal } from './AppMenuModal';

interface MenuToggleButtonProps {
  size?: number;
  onPress?: () => void;
}

export function MenuToggleButton({ size = 46, onPress }: MenuToggleButtonProps) {
  const styles = useThemedStyles(createStyles);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.container,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && styles.pressed,
        ]}
      >
        <Menu size={Math.round(size * 0.46)} color={styles.icon.color} strokeWidth={2.3} />
      </Pressable>

      {!onPress && (
        <AppMenuModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
      boxShadow: theme === 'dark' ? '0px 4px 12px rgba(0, 0, 0, 0.45)' : '0px 4px 12px rgba(0, 0, 0, 0.12)',
      elevation: 5,
    },
    pressed: {
      opacity: 0.6,
      transform: [{ scale: 0.92 }],
    },
    icon: {
      color: colors.text,
    },
  });
