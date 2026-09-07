import { Platform, TextStyle } from 'react-native';

/**
 * Returns cross-platform Cairo font style for native iOS, Android, and Web.
 * On native mobile, Expo Google Fonts requires the exact font family variant name.
 */
export function getFontStyle(
  weight?: TextStyle['fontWeight'],
  isRTL: boolean = false
): TextStyle {
  if (!isRTL) {
    return weight ? { fontWeight: weight } : {};
  }

  if (Platform.OS === 'web') {
    return {
      fontFamily: 'Cairo, system-ui, -apple-system, sans-serif',
      ...(weight ? { fontWeight: weight } : {}),
    };
  }

  // Native Mobile (iOS & Android) Cairo Font Mapping
  switch (weight) {
    case '800':
    case '900':
      return {
        fontFamily: 'Cairo_800ExtraBold',
        fontWeight: Platform.OS === 'ios' ? weight : undefined,
      };
    case '700':
    case 'bold':
      return {
        fontFamily: 'Cairo_700Bold',
        fontWeight: Platform.OS === 'ios' ? weight : undefined,
      };
    case '600':
      return {
        fontFamily: 'Cairo_600SemiBold',
        fontWeight: Platform.OS === 'ios' ? weight : undefined,
      };
    case '500':
    case '400':
    case 'normal':
    default:
      return {
        fontFamily: 'Cairo_400Regular',
        fontWeight: Platform.OS === 'ios' ? '400' : undefined,
      };
  }
}

/**
 * Returns the appropriate flex-direction for rows in RTL mode:
 * - On Web: browser CSS handles 'row' + dir="rtl" automatically.
 * - On Native: React Native Yoga requires 'row-reverse' unless native bridge restarted.
 */
export function rtlFlexRow(isRTL: boolean): 'row' | 'row-reverse' {
  if (Platform.OS === 'web') {
    return 'row';
  }
  return isRTL ? 'row-reverse' : 'row';
}

/**
 * Directional horizontal margin helper for native and web
 */
export function rtlMarginStart(isRTL: boolean, margin: number): { marginLeft: number; marginRight: number } {
  if (Platform.OS === 'web') {
    return isRTL ? { marginRight: margin, marginLeft: 0 } : { marginLeft: margin, marginRight: 0 };
  }
  // On native with row-reverse, the visual start is reversed
  return isRTL ? { marginLeft: 0, marginRight: margin } : { marginLeft: margin, marginRight: 0 };
}
