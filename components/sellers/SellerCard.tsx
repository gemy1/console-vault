import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import {
  ShieldCheck,
  Star,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
} from 'lucide-react-native';
import { Seller } from '../../types/vault';
import { PlatformIcon, PLATFORM_CONFIG } from '../common/PlatformIcon';
import { openSellerContact, getSellerContactList, formatPlatformHandle } from '../../utils/contacts';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SellerCardProps {
  seller: Seller;
  gamesCount: number;
  onPress: () => void;
  onEdit?: () => void;
}

export function SellerCard({ seller, gamesCount, onPress }: SellerCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const contacts = getSellerContactList(seller);
  const primaryContact = contacts[0] || (seller.contact_link ? { platform: seller.contact_platform || 'WhatsApp', value: seller.contact_link } : null);
  const platformCfg = primaryContact ? PLATFORM_CONFIG[primaryContact.platform] || PLATFORM_CONFIG.Other : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.mainRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>

        {/* AVATAR / ICON */}
        <View style={styles.avatar}>
          <ShieldCheck size={22} color="#0070D1" strokeWidth={2} />
        </View>

        {/* INFO COLUMN */}
        <View style={[styles.info, isRTL && { alignItems: 'flex-end' }]}>
          {/* Seller Name */}
          <Text style={[styles.sellerName, isRTL && styles.rtlText]} numberOfLines={1}>
            {seller.name}
          </Text>

          {/* Primary Contact Info */}
          {primaryContact ? (
            <View style={[styles.contactRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <PlatformIcon
                platform={primaryContact.platform}
                size={11}
                color={platformCfg?.defaultColor || styles.textMuted.color}
                strokeWidth={2}
              />
              <Text style={styles.contactText} numberOfLines={1}>
                {formatPlatformHandle(primaryContact.platform, primaryContact.value)}
              </Text>
            </View>
          ) : null}

          {/* Games Count Pill */}
          <View style={[styles.statsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.gamesBadge}>
              <Gamepad2 size={10} color="#0070D1" strokeWidth={2.2} />
              <Text style={styles.gamesBadgeText}>
                {gamesCount} {gamesCount === 1 ? t('gameCountSingular') : t('gameCountPlural')}
              </Text>
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN: RATING & ACTION */}
        <View style={styles.rightCol}>
          {/* Star Reputation Score */}
          <View style={[styles.ratingBadge, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Star size={10} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {(seller.reputation_score || 5.0).toFixed(1)}
            </Text>
          </View>

          {/* Action Row */}
          <View style={[styles.actionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {primaryContact ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  openSellerContact(primaryContact.platform, primaryContact.value);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => [
                  styles.chatBtn,
                  platformCfg && {
                    backgroundColor: platformCfg.bgTint,
                    borderColor: platformCfg.defaultColor + '35',
                  },
                  pressed && styles.chatBtnPressed,
                ]}
              >
                <PlatformIcon
                  platform={primaryContact.platform}
                  size={13}
                  color={platformCfg?.defaultColor || '#0070D1'}
                  strokeWidth={2.4}
                />
              </Pressable>
            ) : null}

            <View style={[styles.chevronWrap, isRTL && { paddingLeft: 0, paddingRight: 2 }]}>
              {isRTL ? (
                <ChevronLeft size={16} color={styles.chevronIcon.color} strokeWidth={2} />
              ) : (
                <ChevronRight size={16} color={styles.chevronIcon.color} strokeWidth={2} />
              )}
            </View>
          </View>
        </View>

      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, mode: ThemeMode) => {
  const isDark = mode === 'dark';

  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
        web: {
          boxShadow: isDark
            ? '0 2px 12px rgba(0,0,0,0.35)'
            : '0 2px 10px rgba(0,0,0,0.05)',
        },
      }),
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.993 }],
    },

    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(0, 112, 209, 0.12)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0, 112, 209, 0.25)' : '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },

    info: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    sellerName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.1,
    },

    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    contactText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },

    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    gamesBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 5,
      backgroundColor: isDark ? 'rgba(0, 112, 209, 0.12)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0, 112, 209, 0.22)' : '#DBEAFE',
    },
    gamesBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#0070D1',
    },

    rightCol: {
      alignItems: 'flex-end',
      gap: 6,
      flexShrink: 0,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#FBBF24' : '#D97706',
    },

    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chatBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatBtnPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.94 }],
    },

    chevronWrap: {
      paddingLeft: 2,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    chevronIcon: {
      color: colors.textMuted,
    },
    textMuted: {
      color: colors.textMuted,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
};
