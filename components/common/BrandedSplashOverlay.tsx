import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';

const { width } = Dimensions.get('window');

interface BrandedSplashOverlayProps {
  onFinish?: () => void;
  minDuration?: number;
}

export function BrandedSplashOverlay({ onFinish, minDuration = 1400 }: BrandedSplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Subtle breathing entrance animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade out after minDuration
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        if (onFinish) onFinish();
      });
    }, minDuration);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { opacity: fadeAnim },
      ]}
      pointerEvents="none"
    >
      <StatusBar barStyle="light-content" backgroundColor="#040914" />
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#040914',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: Math.min(width * 0.72, 320),
    height: Math.min(width * 0.72, 320),
  },
});
