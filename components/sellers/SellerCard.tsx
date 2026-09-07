import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import { ShieldCheck, Star, ChevronRight, ChevronLeft, Pencil, FileText } from 'lucide-react-native';
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
  onEdit: () => void;
}

export function SellerCard({ seller, gamesCount, onPress, onEdit }: SellerCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const contacts = getSellerContactList(seller);
  const primaryContact = contacts[0] || { platform: seller.contact_platform, value: seller.contact_link };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* TOP ROW: ICON, NAME, EDIT, RATING */}
      <View style={[styles.topRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.sellerInfoRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={22} color={styles.accentColor.color} strokeWidth={2} />
          </View>

          <View style={[styles.nameBlock, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12 }]}>
            <Text style={[styles.sellerName, isRTL && styles.rtlText]} numberOfLines={1}>
              {seller.name}
            </Text>

            <View style={[styles.badgeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {gamesCount} {gamesCount === 1 ? t('gameCountSingular') : t('gameCountPlural')}
                </Text>
              </View>

              <View style={styles.channelBadge}>
                <Text style={styles.channelBadgeText}>
                  {contacts.length} {contacts.length === 1 ? t('channelCountSingularBadge') : t('channelCountPluralBadge')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* RIGHT SIDE: EDIT BUTTON & STAR RATING */}
        <View style={[styles.actionsRight, isNativeRTL && { flexDirection: 'row-reverse' }]}>
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

          <View style={styles.ratingBadge}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {seller.reputation_score.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* CONNECTION METHODS PILLS */}
      <View style={styles.connectionSection}>
        <Text style={[styles.sectionHeader, isRTL && styles.rtlText]}>{t('connectionMethodsLabel')}</Text>
        <View style={styles.methodsWrap}>
          {contacts.map((method, idx) => {
            const cfg = PLATFORM_CONFIG[method.platform] || PLATFORM_CONFIG.Other;
            return (
              <Pressable
                key={method.id || idx}
                onPress={(e) => {
                  e.stopPropagation();
                  openSellerContact(method.platform, method.value);
                }}
                style={[
                  styles.contactPill,
                  { backgroundColor: cfg.bgTint, borderColor: cfg.defaultColor },
                ]}
              >
                <PlatformIcon platform={method.platform} size={13} color={cfg.defaultColor} />
                <Text style={styles.contactHandle}>
                  {formatPlatformHandle(method.platform, method.value)}
                </Text>
                {method.label && (
                  <Text style={styles.contactLabel}>({method.label})</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* FREE TEXT NOTES PREVIEW */}
      {seller.notes && (
        <View style={styles.notesBox}>
          <FileText size={13} color={styles.notesIcon.color} strokeWidth={2} style={styles.notesIconStyle} />
          <Text style={[styles.notesText, isRTL && styles.rtlText]} numberOfLines={2}>
            {seller.notes}
          </Text>
        </View>
      )}

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, isNativeRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.viewGamesRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.viewGamesText}>
            {t('viewGamesAndInfo', { count: gamesCount })}
          </Text>
          {isRTL ? (
            <ChevronLeft size={13} color={styles.accentColor.color} strokeWidth={2.4} />
          ) : (
            <ChevronRight size={13} color={styles.accentColor.color} strokeWidth={2.4} />
          )}
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (primaryContact) {
              openSellerContact(primaryContact.platform, primaryContact.value);
            }
          }}
          style={({ pressed }) => [
            styles.quickChatBtn,
            pressed && styles.quickChatBtnPressed,
          ]}
        >
          <PlatformIcon platform={primaryContact.platform} size={13} color={styles.quickChatText.color} />
          <Text style={styles.quickChatText}>{t('quickChatBtn')}</Text>
        </Pressable>
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
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 2px 6px rgba(0, 0, 0, 0.25)' : '0px 2px 6px rgba(0, 0, 0, 0.05)',
      elevation: 2,
    },
    cardPressed: {
      backgroundColor: colors.surfaceElevated,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sellerInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    accentColor: {
      color: colors.accent,
    },
    nameBlock: {
      flex: 1,
    },
    sellerName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    countBadge: {
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    countBadgeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    channelBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    channelBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
    },
    actionsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    editIcon: {
      color: colors.textSecondary,
    },
    ratingBadge: {
      backgroundColor: 'rgba(255, 215, 0, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 0.5,
      borderColor: '#FFD700',
    },
    ratingText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    connectionSection: {
      marginTop: 12,
    },
    sectionHeader: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    methodsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    contactPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 0.5,
    },
    contactHandle: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    contactLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '600',
    },
    notesBox: {
      marginTop: 10,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 10,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    notesIcon: {
      color: colors.textSecondary,
    },
    notesIconStyle: {
      marginTop: 2,
    },
    notesText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
      lineHeight: 16,
    },
    bottomBar: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewGamesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewGamesText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    quickChatBtn: {
      backgroundColor: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    quickChatBtnPressed: {
      opacity: 0.85,
    },
    quickChatText: {
      color: colors.bg,
      fontSize: 11,
      fontWeight: '800',
    },
  });
