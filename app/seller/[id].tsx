import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
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
import {
  ShieldCheck,
  Star,
  Copy,
  Check,
  Pencil,
  FileText,
  Plus,
  ExternalLink,
} from 'lucide-react-native';

export default function SellerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

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
        <Text style={styles.notFoundText}>Seller not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>← Go Back</Text>
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

  const lockedGamesCount = games.filter((g) => g.status === 'Locked').length;
  const activeWarrantiesCount = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  }).length;

  return (
    <View style={styles.container}>
      {/* MODERN HEADER WITH BACK AND EDIT BUTTON */}
      <ModernHeader
        title="Seller Profile"
        subtitle={seller.name}
        showBackButton={true}
        rightAction={
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setEditModalVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.headerEditBtn, pressed && styles.headerEditBtnPressed]}
          >
            <Pencil size={20} color={styles.accentIcon.color} strokeWidth={2.2} />
          </Pressable>
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
          <View style={styles.heroBadgesRow}>
            <View style={styles.channelCountBadge}>
              <Text style={styles.channelCountText}>
                {contacts.length} {contacts.length === 1 ? 'Connection Channel' : 'Connection Channels'}
              </Text>
            </View>

            <View style={styles.ratingBadge}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {seller.reputation_score.toFixed(1)} / 5.0
              </Text>
            </View>
          </View>
        </View>

        {/* CONNECTION METHODS CARD */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionTitle}>
              CONNECT WITH THIS SELLER ({contacts.length})
            </Text>
            <Pressable onPress={() => setEditModalVisible(true)} style={styles.addMethodBtn}>
              <Plus size={13} color={styles.accentIcon.color} strokeWidth={2.4} />
              <Text style={styles.addMethodText}>Add Method</Text>
            </Pressable>
          </View>

          <View style={styles.contactsList}>
            {contacts.map((contact, index) => {
              const cfg = PLATFORM_CONFIG[contact.platform] || PLATFORM_CONFIG.Other;
              const isCopied = copiedId === (contact.id || `${index}`);

              return (
                <View key={contact.id || index} style={styles.contactItem}>
                  <View style={styles.contactTopRow}>
                    <View style={styles.contactInfoRow}>
                      <View style={[styles.platformIconCircle, { backgroundColor: cfg.bgTint }]}>
                        <PlatformIcon platform={contact.platform} size={18} color={cfg.defaultColor} />
                      </View>
                      <View style={styles.contactDetailsCol}>
                        <View style={styles.platformNameRow}>
                          <Text style={styles.platformName}>{contact.platform}</Text>
                          {contact.label && (
                            <View style={[styles.contactLabelBadge, { backgroundColor: `${cfg.defaultColor}20` }]}>
                              <Text style={[styles.contactLabelText, { color: cfg.defaultColor }]}>
                                {contact.label}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.contactValue} numberOfLines={1}>
                          {contact.value}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => copyContact(contact.value, contact.id || `${index}`)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={styles.copyBtn}
                    >
                      {isCopied ? (
                        <Check size={11} color={styles.successColor.color} strokeWidth={2.4} />
                      ) : (
                        <Copy size={11} color={styles.mutedText.color} strokeWidth={2.2} />
                      )}
                      <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                        {isCopied ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => openSellerContact(contact.platform, contact.value)}
                    style={({ pressed }) => [
                      styles.openChatBtn,
                      { backgroundColor: pressed ? `${cfg.defaultColor}CC` : cfg.defaultColor },
                    ]}
                  >
                    <PlatformIcon platform={contact.platform} size={14} color="#FFFFFF" />
                    <Text style={styles.openChatText}>
                      Open {contact.platform} Chat
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
          <View style={styles.notesHeaderRow}>
            <View style={styles.notesTitleGroup}>
              <FileText size={15} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>
                SELLER NOTES & POLICIES (FREE TEXT)
              </Text>
            </View>

            <Pressable onPress={() => setEditModalVisible(true)} style={styles.editNotesBtn}>
              <Pencil size={12} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={styles.editNotesText}>Edit</Text>
            </Pressable>
          </View>

          {seller.notes ? (
            <View style={styles.notesTextBox}>
              <Text style={styles.notesContent}>{seller.notes}</Text>
            </View>
          ) : (
            <Pressable onPress={() => setEditModalVisible(true)} style={styles.emptyNotesBox}>
              <Text style={styles.emptyNotesText}>
                No free-text notes saved for this seller. Tap here to add warranty policies, response times, or custom notes.
              </Text>
            </Pressable>
          )}
        </View>

        {/* METRICS ROW */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Games Supplied</Text>
            <Text style={styles.metricValue}>{games.length}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, styles.metricLabelSuccess]}>Active Warranty</Text>
            <Text style={styles.metricValue}>{activeWarrantiesCount}</Text>
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
              ]}
            >
              Locked
            </Text>
            <Text style={styles.metricValue}>{lockedGamesCount}</Text>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.gamesSectionHeader}>
          <Text style={styles.gamesSectionTitle}>
            Games from this Seller ({games.length})
          </Text>
          <Text style={styles.gamesSectionSubtitle}>
            Tap any game to inspect credentials, status, or warranty
          </Text>
        </View>

        {/* GAMES LIST (USING REUSABLE GameCard) */}
        {games.length === 0 ? (
          <View style={styles.emptyGamesBox}>
            <Text style={styles.emptyGamesText}>No games associated with this seller yet.</Text>
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
    headerEditBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
    headerEditBtnPressed: {
      opacity: 0.8,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
      shadowRadius: 8,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
      shadowRadius: 6,
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
  });
