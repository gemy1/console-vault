import type { ReactNode } from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { getFontStyle } from '../../utils/typography';

export interface VaultTextProps extends TextProps {
  children?: ReactNode;
}

export function VaultText({ style, children, ...props }: VaultTextProps) {
  const { isRTL } = useLanguage();

  const flattened: TextStyle = style ? StyleSheet.flatten(style) : {};
  const weight = flattened.fontWeight;
  const fontStyle = getFontStyle(weight, isRTL);

  const mergedStyle: TextStyle[] = [
    style as TextStyle,
    fontStyle,
  ];

  if (isRTL && !flattened.textAlign) {
    mergedStyle.push({ textAlign: 'right' });
  }

  return (
    <RNText {...props} style={mergedStyle}>
      {children}
    </RNText>
  );
}

// Convenient alias
export const Text = VaultText;
export default VaultText;
