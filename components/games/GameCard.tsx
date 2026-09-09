import { View, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import { Gamepad2, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Game } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';

interface GameCardProps {
  game: Game;
  sellerName?: string;
  onPress: () => void;
  onSellerPress?: () => void;
}

export function GameCard({ game, sellerName, onPress, onSellerPress }: GameCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const isLocked = game.status === 'Locked';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLocked && styles.cardLocked,
        isNativeRTL && { flexDirection: 'row-reverse' },
        pressed && styles.cardPressed,
      ]}
    >
      {/* THUMBNAIL */}
      {game.cover_image_url ? (
        <Image source={{ uri: game.cover_image_url }} style={styles.coverImage} />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Gamepad2 size={24} color={styles.placeholderIcon.color} strokeWidth={1.8} />
        </View>
      )}

      {/* DETAILS */}
      <View style={[styles.details, isRTL ? { marginRight: 14, marginLeft: 0 } : { marginLeft: 14 }]}>
        <Text style={[styles.title, isRTL && styles.rtlText]} numberOfLines={1}>
          {game.title}
        </Text>

        {/* PILLS */}
        <View style={[styles.pillRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <View
            style={[
              styles.typeBadge,
              game.account_type === 'Primary'
                ? styles.primaryBadge
                : game.account_type === 'Full'
                ? styles.fullBadge
                : styles.secondaryBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                game.account_type === 'Primary'
                  ? styles.primaryText
                  : game.account_type === 'Full'
                  ? styles.fullText
                  : styles.secondaryText,
              ]}
            >
              {game.account_type === 'Primary'
                ? t('accountTypePrimary')
                : game.account_type === 'Full'
                ? t('accountTypeFull')
                : t('accountTypeSecondary')}
            </Text>
          </View>

          {/* PLATFORM BADGE */}
          <View
            style={[
              styles.platformBadge,
              game.platform === 'PS4'
                ? styles.platformBadgePS4
                : game.platform === 'BOTH'
                ? styles.platformBadgeBoth
                : styles.platformBadgePS5,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                game.platform === 'PS4'
                  ? styles.platformTextPS4
                  : game.platform === 'BOTH'
                  ? styles.platformTextBoth
                  : styles.platformTextPS5,
              ]}
            >
              {game.platform === 'BOTH' ? 'PS4 • PS5' : game.platform || 'PS5'}
            </Text>
          </View>

          {/* PRICE BADGE (INLINE) */}
          {game.cost_price !== undefined && game.cost_price > 0 ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>
                {formatCurrency(game.cost_price, game.currency || currency)}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.statusBadge,
              isLocked
                ? styles.statusLocked
                : game.status === 'Active'
                ? styles.statusActive
                : styles.statusWarning,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isLocked
                  ? styles.statusLockedText
                  : game.status === 'Active'
                  ? styles.statusActiveText
                  : styles.statusWarningText,
              ]}
            >
              {game.status === 'Active' ? t('statusActive') : game.status === 'Locked' ? t('statusLocked') : game.status}
            </Text>
          </View>
        </View>

        {/* WARRANTY & SELLER LINK */}
        <View style={styles.warrantyContainer}>
          <Text style={[styles.warrantyText, isRTL && styles.rtlText]}>
            {warranty.isWarrantyActive ? (
              <>
                {t('warrantyLabel')}{' '}
                <Text
                  style={[
                    styles.warrantyHighlight,
                    warranty.isExpiringSoon ? styles.warrantyExpiring : styles.warrantyGood,
                  ]}
                >
                  {warranty.isLifetime
                    ? t('warrantyLifetime')
                    : t('warrantyExpiringGood', { days: warranty.daysRemaining })}
                </Text>
              </>
            ) : (
              <Text style={styles.warrantyExpired}>{t('warrantyExpiredText')}</Text>
            )}
          </Text>

          {sellerName && (
            <Pressable
              onPress={(e) => {
                if (onSellerPress) {
                  e.stopPropagation();
                  onSellerPress();
                }
              }}
              style={[styles.sellerLink, isNativeRTL && { flexDirection: 'row-reverse' }]}
            >
              <Text style={[styles.sellerName, isRTL && styles.rtlText]}>
                <Text>{t('sellerLabelPrefix')} </Text>
                <Text>{sellerName}</Text>
              </Text>
              {isRTL ? (
                <ChevronLeft size={11} color={styles.sellerChevron.color} strokeWidth={2.4} />
              ) : (
                <ChevronRight size={11} color={styles.sellerChevron.color} strokeWidth={2.4} />
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* CIRCULAR ARROW ACTION */}
      <View style={[styles.arrowCircle, isRTL ? { marginRight: 10, marginLeft: 0 } : { marginLeft: 10 }]}>
        {isRTL ? (
          <ChevronLeft size={16} color={styles.arrowIcon.color} strokeWidth={2.4} />
        ) : (
          <ChevronRight size={16} color={styles.arrowIcon.color} strokeWidth={2.4} />
        )}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    rtlText: {
      textAlign: 'right',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      boxShadow: theme === 'dark' ? '0px 2px 6px rgba(0, 0, 0, 0.25)' : '0px 2px 6px rgba(0, 0, 0, 0.05)',
      elevation: 2,
    },
    cardLocked: {
      borderColor: colors.danger,
    },
    cardPressed: {
      backgroundColor: colors.surfaceElevated,
    },
    coverImage: {
      width: 62,
      height: 82,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
    },
    coverPlaceholder: {
      width: 62,
      height: 82,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderIcon: {
      color: colors.textMuted,
    },
    details: {
      flex: 1,
      marginLeft: 14,
    },
    title: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 15,
    },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    typeBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    primaryBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
    },
    secondaryBadge: {
      backgroundColor: 'rgba(147, 51, 234, 0.15)',
    },
    fullBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    primaryText: {
      color: '#0070D1',
    },
    secondaryText: {
      color: '#9333EA',
    },
    fullText: {
      color: '#F59E0B',
    },
    platformBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    platformBadgePS5: {
      backgroundColor: 'rgba(0, 210, 255, 0.15)',
    },
    platformTextPS5: {
      color: '#00D2FF',
    },
    platformBadgePS4: {
      backgroundColor: 'rgba(0, 112, 209, 0.18)',
    },
    platformTextPS4: {
      color: '#0070D1',
    },
    platformBadgeBoth: {
      backgroundColor: 'rgba(168, 85, 247, 0.18)',
    },
    platformTextBoth: {
      color: '#A855F7',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    statusActive: {
      backgroundColor: theme === 'dark' ? 'rgba(48, 209, 88, 0.2)' : '#ECFDF5',
    },
    statusActiveText: {
      color: colors.success,
    },
    statusLocked: {
      backgroundColor: theme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : '#FEE2E2',
    },
    statusLockedText: {
      color: colors.danger,
    },
    statusWarning: {
      backgroundColor: 'rgba(255, 159, 10, 0.2)',
    },
    statusWarningText: {
      color: colors.warning,
    },
    warrantyContainer: {
      marginTop: 6,
    },
    warrantyText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    warrantyHighlight: {
      fontWeight: '800',
    },
    warrantyGood: {
      color: colors.success,
    },
    warrantyExpiring: {
      color: colors.warning,
    },
    warrantyExpired: {
      color: colors.textMuted,
    },
    sellerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 2,
    },
    sellerName: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    sellerChevron: {
      color: colors.accent,
    },
    arrowCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    arrowIcon: {
      color: colors.text,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    priceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
    },
    priceBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#10B981',
    },
  });
