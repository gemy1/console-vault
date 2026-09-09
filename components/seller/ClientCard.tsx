import React from 'react';
import { View, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import {
  User,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Client, ClientAllocation, Game } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { calculateWarranty } from '../../utils/padlock';

interface ClientCardProps {
  client: Client;
  allocations: ClientAllocation[];
  gamesMap: Record<string, Game>;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDispatchWhatsApp?: (allocation: ClientAllocation) => void;
}

export function ClientCard({
  client,
  allocations,
  gamesMap,
  onPress,
  onEdit,
  onDelete,
  onDispatchWhatsApp,
}: ClientCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  // Allocations for this client
  const clientAllocations = allocations.filter((a) => a.client_id === client.id);
  const activeAllocations = clientAllocations.filter((a) => a.status === 'Active');
  const totalSpent = clientAllocations.reduce((sum, a) => sum + (a.sale_price || 0), 0);

  const handleOpenWhatsApp = () => {
    if (!client.contact_link) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const cleanNum = client.contact_link.replace(/[^0-9]/g, '');
    const url = cleanNum ? `https://wa.me/${cleanNum}` : client.contact_link;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isNativeRTL && { flexDirection: 'column' },
        pressed && styles.cardPressed,
      ]}
    >
      {/* TOP ROW: ICON, NAME, ACTION BUTTONS */}
      <View style={[styles.topRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.clientInfoRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.iconCircle}>
            <User size={22} color={styles.accentColor.color} strokeWidth={2} />
          </View>

          <View style={[styles.nameBlock, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
            <Text style={[styles.clientName, isRTL && styles.rtlText]} numberOfLines={1}>
              {client.name}
            </Text>

            <View style={[styles.badgeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              {/* ACTIVE SLOTS BADGE */}
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {activeAllocations.length} {t('availableSlots')}
                </Text>
              </View>

              {/* TOTAL SPEND */}
              <View style={styles.spentBadge}>
                <Text style={styles.spentBadgeText}>
                  {formatCurrency(totalSpent, currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={[styles.actionsRight, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          {client.contact_link ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleOpenWhatsApp();
              }}
              style={styles.whatsAppButton}
            >
              <MessageCircle size={15} color="#10B981" />
            </Pressable>
          ) : null}

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.editButton}
          >
            <Pencil size={14} color={styles.editIcon.color} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteButton}
          >
            <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* CONTACT INFORMATION */}
      {client.contact_link ? (
        <View style={[styles.contactRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <Phone size={12} color={styles.textTertiary.color} />
          <Text style={[styles.contactText, isRTL && styles.rtlText]}>
            {client.contact_link} ({client.contact_platform})
          </Text>
        </View>
      ) : null}

      {/* ALLOCATED GAMES / SLOTS PREVIEW */}
      {clientAllocations.length > 0 ? (
        <View style={styles.allocationsSection}>
          {clientAllocations.map((alloc) => {
            const game = gamesMap[alloc.game_id];
            const gameTitle = game ? game.title : 'PlayStation Game';
            const warranty = calculateWarranty(alloc.sale_date, alloc.warranty_months);

            return (
              <View
                key={alloc.id}
                style={[
                  styles.allocItem,
                  isNativeRTL && { flexDirection: 'row-reverse' },
                ]}
              >
                <View style={[styles.allocLeft, isRTL && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.allocGameTitle, isRTL && styles.rtlText]} numberOfLines={1}>
                    {gameTitle}
                  </Text>
                  <View style={[styles.allocSubRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.slotPill}>
                      <Text style={styles.slotPillText}>{alloc.slot_type.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.allocPrice}>
                      {formatCurrency(alloc.sale_price, alloc.currency || currency)}
                    </Text>
                  </View>
                </View>

                {/* WARRANTY BADGE & WHATSAPP BUTTON */}
                <View style={[styles.allocRight, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <View
                    style={[
                      styles.warrantyBadge,
                      !warranty.isWarrantyActive
                        ? styles.warrantyBadgeExpired
                        : warranty.isExpiringSoon
                        ? styles.warrantyBadgeWarning
                        : styles.warrantyBadgeValid,
                    ]}
                  >
                    {!warranty.isWarrantyActive ? (
                      <Clock size={10} color="#EF4444" />
                    ) : (
                      <CheckCircle2 size={10} color="#10B981" />
                    )}
                    <Text
                      style={[
                        styles.warrantyBadgeText,
                        !warranty.isWarrantyActive && { color: '#EF4444' },
                        warranty.isExpiringSoon && { color: '#F59E0B' },
                      ]}
                    >
                      {!warranty.isWarrantyActive
                        ? t('warrantyExpired')
                        : `${warranty.daysRemaining}d`}
                    </Text>
                  </View>

                  {onDispatchWhatsApp ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onDispatchWhatsApp(alloc);
                      }}
                      style={styles.receiptButton}
                    >
                      <Share2 size={13} color="#10B981" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, mode: ThemeMode) => {
  const isDark = mode === 'dark';

  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 10,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.06)',
        },
      }),
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.995 }],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    clientInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(0, 112, 209, 0.15)' : '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    accentColor: {
      color: '#0070D1',
    },
    nameBlock: {
      flex: 1,
    },
    clientName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    rtlText: {
      textAlign: 'right',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    spentBadge: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    spentBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
    actionsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    whatsAppButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editIcon: {
      color: colors.textSecondary,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    contactText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    textTertiary: {
      color: colors.textMuted,
    },
    allocationsSection: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      gap: 8,
    },
    allocItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
      borderRadius: 8,
    },
    allocLeft: {
      flex: 1,
    },
    allocGameTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    allocSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    slotPill: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    slotPillText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#3B82F6',
    },
    allocPrice: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
    allocRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    warrantyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    warrantyBadgeValid: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
    },
    warrantyBadgeWarning: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    },
    warrantyBadgeExpired: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
    },
    warrantyBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#10B981',
    },
    receiptButton: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
