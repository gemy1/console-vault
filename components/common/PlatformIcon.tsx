import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { MessageCircle, Send, Gamepad2, Globe } from 'lucide-react-native';
import { ContactPlatform } from '../../types/vault';

interface PlatformIconProps {
  platform: ContactPlatform;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const PLATFORM_CONFIG: Record<
  ContactPlatform,
  { label: string; defaultColor: string; bgTint: string }
> = {
  WhatsApp: {
    label: 'WhatsApp',
    defaultColor: '#25D366',
    bgTint: 'rgba(37, 211, 102, 0.15)',
  },
  Telegram: {
    label: 'Telegram',
    defaultColor: '#0088CC',
    bgTint: 'rgba(0, 136, 204, 0.15)',
  },
  Facebook: {
    label: 'Facebook',
    defaultColor: '#1877F2',
    bgTint: 'rgba(24, 119, 242, 0.15)',
  },
  Discord: {
    label: 'Discord',
    defaultColor: '#5865F2',
    bgTint: 'rgba(88, 101, 242, 0.15)',
  },
  Other: {
    label: 'Other',
    defaultColor: '#8E8E93',
    bgTint: 'rgba(142, 142, 147, 0.15)',
  },
};

export function PlatformIcon({
  platform,
  size = 18,
  color,
  strokeWidth = 2.2,
}: PlatformIconProps) {
  const iconColor = color || PLATFORM_CONFIG[platform]?.defaultColor || '#8E8E93';

  switch (platform) {
    case 'WhatsApp':
      return <MessageCircle size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'Telegram':
      return <Send size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'Facebook':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            fill={iconColor}
          />
        </Svg>
      );
    case 'Discord':
      return <Gamepad2 size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'Other':
    default:
      return <Globe size={size} color={iconColor} strokeWidth={strokeWidth} />;
  }
}
