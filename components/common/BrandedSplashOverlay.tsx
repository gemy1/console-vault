import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
  Platform,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { Gamepad2, Shield } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BrandedSplashOverlayProps {
  onFinish?: () => void;
  minDuration?: number;
}

const STATUS_STEPS = [
  'INITIALIZING SYSTEM',
  'SECURING ENCLAVE',
  'VAULT READY',
];

export function BrandedSplashOverlay({
  onFinish,
  minDuration = 1500,
}: BrandedSplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [statusText, setStatusText] = useState(STATUS_STEPS[0]);

  // Master animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const spinForward = useRef(new Animated.Value(0)).current;
  const spinReverse = useRef(new Animated.Value(0)).current;
  const pulseGlow = useRef(new Animated.Value(0.7)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance spring for central logo
    Animated.spring(logoScale, {
      toValue: 1,
      damping: 14,
      stiffness: 160,
      mass: 0.9,
      useNativeDriver: true,
    }).start();

    // 2. Text entrance
    Animated.timing(textFade, {
      toValue: 1,
      duration: 500,
      delay: 150,
      useNativeDriver: true,
    }).start();

    // 3. Smooth continuous outer ring rotation (forward)
    Animated.loop(
      Animated.timing(spinForward, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Subtle counter-rotation for inner orbital track (reverse)
    Animated.loop(
      Animated.timing(spinReverse, {
        toValue: 1,
        duration: 3800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 5. Breathing ambient glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseGlow, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 6. Dot status pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1.4,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.8,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 7. Progressive status text changes
    const step1 = setTimeout(() => setStatusText(STATUS_STEPS[1]), minDuration * 0.4);
    const step2 = setTimeout(() => setStatusText(STATUS_STEPS[2]), minDuration * 0.78);

    // 8. Progress bar fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: minDuration - 220,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 9. Cinematic zoom & dissolve exit
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.04,
          duration: 400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        if (onFinish) onFinish();
      });
    }, minDuration);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(exitTimer);
    };
  }, [
    containerScale,
    dotPulse,
    fadeAnim,
    logoScale,
    minDuration,
    onFinish,
    progressAnim,
    pulseGlow,
    spinForward,
    spinReverse,
    textFade,
  ]);

  if (!visible) return null;

  const rotateForward = spinForward.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateReverse = spinReverse.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const DIAL_SIZE = 132;
  const OUTER_RADIUS = 58;
  const INNER_RADIUS = 48;
  const OUTER_CIRCUMFERENCE = 2 * Math.PI * OUTER_RADIUS;
  const INNER_CIRCUMFERENCE = 2 * Math.PI * INNER_RADIUS;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlayContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: containerScale }],
        },
      ]}
      pointerEvents="none"
    >
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* AMBIENT RADIAL NEON BLOOM */}
      <Animated.View
        style={[
          styles.glowBloom,
          {
            transform: [{ scale: pulseGlow }],
          },
        ]}
      >
        <Svg width={300} height={300} viewBox="0 0 300 300">
          <Defs>
            <RadialGradient id="bloomGrad" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00D2FF" stopOpacity={0.35} />
              <Stop offset="45%" stopColor="#0070D1" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#020617" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={300} height={300} fill="url(#bloomGrad)" />
        </Svg>
      </Animated.View>

      {/* MAIN LOGO & EMBLEM STACK */}
      <Animated.View style={[styles.mainStack, { transform: [{ scale: logoScale }] }]}>
        <View style={styles.dialWrapper}>
          {/* 1. OUTER ROTATING PRECISION LASER ARC */}
          <Animated.View
            style={[
              styles.svgDialLayer,
              { transform: [{ rotate: rotateForward }] },
            ]}
          >
            <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
              <Defs>
                <LinearGradient id="outerLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#00D2FF" stopOpacity={1} />
                  <Stop offset="60%" stopColor="#0070D1" stopOpacity={0.7} />
                  <Stop offset="100%" stopColor="#00D2FF" stopOpacity={0.05} />
                </LinearGradient>
              </Defs>
              {/* Outer faint circular track */}
              <Circle
                cx={DIAL_SIZE / 2}
                cy={DIAL_SIZE / 2}
                r={OUTER_RADIUS}
                stroke="rgba(0, 210, 255, 0.10)"
                strokeWidth={1.5}
                fill="none"
              />
              {/* Active high-energy laser arc */}
              <Circle
                cx={DIAL_SIZE / 2}
                cy={DIAL_SIZE / 2}
                r={OUTER_RADIUS}
                stroke="url(#outerLaserGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${OUTER_CIRCUMFERENCE * 0.38} ${OUTER_CIRCUMFERENCE * 0.62}`}
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* 2. INNER COUNTER-ROTATING ORBITAL TICKS */}
          <Animated.View
            style={[
              styles.svgDialLayer,
              { transform: [{ rotate: rotateReverse }] },
            ]}
          >
            <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
              <Circle
                cx={DIAL_SIZE / 2}
                cy={DIAL_SIZE / 2}
                r={INNER_RADIUS}
                stroke="rgba(0, 210, 255, 0.25)"
                strokeWidth={1}
                strokeDasharray="4 14"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* 3. CENTRAL CONSOLE EMBLEM BADGE */}
          <View style={styles.vaultCore}>
            {/* Ambient inner gradient background */}
            <View style={styles.vaultCoreGlow} />

            <Gamepad2
              size={36}
              color="#00D2FF"
              strokeWidth={2.2}
              style={styles.gamepadIcon}
            />

            {/* Micro Shield Lock Accent */}
            <View style={styles.microShieldBadge}>
              <Shield size={10} color="#00D2FF" strokeWidth={2.8} />
            </View>
          </View>
        </View>

        {/* 4. TYPOGRAPHY & BRANDING */}
        <Animated.View style={[styles.brandBlock, { opacity: textFade }]}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitleConsole}>CONSOLE</Text>
            <Text style={styles.brandTitleVault}>VAULT</Text>
          </View>

          <Text style={styles.brandSubtitle}>SECURE GAMING CREDENTIALS</Text>

          {/* 5. PRECISION LASER PROGRESS TRACK */}
          <View style={styles.laserProgressTrack}>
            <Animated.View
              style={[
                styles.laserProgressFill,
                { width: progressWidth },
              ]}
            >
              {/* Glowing Laser Head */}
              <View style={styles.laserGlowHead} />
            </Animated.View>
          </View>

          {/* 6. TELEMETRY STATUS PILL */}
          <View style={styles.telemetryPill}>
            <Animated.View
              style={[
                styles.pulseIndicatorDot,
                { transform: [{ scale: dotPulse }] },
              ]}
            />
            <Text style={styles.telemetryText}>{statusText}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* FOOTER SYSTEM VERSION TAG */}
      <Animated.View style={[styles.footerTag, { opacity: textFade }]}>
        <Text style={styles.footerText}>ENCRYPTED // V1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    backgroundColor: '#020617', // Deepest luxury OLED obsidian
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBloom: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialWrapper: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  svgDialLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 132,
    height: 132,
  },
  vaultCore: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#070E1E',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 255, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  vaultCoreGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 112, 209, 0.18)',
  },
  gamepadIcon: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  microShieldBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#0B1528',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.2,
    borderColor: '#00D2FF',
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  brandBlock: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brandTitleConsole: {
    fontFamily: 'Cairo_800ExtraBold',
    fontSize: 22,
    color: '#F8FAFC',
    letterSpacing: 4,
  },
  brandTitleVault: {
    fontFamily: 'Cairo_800ExtraBold',
    fontSize: 22,
    color: '#00D2FF',
    letterSpacing: 4,
    marginLeft: 6,
  },
  brandSubtitle: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 2.2,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  laserProgressTrack: {
    width: 150,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1,
    overflow: 'visible',
    marginBottom: 16,
    position: 'relative',
  },
  laserProgressFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 1,
    position: 'relative',
  },
  laserGlowHead: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
    }),
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.16)',
    gap: 7,
  },
  pulseIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00D2FF',
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
    }),
  },
  telemetryText: {
    fontFamily: 'SpaceMono',
    fontSize: 9.5,
    color: '#94A3B8',
    letterSpacing: 1.6,
  },
  footerTag: {
    position: 'absolute',
    bottom: 34,
  },
  footerText: {
    fontFamily: 'SpaceMono',
    fontSize: 8.5,
    color: '#334155',
    letterSpacing: 2,
  },
});
