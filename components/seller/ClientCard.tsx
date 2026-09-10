import React from 'react';
import { View, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import {
  MessageCircle,
  Phone,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from '@/utils/haptics';
import { Client, ClientAllocation, Game } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';

interface ClientCardProps {
  client: Client;
  allocations: ClientAllocation[];
  gamesMap?: Record<string, Game>;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDispatchWhatsApp?: (allocation: ClientAllocation) => void;
}

export function ClientCard({
  client,
  allocations,
  gamesMap,
  onPress,
}: ClientCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  // Allocations for this client (ignoring any orphaned records)
  const clientAllocations = allocations.filter(
    (a) => a.client_id === client.id && (!gamesMap || Boolean(gamesMap[a.game_id]))
  );
  const activeAllocations = clientAllocations.filter((a) => a.status === 'Active');
  const totalSpent = clientAllocations.reduce((sum, a) => sum + (a.sale_price || 0), 0);
  const hasPurchases = totalSpent > 0 || clientAllocations.length > 0;

  const handleOpenWhatsApp = () => {
    if (!client.contact_link) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const cleanNum = client.contact_link.replace(/[^0-9]/g, '');
    const url = cleanNum ? `https://wa.me/${cleanNum}` : client.contact_link;
    Linking.openURL(url).catch(() => {});
  };

  const nameParts = (client.name || '').trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts.length === 1
    ? nameParts[0].slice(0, 2).toUpperCase()
    : 'C';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.mainRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>

        {/* AVATAR / INITIALS */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* INFO COLUMN */}
        <View style={[styles.info, isRTL && { alignItems: 'flex-end' }]}>
          {/* Client Name */}
          <Text style={[styles.clientName, isRTL && styles.rtlText]} numberOfLines={1}>
            {client.name}
          </Text>

          {/* Contact sub-row */}
          {client.contact_link ? (
            <View style={[styles.contactRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Phone size={11} color={styles.textMuted.color} strokeWidth={2} />
              <Text style={styles.contactText} numberOfLines={1}>
                {client.contact_link}
              </Text>
            </View>
          ) : null}

          {/* Active Accounts Pill */}
          <View style={[styles.statsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.accountBadge}>
              <View
                style={[
                  styles.statusDot,
                  activeAllocations.length > 0 ? styles.dotActive : styles.dotInactive,
                ]}
              />
              <Text style={styles.accountBadgeText}>
                {activeAllocations.length > 0
                  ? isRTL
                    ? `${activeAllocations.length} ${activeAllocations.length === 1 ? 'حساب نشط' : 'حسابات نشطة'}`
                    : `${activeAllocations.length} active ${activeAllocations.length === 1 ? 'account' : 'accounts'}`
                  : isRTL
                  ? 'لا توجد حسابات نشطة'
                  : 'No active accounts'}
              </Text>
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN: SPEND + ACTION */}
        <View style={styles.rightCol}>
          {hasPurchases ? (
            <Text style={styles.spentAmount}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          ) : (
            <Text style={styles.noPurchasesText}>
              {isRTL ? 'لا مبيعات' : 'No sales'}
            </Text>
          )}

          <View style={[styles.actionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {client.contact_link ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenWhatsApp();
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => [
                  styles.whatsAppBtn,
                  pressed && styles.whatsAppBtnPressed,
                ]}
              >
                <MessageCircle size={13} color="#10B981" strokeWidth={2.5} />
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
    avatarText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0070D1',
      letterSpacing: 0.5,
    },

    info: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    clientName: {
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
    accountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 5,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    dotActive: {
      backgroundColor: '#10B981',
    },
    dotInactive: {
      backgroundColor: colors.textMuted,
    },
    accountBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    rightCol: {
      alignItems: 'flex-end',
      gap: 6,
      flexShrink: 0,
    },
    spentAmount: {
      fontSize: 13,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: -0.2,
    },
    noPurchasesText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },

    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    whatsAppBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    whatsAppBtnPressed: {
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
