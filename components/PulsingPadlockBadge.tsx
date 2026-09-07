import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface PulsingPadlockBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PulsingPadlockBadge({ size = 'md', showLabel = true }: PulsingPadlockBadgeProps) {
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

  const coreSize = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const ringSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            animatedRingStyle,
            {
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: '#FF3B30',
            },
          ]}
        />
        <View
          style={{
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: '#FF3B30',
            borderWidth: 1.5,
            borderColor: '#080B14',
          }}
        />
      </View>

      {showLabel && (
        <Text
          style={{
            color: '#FF453A',
            fontSize: size === 'sm' ? 11 : 13,
            fontWeight: '700',
            marginLeft: 6,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          LOCKED / REVOKED
        </Text>
      )}
    </View>
  );
}
