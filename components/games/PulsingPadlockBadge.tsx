import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface PulsingPadlockBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PulsingPadlockBadge({ size = 'md', showLabel = true }: PulsingPadlockBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();
  const pulseAnim = useSharedValue(1);
  const opacityAnim = useSharedValue(0.7);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacityAnim.value = withRepeat(
      withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: opacityAnim.value,
  }));

  const coreDimension = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const ringDimension = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ringContainer,
          { width: ringDimension, height: ringDimension },
        ]}
      >
        <Animated.View
          style={[
            animatedRingStyle,
            styles.animatedRing,
            {
              width: ringDimension,
              height: ringDimension,
              borderRadius: ringDimension / 2,
            },
          ]}
        />
        <View
          style={[
            styles.coreDot,
            {
              width: coreDimension,
              height: coreDimension,
              borderRadius: coreDimension / 2,
            },
          ]}
        />
      </View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            size === 'sm' ? styles.labelSmall : styles.labelRegular,
          ]}
        >
          {t('lockedRevokedBadge')}
        </Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    animatedRing: {
      position: 'absolute',
      backgroundColor: colors.danger,
    },
    coreDot: {
      backgroundColor: colors.danger,
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
    label: {
      color: colors.danger,
      fontWeight: '700',
      marginLeft: 6,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    labelSmall: {
      fontSize: 11,
    },
    labelRegular: {
      fontSize: 13,
    },
  });
