import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { VaultText as Text } from '../../components/common/VaultText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';
import { ModernHeader, PlatformIcon, PLATFORM_CONFIG } from '../../components/common';
import { openSellerContact, getSellerContactList } from '../../utils/contacts';
import { GameCard } from '../../components/games';
import { SellerFormModal } from '../../components/sellers';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useVaultSync } from '../../context/VaultSyncContext';
import {
  ShieldCheck,
  Star,
  Copy,
  Check,
  Pencil,
  FileText,
  Plus,
  ExternalLink,
  Trash2,
} from 'lucide-react-native';

export default function SellerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const vaultSync = useVaultSync();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadData = () => {
    if (!id) return;
    const allSellers = OfflineVault.getSellers();
    const foundSeller = allSellers.find((s) => s.id === id);
    if (foundSeller) {
      setSeller(foundSeller);
      const allGames = OfflineVault.getGames();
      const sellerGames = allGames.filter((g) => g.seller_id === id);
      setGames(sellerGames);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!seller) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>{t('sellerNotFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>{t('btnGoBack')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const contacts = getSellerContactList(seller);

  const copyContact = async (value: string, contactId: string) => {
    await Clipboard.setStringAsync(value);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedId(contactId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSeller = (sellerData: {
    name: string;
    contact_platform: any;
    contact_link: string;
    contact_methods: any[];
    reputation_score: number;
    notes?: string;
  }) => {
    const updated = OfflineVault.updateSeller(seller.id, sellerData);
    if (updated) {
      setSeller(updated);
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setEditModalVisible(false);
  };



  const handleDeleteSeller = () => {
    if (!seller) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    const message =
      games.length > 0
        ? t('confirmDeleteSellerWithGamesWarning', { count: games.length })
        : t('confirmDeleteSellerDesc', { name: seller.name });

    Alert.alert(
      t('confirmDeleteSellerTitle'),
      message,
      [
        { text: t('btnCancel'), style: 'cancel' },
        {
          text: t('btnDelete'),
          style: 'destructive',
          onPress: () => {
            if (vaultSync) {
              vaultSync.deleteSeller(seller.id);
            } else {
              OfflineVault.deleteSeller(seller.id);
            }
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            router.replace('/(tabs)/sellers');
          },
        },
      ]
    );
  };

  const lockedGamesCount = games.filter((g) => g.status === 'Locked').length;
  const activeWarrantiesCount = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  }).length;

  return (
    <View style={styles.container}>
      {/* MODERN HEADER WITH BACK AND ACTION BUTTONS */}
      <ModernHeader
        title={t('sellerProfileTitle')}
        subtitle={seller.name}
        showBackButton={true}
        rightAction={
          <View style={[styles.headerActionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setEditModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.headerCircleBtnPressed]}
            >
              <Pencil size={18} color={styles.accentIcon.color} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={handleDeleteSeller}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                styles.headerDeleteBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
            </Pressable>
          </View>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* SELLER HERO CARD */}
        <View style={styles.heroCard}>
          {/* AVATAR */}
          <View style={styles.avatarCircle}>
            <ShieldCheck size={38} color={styles.accentIcon.color} strokeWidth={2} />
          </View>

          <Text style={styles.sellerName}>{seller.name}</Text>

          {/* BADGES ROW */}
          <View style={[styles.heroBadgesRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.channelCountBadge}>
              <Text style={styles.channelCountText}>
                {contacts.length} {contacts.length === 1 ? t('channelCountSingular') : t('channelCountPlural')}
              </Text>
            </View>

            <View style={[styles.ratingBadge, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {seller.reputation_score.toFixed(1)} / 5.0
              </Text>
            </View>
          </View>
        </View>

        {/* CONNECTION METHODS CARD */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('connectWithSeller')} ({contacts.length})
            </Text>
            <Pressable onPress={() => setEditModalVisible(true)} style={[styles.addMethodBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Plus size={13} color={styles.accentIcon.color} strokeWidth={2.4} />
              <Text style={styles.addMethodText}>{t('btnAddSellerMethod')}</Text>
            </Pressable>
          </View>

          <View style={styles.contactsList}>
            {contacts.map((contact, index) => {
              const cfg = PLATFORM_CONFIG[contact.platform] || PLATFORM_CONFIG.Other;
              const isCopied = copiedId === (contact.id || `${index}`);

              return (
                <View key={contact.id || index} style={styles.contactItem}>
                  <View style={[styles.contactTopRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={[styles.contactInfoRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                      <View style={[styles.platformIconCircle, { backgroundColor: cfg.bgTint }]}>
                        <PlatformIcon platform={contact.platform} size={18} color={cfg.defaultColor} />
                      </View>
                      <View style={styles.contactDetailsCol}>
                        <View style={[styles.platformNameRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                          <Text style={[styles.platformName, isRTL && styles.rtlText]}>{contact.platform}</Text>
                          {contact.label && (
                            <View style={[styles.contactLabelBadge, { backgroundColor: `${cfg.defaultColor}20` }]}>
                              <Text style={[styles.contactLabelText, { color: cfg.defaultColor }]}>
                                {contact.label}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.contactValue, isRTL && styles.rtlText]} numberOfLines={1}>
                          {contact.value}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => copyContact(contact.value, contact.id || `${index}`)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={[styles.copyBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}
                    >
                      {isCopied ? (
                        <Check size={11} color={styles.successColor.color} strokeWidth={2.4} />
                      ) : (
                        <Copy size={11} color={styles.mutedText.color} strokeWidth={2.2} />
                      )}
                      <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                        {isCopied ? t('btnCopied') : t('btnCopy')}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => openSellerContact(contact.platform, contact.value)}
                    style={({ pressed }) => [
                      styles.openChatBtn,
                      isNativeRTL && { flexDirection: 'row-reverse' },
                      { backgroundColor: pressed ? `${cfg.defaultColor}CC` : cfg.defaultColor },
                    ]}
                  >
                    <PlatformIcon platform={contact.platform} size={14} color="#FFFFFF" />
                    <Text style={styles.openChatText}>
                      {t('openChatWithPlatform', { platform: contact.platform })}
                    </Text>
                    <ExternalLink size={12} color="#FFFFFF" strokeWidth={2.2} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* SELLER NOTES & POLICIES CARD */}
        <View style={styles.sectionCard}>
          <View style={[styles.notesHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.notesTitleGroup, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <FileText size={15} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('sellerGuaranteeNotes')}
              </Text>
            </View>

            <Pressable onPress={() => setEditModalVisible(true)} style={[styles.editNotesBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Pencil size={12} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={styles.editNotesText}>{t('btnEdit')}</Text>
            </Pressable>
          </View>

          {seller.notes ? (
            <View style={styles.notesTextBox}>
              <Text style={[styles.notesContent, isRTL && styles.rtlText]}>{seller.notes}</Text>
            </View>
          ) : (
            <Pressable onPress={() => setEditModalVisible(true)} style={styles.emptyNotesBox}>
              <Text style={[styles.emptyNotesText, isRTL && styles.rtlText]}>
                {t('sellerNotesEmptyHint')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* METRICS ROW */}
        <View style={[styles.metricsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t('metricVaultTotal')}</Text>
            <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{games.length}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, styles.metricLabelSuccess, isRTL && styles.rtlText]}>{t('activeWarranties')}</Text>
            <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{activeWarrantiesCount}</Text>
          </View>

          <View
            style={[
              styles.metricCard,
              lockedGamesCount > 0 ? styles.metricCardDanger : undefined,
            ]}
          >
            <Text
              style={[
                styles.metricLabel,
                lockedGamesCount > 0 && styles.metricLabelDanger,
                isRTL && styles.rtlText,
              ]}
            >
              {t('lockedClaims')}
            </Text>
            <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{lockedGamesCount}</Text>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.gamesSectionHeader}>
          <Text style={[styles.gamesSectionTitle, isRTL && styles.rtlText]}>
            {t('sellerGamesTitle')} ({games.length})
          </Text>
          <Text style={[styles.gamesSectionSubtitle, isRTL && styles.rtlText]}>
            {t('sellerGamesSubtitle')}
          </Text>
        </View>

        {/* GAMES LIST (USING REUSABLE GameCard) */}
        {games.length === 0 ? (
          <View style={styles.emptyGamesBox}>
            <Text style={styles.emptyGamesText}>{t('noGamesFromSeller')}</Text>
          </View>
        ) : (
          games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                router.push(`/game/${game.id}`);
              }}
            />
          ))
        )}

        {/* DANGER ZONE / DELETE SELLER */}
        <View style={styles.dangerSection}>
          <Pressable
            onPress={handleDeleteSeller}
            style={({ pressed }) => [
              styles.deleteSellerBtn,
              pressed && styles.deleteSellerBtnPressed,
              isNativeRTL && { flexDirection: 'row-reverse' },
            ]}
          >
            <Trash2 size={16} color="#EF4444" strokeWidth={2.2} />
            <Text style={styles.deleteSellerBtnText}>{t('btnDeleteSeller')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* REUSABLE SELLER FORM MODAL */}
      <SellerFormModal
        visible={editModalVisible}
        initialSeller={seller}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveSeller}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    notFoundContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notFoundText: {
      color: colors.text,
      fontSize: 16,
    },
    goBackBtn: {
      marginTop: 12,
    },
    goBackText: {
      color: colors.accent,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    accentIcon: {
      color: colors.accent,
    },
    successColor: {
      color: colors.success,
    },
    mutedText: {
      color: colors.textSecondary,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerCircleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.18)',
      elevation: 4,
    },
    headerCircleBtnPressed: {
      opacity: 0.8,
    },
    headerDeleteBtn: {
      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      boxShadow: theme === 'dark' ? '0px 2px 8px rgba(0, 0, 0, 0.25)' : '0px 2px 8px rgba(0, 0, 0, 0.05)',
      elevation: 3,
    },
    avatarCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.accent,
      marginBottom: 12,
    },
    sellerName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    heroBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    channelCountBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    channelCountText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    ratingBadge: {
      backgroundColor: 'rgba(255, 215, 0, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#FFD700',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    ratingText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 18,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 2px 6px rgba(0, 0, 0, 0.2)' : '0px 2px 6px rgba(0, 0, 0, 0.04)',
      elevation: 2,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    addMethodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addMethodText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    contactsList: {
      gap: 10,
    },
    contactItem: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contactInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    platformIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactDetailsCol: {
      flex: 1,
    },
    platformNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    platformName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    contactLabelBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    contactLabelText: {
      fontSize: 10,
      fontWeight: '800',
    },
    contactValue: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    copyBtn: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      marginLeft: 6,
    },
    copyBtnText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    copyBtnTextSuccess: {
      color: colors.success,
    },
    openChatBtn: {
      marginTop: 10,
      paddingVertical: 9,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    openChatText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 12,
    },
    notesHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    notesTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editNotesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    editNotesText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    notesTextBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesContent: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    emptyNotesBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    emptyNotesText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricCardDanger: {
      backgroundColor: theme === 'dark' ? '#261014' : '#FEF2F2',
      borderColor: colors.danger,
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    metricLabelSuccess: {
      color: colors.success,
    },
    metricLabelDanger: {
      color: colors.danger,
    },
    metricValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 4,
    },
    gamesSectionHeader: {
      marginTop: 24,
      marginBottom: 12,
    },
    gamesSectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    gamesSectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    emptyGamesBox: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyGamesText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    rtlText: {
      textAlign: 'right',
    },
    dangerSection: {
      marginTop: 28,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    deleteSellerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
      borderRadius: 14,
      paddingVertical: 14,
    },
    deleteSellerBtnPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    deleteSellerBtnText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '700',
    },
  });
