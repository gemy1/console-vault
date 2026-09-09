import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { VaultText as Text } from '../../components/common/VaultText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '@/utils/haptics';
import { OfflineVault } from '../../services/storage';
import { Client, ClientAllocation, Game, SlotType } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';
import { ModernHeader } from '../../components/common';
import { ClientFormModal } from '../../components/seller/ClientFormModal';
import { SlotAllocationModal } from '../../components/seller/SlotAllocationModal';
import { WhatsAppDispatchModal } from '../../components/seller/WhatsAppDispatchModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode, useVaultTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { useVaultSync } from '../../context/VaultSyncContext';
import { useCustomAlert } from '../../context/AlertContext';
import {
  User,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Pencil,
  Trash2,
  Share2,
  Gamepad2,
  ShieldCheck,
  Clock,
  ChevronRight,
  ChevronLeft,
  Coins,
  FileText,
  SlidersHorizontal,
  Crown,
  Sparkles,
  Layers,
} from 'lucide-react-native';

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { colors } = useVaultTheme();
  const { t, isRTL } = useLanguage();
  const { formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const { clients, allocations: syncAllocations, games, updateClient, deleteClient: syncDeleteClient } = useVaultSync();
  const { showAlert } = useCustomAlert();

  const [copiedContact, setCopiedContact] = useState(false);

  // Modals state
  const [editClientModalVisible, setEditClientModalVisible] = useState(false);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchAllocation, setDispatchAllocation] = useState<ClientAllocation | null>(null);
  const [dispatchGame, setDispatchGame] = useState<Game | null>(null);

  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotModalGame, setSlotModalGame] = useState<Game | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<ClientAllocation | null>(null);

  const client = useMemo(() => {
    return clients.find((c) => c.id === id) || null;
  }, [clients, id]);

  const allocations = useMemo(() => {
    return syncAllocations.filter((a) => a.client_id === id);
  }, [syncAllocations, id]);

  const gamesMap = useMemo(() => {
    const map: Record<string, Game> = {};
    games.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [games]);

  if (!client) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <User size={48} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.notFoundTitle}>{t('clientNotFound')}</Text>
        <Text style={styles.notFoundText}>{t('clientNotFoundDesc')}</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.goBackBtn}
        >
          <Text style={styles.goBackText}>{t('btnGoBack')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Metrics
  const totalSpent = allocations.reduce((sum, a) => sum + (a.sale_price || 0), 0);
  
  const activeWarrantiesCount = allocations.filter((a) => {
    const w = calculateWarranty(a.sale_date, a.warranty_months);
    return w.isWarrantyActive;
  }).length;

  const isVip = allocations.length >= 3;
  const isRegular = allocations.length >= 1 && !isVip;

  // Copy Contact Info
  const handleCopyContact = async () => {
    if (!client.contact_link) return;
    await Clipboard.setStringAsync(client.contact_link);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedContact(true);
    setTimeout(() => setCopiedContact(false), 2000);
  };

  // Direct WhatsApp Launch
  const handleOpenWhatsApp = () => {
    if (!client.contact_link) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const cleanNum = client.contact_link.replace(/[^0-9]/g, '');
    const url = cleanNum ? `https://wa.me/${cleanNum}` : client.contact_link;
    Linking.openURL(url).catch(() => {});
  };

  // Edit Client
  const handleSaveClient = (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    updateClient(client.id, clientData);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setEditClientModalVisible(false);
  };

  // Delete Client
  const handleDeleteClient = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    showAlert({
      title: t('confirmDeleteClientTitle'),
      message: t('confirmDeleteClientDesc', { name: client.name }),
      type: 'danger',
      buttons: [
        {
          text: t('deleteClient'),
          style: 'destructive',
          onPress: () => {
            syncDeleteClient(client.id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            router.back();
          },
        },
        { text: t('btnCancel'), style: 'cancel' },
      ],
    });
  };

  // Dispatch WhatsApp for an allocation
  const handleOpenDispatch = (alloc: ClientAllocation) => {
    const game = gamesMap[alloc.game_id];
    if (!game) return;
    setDispatchGame(game);
    setDispatchAllocation(alloc);
    setDispatchModalVisible(true);
  };

  // Manage / Unsell slot allocation
  const handleManageSlot = (alloc: ClientAllocation) => {
    const game = gamesMap[alloc.game_id];
    if (!game) return;
    setSlotModalGame(game);
    setSelectedAllocation(alloc);
    setSlotModalVisible(true);
  };

  const getAllocPlatform = (slotType: SlotType, gamePlatform?: string): 'PS5' | 'PS4' | 'BOTH' => {
    if (slotType.includes('PS5')) return 'PS5';
    if (slotType.includes('PS4')) return 'PS4';
    if (gamePlatform === 'BOTH') return 'BOTH';
    return (gamePlatform as 'PS5' | 'PS4') || 'PS5';
  };

  const getSlotTypeLabel = (slotType: SlotType): string => {
    switch (slotType) {
      case 'Primary_PS5':
      case 'Primary_PS4':
        return t('filterPrimary');
      case 'Secondary_PS5':
      case 'Secondary_PS4':
      case 'Secondary':
        return t('slotSecondary');
      case 'Full':
        return t('slotFull');
      default:
        return (slotType as string).replace('_', ' ');
    }
  };

  return (
    <View style={styles.container}>
      {/* MODERN HEADER */}
      <ModernHeader
        title={client.name}
        subtitle={t('headerClientDetailsSubtitle')}
        showBackButton={true}
        rightAction={
          <View style={[styles.headerActionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setEditClientModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Pencil size={17} color={colors.accent} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={handleDeleteClient}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                styles.headerDeleteBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Trash2 size={17} color="#EF4444" strokeWidth={2.2} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CLIENT CARD */}
        <View style={styles.heroCard}>
          {/* AVATAR */}
          <View style={styles.avatarGlow}>
            <View style={styles.avatarCircle}>
              <User size={38} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </View>

          <Text style={styles.clientTitle}>{client.name}</Text>

          {/* TIER & PLATFORM BADGES */}
          <View style={[styles.heroBadgesRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {isVip ? (
              <View style={[styles.tierBadge, styles.tierBadgeVip, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Crown size={13} color="#F59E0B" strokeWidth={2.4} />
                <Text style={styles.tierTextVip}>{t('clientTierVip')}</Text>
              </View>
            ) : isRegular ? (
              <View style={[styles.tierBadge, styles.tierBadgeRegular, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Sparkles size={13} color="#10B981" strokeWidth={2.4} />
                <Text style={styles.tierTextRegular}>{t('clientTierRegular')}</Text>
              </View>
            ) : (
              <View style={[styles.tierBadge, styles.tierBadgeNew]}>
                <Text style={styles.tierTextNew}>{t('clientTierNew')}</Text>
              </View>
            )}

            <View style={styles.platformBadge}>
              <Text style={styles.platformBadgeText}>{client.contact_platform || 'WhatsApp'}</Text>
            </View>
          </View>

          {/* QUICK CONTACT ACTION BAR */}
          {client.contact_link ? (
            <View style={[styles.contactCardRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Pressable
                onPress={handleCopyContact}
                style={[styles.contactNumberBlock, isNativeRTL && { flexDirection: 'row-reverse' }]}
              >
                <Phone size={14} color={colors.textMuted} />
                <Text style={styles.contactNumberText} numberOfLines={1}>
                  {client.contact_link}
                </Text>
                {copiedContact ? (
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                ) : (
                  <Copy size={13} color={colors.textMuted} />
                )}
              </Pressable>

              <Pressable
                onPress={handleOpenWhatsApp}
                style={({ pressed }) => [
                  styles.whatsappDirectBtn,
                  isNativeRTL && { flexDirection: 'row-reverse' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MessageCircle size={15} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.whatsappDirectText}>
                  {isRTL ? 'واتساب' : 'WhatsApp'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* METRICS ROW (3-CARD GRID) */}
        <View style={[styles.metricsGrid, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          {/* TOTAL SPENT */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Coins size={16} color="#10B981" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel}>{t('totalSpent')}</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>

          {/* SLOTS OWNED */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(0, 112, 209, 0.12)' }]}>
              <Layers size={16} color="#0070D1" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel}>{t('totalSlotsPurchased')}</Text>
            <Text style={styles.metricValue}>{allocations.length}</Text>
          </View>

          {/* ACTIVE WARRANTIES */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <ShieldCheck size={16} color="#3B82F6" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel}>{t('activeWarranties')}</Text>
            <Text style={styles.metricValue}>{activeWarrantiesCount}</Text>
          </View>
        </View>

        {/* CLIENT NOTES (IF RECORDED) */}
        {client.notes ? (
          <View style={styles.notesCard}>
            <View style={[styles.notesHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <FileText size={15} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.notesTitle}>{t('fieldNotes')}</Text>
            </View>
            <Text style={[styles.notesBody, isRTL && styles.rtlText]}>{client.notes}</Text>
          </View>
        ) : null}

        {/* PURCHASED GAMES & SLOTS SECTION */}
        <View style={styles.purchasesSection}>
          <View style={[styles.sectionHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={isRTL && { alignItems: 'flex-end' }}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('clientPurchasedGames')}
              </Text>
              <Text style={[styles.sectionSubtitle, isRTL && styles.rtlText]}>
                {t('clientPurchasedGamesSub')} ({allocations.length})
              </Text>
            </View>
          </View>

          {allocations.length === 0 ? (
            <View style={styles.emptyPurchasesBox}>
              <Gamepad2 size={42} color={colors.textMuted} strokeWidth={1.4} />
              <Text style={styles.emptyPurchasesTitle}>{t('noPurchasesYet')}</Text>
              <Text style={styles.emptyPurchasesSub}>{t('noPurchasesYetSub')}</Text>
            </View>
          ) : (
            <View style={styles.allocationsList}>
              {allocations.map((alloc) => {
                const game = gamesMap[alloc.game_id];
                const warrantyInfo = calculateWarranty(alloc.sale_date, alloc.warranty_months);

                return (
                  <View key={alloc.id} style={styles.allocationCard}>
                    {/* TOP: GAME INFO + COVER */}
                    <Pressable
                      onPress={() => {
                        if (game) {
                          router.push(`/game/${game.id}`);
                        }
                      }}
                      style={[styles.gameHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
                    >
                      {/* GAME COVER */}
                      {game?.cover_image_url ? (
                        <Image
                          source={{ uri: game.cover_image_url }}
                          style={styles.gameCoverImg}
                        />
                      ) : (
                        <View style={styles.gameCoverPlaceholder}>
                          <Gamepad2 size={20} color={colors.textMuted} />
                        </View>
                      )}

                      {/* GAME TITLE & PLATFORM */}
                      <View style={[styles.gameTextCol, isRTL && { alignItems: 'flex-end' }]}>
                        <Text
                          style={[styles.gameTitleText, isRTL && styles.rtlText]}
                          numberOfLines={1}
                        >
                          {game ? game.title : 'Game Account'}
                        </Text>

                        <View style={[styles.gameBadgesRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                          {/* PLATFORM PILL */}
                          {(() => {
                            const allocPlatform = getAllocPlatform(alloc.slot_type, game?.platform);
                            const platformLabel = allocPlatform === 'BOTH' ? 'PS4·PS5' : allocPlatform;
                            return (
                              <View
                                style={[
                                  styles.consolePlatformBadge,
                                  allocPlatform === 'PS4'
                                    ? styles.badgePS4
                                    : allocPlatform === 'BOTH'
                                    ? styles.badgeBoth
                                    : styles.badgePS5,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.consolePlatformText,
                                    allocPlatform === 'PS4'
                                      ? styles.platformTextPS4
                                      : allocPlatform === 'BOTH'
                                      ? styles.platformTextBoth
                                      : styles.platformTextPS5,
                                  ]}
                                >
                                  {platformLabel}
                                </Text>
                              </View>
                            );
                          })()}

                          {/* SLOT TYPE PILL */}
                          <View style={styles.slotTypeBadge}>
                            <Text style={styles.slotTypeBadgeText}>
                              {getSlotTypeLabel(alloc.slot_type)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* NAVIGATE CHEVRON */}
                      <View style={styles.chevronBox}>
                        {isRTL ? (
                          <ChevronLeft size={18} color={colors.textMuted} />
                        ) : (
                          <ChevronRight size={18} color={colors.textMuted} />
                        )}
                      </View>
                    </Pressable>

                    {/* DIVIDER */}
                    <View style={styles.cardDivider} />

                    {/* MIDDLE: FINANCIAL & WARRANTY METRICS */}
                    <View style={[styles.allocDetailsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                      {/* SALE PRICE */}
                      <View style={[styles.allocDetailItem, isRTL && { alignItems: 'flex-end' }]}>
                        <Text style={styles.allocDetailLabel}>{t('salePrice')}</Text>
                        <Text style={styles.allocPriceVal}>
                          {formatCurrency(alloc.sale_price, alloc.currency || currency)}
                        </Text>
                      </View>

                      {/* SALE DATE */}
                      <View style={[styles.allocDetailItem, isRTL && { alignItems: 'flex-end' }]}>
                        <Text style={styles.allocDetailLabel}>{t('purchaseDateLabel')}</Text>
                        <Text style={styles.allocDateVal}>{alloc.sale_date}</Text>
                      </View>

                      {/* WARRANTY STATUS */}
                      <View style={[styles.allocDetailItem, isRTL && { alignItems: 'flex-end' }]}>
                        <Text style={styles.allocDetailLabel}>{t('warrantyLabel')}</Text>
                        {warrantyInfo.isLifetime ? (
                          <View style={[styles.warrantyPill, styles.warrantyPillLifetime]}>
                            <Sparkles size={11} color="#A855F7" strokeWidth={2.4} />
                            <Text style={styles.warrantyPillTextLifetime}>
                              {t('warrantyLifetimeBadge')}
                            </Text>
                          </View>
                        ) : warrantyInfo.isWarrantyActive ? (
                          <View style={[styles.warrantyPill, styles.warrantyPillActive]}>
                            <Clock size={11} color="#10B981" strokeWidth={2.4} />
                            <Text style={styles.warrantyPillTextActive}>
                              {t('warrantyExpiringGood', { days: warrantyInfo.daysRemaining })}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.warrantyPill, styles.warrantyPillExpired]}>
                            <Text style={styles.warrantyPillTextExpired}>
                              {t('warrantyExpired')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* BOTTOM ACTIONS: DISPATCH WHATSAPP & MANAGE SLOT */}
                    <View style={[styles.allocActionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                      <Pressable
                        onPress={() => handleOpenDispatch(alloc)}
                        style={({ pressed }) => [
                          styles.actionDispatchBtn,
                          isNativeRTL && { flexDirection: 'row-reverse' },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Share2 size={14} color="#10B981" strokeWidth={2.2} />
                        <Text style={styles.actionDispatchText}>
                          {t('dispatchWhatsApp')}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleManageSlot(alloc)}
                        style={({ pressed }) => [
                          styles.actionManageBtn,
                          isNativeRTL && { flexDirection: 'row-reverse' },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <SlidersHorizontal size={14} color={colors.accent} strokeWidth={2.2} />
                        <Text style={styles.actionManageText}>{t('manageSlot')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* EDIT CLIENT MODAL */}
      <ClientFormModal
        visible={editClientModalVisible}
        onClose={() => setEditClientModalVisible(false)}
        onSave={handleSaveClient}
        initialClient={client}
      />

      {/* WHATSAPP DISPATCH MODAL */}
      {dispatchGame && dispatchAllocation && (
        <WhatsAppDispatchModal
          visible={dispatchModalVisible}
          game={dispatchGame}
          allocation={dispatchAllocation}
          client={client}
          onClose={() => {
            setDispatchModalVisible(false);
            setDispatchGame(null);
            setDispatchAllocation(null);
          }}
        />
      )}

      {/* SLOT ALLOCATION / MANAGE MODAL */}
      {slotModalGame && selectedAllocation && (
        <SlotAllocationModal
          visible={slotModalVisible}
          game={slotModalGame}
          existingAllocation={selectedAllocation}
          onClose={() => {
            setSlotModalVisible(false);
            setSlotModalGame(null);
            setSelectedAllocation(null);
          }}
          onAllocated={() => {
            setSlotModalVisible(false);
            setSlotModalGame(null);
            setSelectedAllocation(null);
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, mode: ThemeMode) => {
  const isDark = mode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    notFoundContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.bg,
    },
    notFoundTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 6,
    },
    notFoundText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 20,
    },
    goBackBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    goBackText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerCircleBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerCircleBtnPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    headerDeleteBtn: {
      borderColor: 'rgba(239, 68, 68, 0.25)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
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
      }),
    },
    avatarGlow: {
      padding: 4,
      borderRadius: 44,
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
      marginBottom: 12,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#0070D1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clientTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    heroBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tierBadgeVip: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    tierTextVip: {
      fontSize: 12,
      fontWeight: '700',
      color: '#F59E0B',
    },
    tierBadgeRegular: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    tierTextRegular: {
      fontSize: 12,
      fontWeight: '700',
      color: '#10B981',
    },
    tierBadgeNew: {
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tierTextNew: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    platformBadge: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    platformBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    contactCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 10,
      marginTop: 4,
    },
    contactNumberBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactNumberText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    whatsappDirectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#25D366',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
    },
    whatsappDirectText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    metricIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 4,
      textAlign: 'center',
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    notesCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 112, 209, 0.04)',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 112, 209, 0.12)',
      marginBottom: 16,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    notesTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
    notesBody: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.text,
    },
    purchasesSection: {
      marginTop: 4,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyPurchasesBox: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyPurchasesTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    emptyPurchasesSub: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    allocationsList: {
      gap: 12,
    },
    allocationCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    gameHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    gameCoverImg: {
      width: 50,
      height: 62,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    },
    gameCoverPlaceholder: {
      width: 50,
      height: 62,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameTextCol: {
      flex: 1,
      gap: 6,
    },
    gameTitleText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    gameBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    consolePlatformBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
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
    consolePlatformText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    platformTextPS5: { color: isDark ? '#22D3EE' : '#0891B2' },
    platformTextPS4: { color: isDark ? '#60A5FA' : '#2563EB' },
    platformTextBoth: { color: isDark ? '#C084FC' : '#9333EA' },
    slotTypeBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    slotTypeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#0070D1',
    },
    chevronBox: {
      padding: 4,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    allocDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    allocDetailItem: {
      flex: 1,
    },
    allocDetailLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 2,
    },
    allocPriceVal: {
      fontSize: 13,
      fontWeight: '700',
      color: '#10B981',
    },
    allocDateVal: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    warrantyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    warrantyPillLifetime: {
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    warrantyPillTextLifetime: {
      fontSize: 10,
      fontWeight: '700',
      color: '#A855F7',
    },
    warrantyPillActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    warrantyPillTextActive: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
    },
    warrantyPillExpired: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    warrantyPillTextExpired: {
      fontSize: 10,
      fontWeight: '600',
      color: '#EF4444',
    },
    allocActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionDispatchBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    actionDispatchText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#10B981',
    },
    actionManageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionManageText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
};
