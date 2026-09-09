import { Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '@/utils/haptics';
import { ContactPlatform, Seller, SellerContactMethod } from '../types/vault';

export function getSellerContactList(seller: Seller): SellerContactMethod[] {
  if (seller.contact_methods && seller.contact_methods.length > 0) {
    return seller.contact_methods;
  }
  // Fallback to legacy primary contact
  if (seller.contact_link) {
    return [
      {
        id: 'primary',
        platform: seller.contact_platform || 'WhatsApp',
        value: seller.contact_link,
        label: 'Primary Contact',
      },
    ];
  }
  return [];
}

export function formatPlatformHandle(platform: ContactPlatform, value: string): string {
  const clean = value.trim();
  switch (platform) {
    case 'WhatsApp':
      return clean.startsWith('+') ? clean : `+${clean}`;
    case 'Telegram':
      return clean.startsWith('@') ? clean : `@${clean}`;
    case 'Facebook':
      return clean.replace(/^https?:\/\/(www\.)?(facebook\.com|m\.me)\//i, '');
    case 'Discord':
      return clean;
    case 'Other':
    default:
      return clean;
  }
}

export interface ContactAlertMessages {
  discordTitle?: string;
  discordDesc?: string;
  contactTitle?: string;
  contactDesc?: string;
  showAlert?: (config: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'danger' }) => void;
}

export async function openSellerContact(
  platform: ContactPlatform,
  value: string,
  prefilledText?: string,
  alertMessages?: ContactAlertMessages
): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}

  const clean = value.trim();
  const encodedText = prefilledText ? encodeURIComponent(prefilledText) : '';

  switch (platform) {
    case 'WhatsApp': {
      const phone = clean.replace(/[^0-9]/g, '');
      const url = encodedText
        ? `https://wa.me/${phone}?text=${encodedText}`
        : `https://wa.me/${phone}`;
      Linking.openURL(url);
      break;
    }

    case 'Telegram': {
      const handle = clean.replace(/^@/, '');
      const url = encodedText
        ? `https://t.me/${handle}?text=${encodedText}`
        : `https://t.me/${handle}`;
      Linking.openURL(url);
      break;
    }

    case 'Facebook': {
      let url = '';
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        url = clean;
      } else if (clean.startsWith('facebook.com') || clean.startsWith('m.me')) {
        url = `https://${clean}`;
      } else {
        // Assume page handle or username for direct messenger link
        const handle = clean.replace(/^@/, '');
        url = `https://m.me/${handle}`;
      }
      Linking.openURL(url);
      break;
    }

    case 'Discord': {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        Linking.openURL(clean);
      } else {
        await Clipboard.setStringAsync(clean);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        const discTitle = alertMessages?.discordTitle || 'Discord Handle Copied';
        const discMsg = alertMessages?.discordDesc || `"${clean}" has been copied to your clipboard. Open Discord to search and message them.`;
        if (alertMessages?.showAlert) {
          alertMessages.showAlert({ title: discTitle, message: discMsg, type: 'info' });
        } else {
          Alert.alert(discTitle, discMsg);
        }
      }
      break;
    }

    case 'Other':
    default: {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        Linking.openURL(clean);
      } else {
        await Clipboard.setStringAsync(clean);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        const otherTitle = alertMessages?.contactTitle || 'Contact Info Copied';
        const otherMsg = alertMessages?.contactDesc || `"${clean}" has been copied to your clipboard.`;
        if (alertMessages?.showAlert) {
          alertMessages.showAlert({ title: otherTitle, message: otherMsg, type: 'info' });
        } else {
          Alert.alert(otherTitle, otherMsg);
        }
      }
      break;
    }
  }
}
