import React from 'react';
import { View, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import {
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Plus,
  Share2,
  TrendingUp,
  User,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Game, ClientAllocation, Client, SlotType } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { getGamePotentialSlots, getGameDisplaySlots } from '../../utils/slots';

interface SellerInventoryCardProps {
  game: Game;
  allocations: ClientAllocation[];
  clientsMap: Record<string, Client>;
  onPress: () => void;
  onSellSlot: (game: Game, slotType?: SlotType) => void;
  onManageSlot: (allocation: ClientAllocation) => void;
  onDispatchWhatsApp: (allocation: ClientAllocation) => void;
}

export function SellerInventoryCard({
  game,
  allocations,
  clientsMap,
  onPress,
  onSellSlot,
  onManageSlot,
  onDispatchWhatsApp,
}: SellerInventoryCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const router = useRouter();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  // Potential slots gated by BOTH platform AND account_type
  const platform = game.platform || 'PS5';

  // Active allocations for this game
  const activeAllocations = allocations.filter(
    (a) => a.game_id === game.id && a.status === 'Active'
  );

  // Slots to display based on mutual exclusivity (Full disappears if individual sold)
  const displaySlots = getGameDisplaySlots(game, activeAllocations);

  // Check if a "Full" account allocation exists
  const fullAllocation = activeAllocations.find((a) => a.slot_type === 'Full');

  // Calculate totals
  const totalCost = game.cost_price || 0;
  const totalSales = activeAllocations.reduce((sum, a) => sum + (a.sale_price || 0), 0);
  const netProfit = totalSales - totalCost;
  const recoveryPercent = totalCost > 0 ? Math.min(100, Math.round((totalSales / totalCost) * 100)) : 100;
  const isProfitable = netProfit > 0;

  const getSlotLabel = (slot: SlotType) => {
    switch (slot) {
      case 'Primary_PS5':
        return t('slotPrimaryPS5');
      case 'Primary_PS4':
        return t('slotPrimaryPS4');
      case 'Secondary_PS5':
        return t('slotSecondaryPS5');
      case 'Secondary_PS4':
        return t('slotSecondaryPS4');
      case 'Secondary':
        return t('slotSecondary');
      case 'Full':
        return t('slotFull');
      default:
        return slot;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      {/* HEADER ROW */}
      <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
        {/* THUMBNAIL */}
        {game.cover_image_url ? (
          <Image source={{ uri: game.cover_image_url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Gamepad2 size={24} color={styles.placeholderIcon.color} strokeWidth={1.8} />
          </View>
        )}

        {/* TITLE & PLATFORM */}
        <View style={[styles.titleContainer, { marginHorizontal: 12 }, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.title, isRTL && styles.rtlText]} numberOfLines={1}>
            {game.title}
          </Text>

          {/* BADGES ROW */}
          <View style={[styles.badgeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {/* PLATFORM BADGE */}
            <View
              style={[
                styles.platformBadge,
                platform === 'PS4'
                  ? styles.platformBadgePS4
                  : platform === 'BOTH'
                  ? styles.platformBadgeBoth
                  : styles.platformBadgePS5,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  platform === 'PS4'
                    ? styles.platformTextPS4
                    : platform === 'BOTH'
                    ? styles.platformTextBoth
                    : styles.platformTextPS5,
                ]}
              >
                {platform === 'BOTH' ? 'PS4 • PS5' : platform}
              </Text>
            </View>

            {/* MASTER EMAIL PREVIEW */}
            <Text style={[styles.psnEmail, isRTL && styles.rtlText]} numberOfLines={1}>
              {game.psn_email}
            </Text>
          </View>
        </View>

        {/* CHEVRON */}
        <View style={styles.chevron}>
          {isRTL ? (
            <ChevronLeft size={20} color={styles.chevronIcon.color} />
          ) : (
            <ChevronRight size={20} color={styles.chevronIcon.color} />
          )}
        </View>
      </View>

      {/* FINANCIAL RECOVERY PROGRESS */}
      <View style={styles.financeSection}>
        <View style={[styles.financeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.financeCol, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={styles.financeLabel}>{t('costPrice')}</Text>
            <Text style={styles.costVal}>{formatCurrency(totalCost, game.currency || currency)}</Text>
          </View>

          <View style={[styles.financeCol, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={styles.financeLabel}>{t('totalSales')}</Text>
            <Text style={styles.salesVal}>{formatCurrency(totalSales, currency)}</Text>
          </View>

          <View style={[styles.financeCol, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={styles.financeLabel}>{t('netProfit')}</Text>
            <Text
              style={[
                styles.profitVal,
                isProfitable ? styles.profitValPositive : styles.profitValNegative,
              ]}
            >
              {isProfitable ? '+' : ''}
              {formatCurrency(netProfit, currency)}
            </Text>
          </View>
        </View>

        {/* RECOVERY BAR */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${recoveryPercent}%` },
              isProfitable && styles.progressBarFillProfitable,
            ]}
          />
        </View>
      </View>

      {/* DUAL-SLOT MATRIX */}
      <View style={styles.matrixContainer}>
        {fullAllocation ? (
          // FULL ACCOUNT SOLD
          <View
            style={[
              styles.slotCard,
              styles.slotCardSold,
              isNativeRTL && { flexDirection: 'row-reverse' },
            ]}
          >
            <View style={[styles.slotInfo, isRTL ? { marginLeft: 10, alignItems: 'flex-end' } : { marginRight: 10 }]}>
              <View style={[styles.slotHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.slotTypeName} numberOfLines={1}>{t('slotFull')}</Text>
                <View style={[styles.statusPill, styles.statusPillSold]}>
                  <Text style={styles.statusPillText}>{t('slotSold')}</Text>
                </View>
              </View>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (fullAllocation.client_id) {
                    router.push(`/client/${fullAllocation.client_id}`);
                  }
                }}
                style={[styles.clientRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
              >
                <User size={12} color="#94A3B8" />
                <Text style={[styles.clientNameText, { textDecorationLine: 'underline' }]} numberOfLines={1} ellipsizeMode="tail">
                  {clientsMap[fullAllocation.client_id]?.name || t('selectClient')}
                </Text>
                <Text style={styles.slotPriceText}>
                  • {formatCurrency(fullAllocation.sale_price, fullAllocation.currency || currency)}
                </Text>
              </Pressable>
            </View>

            {/* ACTION BUTTONS */}
            <View style={[styles.slotActions, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDispatchWhatsApp(fullAllocation);
                }}
                style={styles.actionIconBtn}
              >
                <Share2 size={16} color="#10B981" />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onManageSlot(fullAllocation);
                }}
                style={styles.manageBtn}
              >
                <Text style={styles.manageBtnText}>{t('manageSlot')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          // INDIVIDUAL SLOTS (Full has disappeared if any slot was sold)
          displaySlots.map((slot: SlotType) => {
            const allocation = activeAllocations.find((a) => a.slot_type === slot);
            const isSold = !!allocation;
            const client = isSold && allocation ? clientsMap[allocation.client_id] : null;

            return (
              <View
                key={slot}
                style={[
                  styles.slotCard,
                  isSold ? styles.slotCardSold : styles.slotCardAvailable,
                  isNativeRTL && { flexDirection: 'row-reverse' },
                ]}
              >
                <View style={[styles.slotInfo, isRTL ? { marginLeft: 10, alignItems: 'flex-end' } : { marginRight: 10 }]}>
                  <View
                    style={[styles.slotHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
                  >
                    <Text style={styles.slotTypeName} numberOfLines={1}>{getSlotLabel(slot)}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        isSold ? styles.statusPillSold : styles.statusPillAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          !isSold && styles.statusPillTextAvailable,
                        ]}
                      >
                        {isSold ? t('slotSold') : t('slotAvailable')}
                      </Text>
                    </View>
                  </View>

                  {isSold && allocation ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        if (allocation.client_id) {
                          router.push(`/client/${allocation.client_id}`);
                        }
                      }}
                      style={[styles.clientRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
                    >
                      <User size={12} color="#94A3B8" />
                      <Text style={[styles.clientNameText, { textDecorationLine: 'underline' }]} numberOfLines={1} ellipsizeMode="tail">
                        {client?.name || 'Client'}
                      </Text>
                      <Text style={styles.slotPriceText}>
                        • {formatCurrency(allocation.sale_price, allocation.currency || currency)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* ACTION BUTTON */}
                <View style={[styles.slotActions, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  {isSold && allocation ? (
                    <>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onDispatchWhatsApp(allocation);
                        }}
                        style={styles.actionIconBtn}
                      >
                        <Share2 size={16} color="#10B981" />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onManageSlot(allocation);
                        }}
                        style={styles.manageBtn}
                      >
                        <Text style={styles.manageBtnText}>{t('manageSlot')}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch {}
                        onSellSlot(game, slot);
                      }}
                      style={styles.sellBtn}
                    >
                      <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.sellBtnText}>{t('btnSellSlot')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
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
      marginBottom: 16,
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    coverImage: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    coverPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderIcon: {
      color: colors.textSecondary,
    },
    titleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
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
    platformBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    platformBadgePS5: {
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : '#ECFEFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.3)' : '#CFFAFE',
    },
    platformBadgePS4: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE',
    },
    platformBadgeBoth: {
      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#F3E8FF',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    platformTextPS5: {
      color: isDark ? '#22D3EE' : '#0891B2',
    },
    platformTextPS4: {
      color: isDark ? '#60A5FA' : '#2563EB',
    },
    platformTextBoth: {
      color: isDark ? '#C084FC' : '#9333EA',
    },
    psnEmail: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
    },
    chevron: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 4,
    },
    chevronIcon: {
      color: colors.textMuted,
    },
    financeSection: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    financeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    financeCol: {
      flex: 1,
    },
    financeLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    costVal: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    salesVal: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    profitVal: {
      fontSize: 13,
      fontWeight: '700',
    },
    profitValPositive: {
      color: '#10B981',
    },
    profitValNegative: {
      color: '#F59E0B',
    },
    progressBarBg: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#F59E0B',
      borderRadius: 2,
    },
    progressBarFillProfitable: {
      backgroundColor: '#10B981',
    },
    matrixContainer: {
      gap: 8,
    },
    slotCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    slotCardAvailable: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    slotCardSold: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.04)' : '#F0FDF4',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
    },
    slotInfo: {
      flex: 1,
    },
    slotHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    slotTypeName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    statusPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      flexShrink: 0,
    },
    statusPillSold: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
    },
    statusPillAvailable: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#10B981',
    },
    statusPillTextAvailable: {
      color: '#3B82F6',
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    clientNameText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      maxWidth: 110,
    },
    slotPriceText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
      flexShrink: 0,
    },
    freeSlotSub: {
      fontSize: 11,
      color: colors.textMuted,
    },
    slotActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    actionIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    manageBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    manageBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
    },
    sellBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#0070D1',
    },
    sellBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
};
