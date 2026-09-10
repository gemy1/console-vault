import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { VaultText as Text } from '../common/VaultText';
import {
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
  onPress,
  onSellSlot,
}: SellerInventoryCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const platform = game.platform || 'PS5';

  const activeAllocations = allocations.filter(
    (a) => a.game_id === game.id && a.status === 'Active'
  );

  const potentialSlots = getGamePotentialSlots(game.platform, game.account_type);
  const displaySlots = getGameDisplaySlots(game, activeAllocations);

  const totalSlots = potentialSlots.length;
  const soldSlots = activeAllocations.length;
  const freeSlots = displaySlots.filter(
    (slot) => !activeAllocations.find((a) => a.slot_type === slot)
  );
  const isSoldOut = freeSlots.length === 0;

  const totalCost = game.cost_price || 0;
  const totalSales = activeAllocations.reduce((sum, a) => sum + (a.sale_price || 0), 0);
  const netProfit = totalSales - totalCost;
  const isProfitable = netProfit > 0;
  const hasAnyRevenue = totalSales > 0;
  const recoveryPct = totalCost > 0 ? Math.min(100, Math.round((totalSales / totalCost) * 100)) : 100;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* ── MAIN ROW ── */}
      <View style={[styles.mainRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>

        {/* COVER */}
        {game.cover_image_url ? (
          <Image
            source={{ uri: game.cover_image_url }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Gamepad2 size={22} color={styles.placeholderIcon.color} strokeWidth={1.8} />
          </View>
        )}

        {/* INFO */}
        <View style={[styles.info, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.title, isRTL && styles.rtlText]} numberOfLines={1}>
            {game.title}
          </Text>

          {/* Platform badge + email */}
          <View style={[styles.metaRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[
              styles.platformBadge,
              platform === 'PS4' ? styles.badgePS4 : platform === 'BOTH' ? styles.badgeBoth : styles.badgePS5,
            ]}>
              <Text style={[
                styles.platformText,
                platform === 'PS4' ? styles.platformTextPS4 : platform === 'BOTH' ? styles.platformTextBoth : styles.platformTextPS5,
              ]}>
                {platform === 'BOTH' ? 'PS4·PS5' : platform}
              </Text>
            </View>
            {game.psn_email ? (
              <Text style={styles.email} numberOfLines={1}>{game.psn_email}</Text>
            ) : null}
          </View>

          {/* Dot matrix */}
          <View style={[styles.dotRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {potentialSlots.map((slot, i) => {
              const isSold = !!activeAllocations.find((a) => a.slot_type === slot);
              return (
                <View key={slot + i} style={[styles.dot, isSold ? styles.dotSold : styles.dotFree]} />
              );
            })}
            <Text style={[styles.slotSummary, isRTL && styles.rtlText]}>
              {isRTL ? `مباع ${soldSlots} / ${totalSlots}` : `${soldSlots} / ${totalSlots} sold`}
            </Text>
          </View>
        </View>

        {/* RIGHT: profit + action */}
        <View style={styles.rightCol}>
          {hasAnyRevenue ? (
            <Text style={[styles.profit, isProfitable ? styles.profitPos : styles.profitNeg]}>
              {isProfitable ? '+' : ''}{formatCurrency(netProfit, currency)}
            </Text>
          ) : (
            <Text style={styles.noSales}>{isRTL ? 'لا مبيعات' : 'No sales'}</Text>
          )}

          {isSoldOut ? (
            <View style={[styles.soldOutBadge, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <CheckCircle2 size={10} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.soldOutText}>{isRTL ? 'مكتمل' : 'Full'}</Text>
            </View>
          ) : (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                onSellSlot(game, freeSlots[0]);
              }}
              style={({ pressed }) => [styles.sellBtn, isNativeRTL && { flexDirection: 'row-reverse' }, pressed && styles.sellBtnPressed]}
            >
              <Plus size={12} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.sellBtnText}>{t('btnSellSlot')}</Text>
            </Pressable>
          )}
        </View>

        {/* CHEVRON */}
        <View style={[styles.chevronWrap, isRTL && { paddingLeft: 0, paddingRight: 2 }]}>
          {isRTL
            ? <ChevronLeft size={16} color={styles.chevronIcon.color} strokeWidth={2} />
            : <ChevronRight size={16} color={styles.chevronIcon.color} strokeWidth={2} />
          }
        </View>
      </View>

      {/* ── THIN RECOVERY BAR ── */}
      {hasAnyRevenue && (
        <View style={styles.barWrap}>
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${recoveryPct}%` },
                isProfitable && styles.barFillGreen,
              ]}
            />
          </View>
        </View>
      )}
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

    cover: {
      width: 48,
      height: 48,
      borderRadius: 11,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      flexShrink: 0,
    },
    coverPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 11,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    placeholderIcon: {
      color: colors.textMuted,
    },

    info: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.1,
    },
    rtlText: {
      textAlign: 'right',
    },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    platformBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 5,
      flexShrink: 0,
    },
    badgePS5: {
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : '#ECFEFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.28)' : '#CFFAFE',
    },
    badgePS4: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.28)' : '#DBEAFE',
    },
    badgeBoth: {
      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.14)' : '#FAF5FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168, 85, 247, 0.28)' : '#F3E8FF',
    },
    platformText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    platformTextPS5: { color: isDark ? '#22D3EE' : '#0891B2' },
    platformTextPS4: { color: isDark ? '#60A5FA' : '#2563EB' },
    platformTextBoth: { color: isDark ? '#C084FC' : '#9333EA' },
    email: {
      fontSize: 11,
      color: colors.textMuted,
      flex: 1,
    },

    dotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    dotSold: {
      backgroundColor: '#10B981',
    },
    dotFree: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    },
    slotSummary: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginLeft: 2,
    },

    rightCol: {
      alignItems: 'flex-end',
      gap: 6,
      flexShrink: 0,
    },
    profit: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    profitPos: { color: '#10B981' },
    profitNeg: { color: '#F59E0B' },
    noSales: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },

    soldOutBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
    },
    soldOutText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
    },

    sellBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 7,
      backgroundColor: '#0070D1',
    },
    sellBtnPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.95 }],
    },
    sellBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    chevronWrap: {
      paddingLeft: 2,
      flexShrink: 0,
    },
    chevronIcon: {
      color: colors.textMuted,
    },

    barWrap: {
      marginTop: 10,
    },
    barBg: {
      height: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      borderRadius: 2,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: '#F59E0B',
      borderRadius: 2,
    },
    barFillGreen: {
      backgroundColor: '#10B981',
    },
  });
};
