import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Linking,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { OfflineVault } from "../../services/storage";
import { Game, Seller, ContactPlatform, SellerContactMethod } from "../../types/vault";
import { calculateWarranty, generateSellerDeepLink } from "../../utils/padlock";
import { ModernHeader, QuickAddWidget } from "../../components/common";
import { GameCard, PulsingPadlockBadge, GameFormModal } from "../../components/games";
import { SellerFormModal } from "../../components/sellers";
import {
  Gamepad2,
  ShieldCheck,
  Lock,
  ChevronRight,
  Clock,
} from "lucide-react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors, ThemeMode } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export default function DashboardScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();

  const [games, setGames] = useState<Game[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | "Active" | "Locked"
  >("All");
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const loadData = () => {
    setGames(OfflineVault.getGames());
    setSellers(OfflineVault.getSellers());
  };

  const handleSaveGame = (gameData: any) => {
    const newGame: Game = {
      id: `game-${Date.now()}`,
      user_id: 'user-demo',
      status: 'Active',
      purchase_date: new Date().toISOString().split('T')[0],
      ...gameData,
    };
    OfflineVault.addGame(newGame);
    setGameModalVisible(false);
    loadData();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleSaveSeller = (sellerData: {
    name: string;
    contact_platform: ContactPlatform;
    contact_link: string;
    contact_methods: SellerContactMethod[];
    reputation_score: number;
    notes?: string;
  }) => {
    const newSeller: Seller = {
      id: `seller-${Date.now()}`,
      user_id: 'user-demo',
      ...sellerData,
      created_at: new Date().toISOString(),
    };
    OfflineVault.addSeller(newSeller);
    setSellerModalVisible(false);
    loadData();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const totalGames = games.length;
  const lockedGames = games.filter((g) => g.status === "Locked");
  const activeWarranties = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  });

  const categories = [
    { key: "All", label: t("filterAll") },
    { key: "Active", label: t("filterActive") },
    { key: "Locked", label: t("filterLocked") },
  ];

  const displayedGames = games.filter((g) => {
    if (selectedCategory === "Active") return g.status === "Active";
    if (selectedCategory === "Locked") return g.status === "Locked";
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <ModernHeader
        title={t("headerDashboardTitle")}
        subtitle={t("headerDashboardSubtitle")}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.accentColor.color}
          />
        }
      >
        {/* QUICK SHORTCUTS TOP WIDGET */}
        <View style={styles.topWidgetWrapper}>
          <QuickAddWidget
            tag={t("quickShortcutsTag")}
            actions={[
              {
                label: t("quickAddGame"),
                sublabel: t("quickAddGameSub"),
                icon: "game",
                onPress: () => setGameModalVisible(true),
              },
              {
                label: t("quickAddSeller"),
                sublabel: t("quickAddSellerSub"),
                icon: "seller",
                onPress: () => setSellerModalVisible(true),
              },
            ]}
          />
        </View>

        {/* METRICS ROW */}
        <View style={styles.metricsRow}>
          {/* Total Games */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>{t("metricVaultTotal")}</Text>
              <Gamepad2
                size={15}
                color={styles.accentColor.color}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.metricValue}>{totalGames}</Text>
            <Text style={styles.metricSubtext}>{t("metricGamesStored")}</Text>
          </View>

          {/* Active Warranties */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={[styles.metricLabel, styles.metricLabelSuccess]}>
                {t("metricProtected")}
              </Text>
              <ShieldCheck
                size={15}
                color={styles.successColor.color}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.metricValue}>{activeWarranties.length}</Text>
            <Text style={styles.metricSubtext}>{t("metricUnderWarranty")}</Text>
          </View>

          {/* Locked / Issues */}
          <View
            style={[
              styles.metricCard,
              lockedGames.length > 0 && styles.metricCardDanger,
            ]}
          >
            <View style={styles.metricCardHeader}>
              <Text
                style={[
                  styles.metricLabel,
                  lockedGames.length > 0 && styles.metricLabelDanger,
                ]}
              >
                {t("metricLocked")}
              </Text>
              <Lock
                size={15}
                color={
                  lockedGames.length > 0
                    ? styles.dangerColor.color
                    : styles.mutedColor.color
                }
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.metricValue}>{lockedGames.length}</Text>
            <Text
              style={[
                styles.metricSubtext,
                lockedGames.length > 0 && styles.metricSubtextDanger,
              ]}
            >
              {lockedGames.length > 0 ? t("metricPadlockAlert") : t("metricAllClear")}
            </Text>
          </View>
        </View>

        {/* PADLOCK PROTOCOL SECTION (IF ANY LOCKED) */}
        {lockedGames.length > 0 && (
          <View style={styles.padlockSection}>
            <View style={styles.padlockAlertBanner}>
              <View style={styles.padlockHeaderRow}>
                <View style={styles.padlockTitleGroup}>
                  <PulsingPadlockBadge size="md" showLabel={false} />
                  <Text style={styles.padlockBannerTitle}>
                    {t("padlockProtocolActive")}
                  </Text>
                </View>
                <View style={styles.padlockBadge}>
                  <Text style={styles.padlockBadgeText}>
                    {lockedGames.length} {t("padlockRevokedCount")}
                  </Text>
                </View>
              </View>

              <Text style={styles.padlockInstruction}>
                {t("padlockInstruction")}
              </Text>

              {lockedGames.map((game) => {
                const seller = game.seller_id
                  ? sellerMap.get(game.seller_id)
                  : undefined;
                const warranty = calculateWarranty(
                  game.purchase_date,
                  game.warranty_months,
                );

                return (
                  <View key={game.id} style={styles.lockedGameItem}>
                    {game.cover_image_url ? (
                      <Image
                        source={{ uri: game.cover_image_url }}
                        style={styles.lockedCoverImage}
                      />
                    ) : (
                      <View style={styles.lockedCoverPlaceholder}>
                        <Gamepad2
                          size={20}
                          color={styles.mutedColor.color}
                          strokeWidth={1.8}
                        />
                      </View>
                    )}

                    <View style={styles.lockedGameDetails}>
                      <Text style={styles.lockedGameTitle} numberOfLines={1}>
                        {game.title}
                      </Text>

                      {seller && (
                        <Pressable
                          onPress={() => router.push(`/seller/${seller.id}`)}
                          style={styles.lockedSellerRow}
                        >
                          <Text style={styles.lockedSellerText}>
                            {t("padlockSeller")}: {seller.name}
                          </Text>
                          <ChevronRight
                            size={11}
                            color={styles.accentColor.color}
                            strokeWidth={2.4}
                          />
                        </Pressable>
                      )}

                      <Text
                        style={[
                          styles.lockedWarrantyText,
                          warranty.isWarrantyActive
                            ? styles.warrantyActiveText
                            : styles.warrantyExpiredText,
                        ]}
                      >
                        {warranty.isWarrantyActive
                          ? t("padlockWarrantyActive", { days: warranty.daysRemaining })
                          : t("padlockWarrantyExpired")}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        try {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                        } catch {}
                        const deepLink = generateSellerDeepLink(game, seller);
                        if (deepLink) {
                          Linking.openURL(deepLink);
                        } else {
                          router.push(`/game/${game.id}`);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.claimBtn,
                        pressed && styles.claimBtnPressed,
                      ]}
                    >
                      <Text style={styles.claimBtnText}>{t("padlockClaimBtn")}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* CATEGORY PILLS */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryHeading}>{t("categoryVaultCollection")}</Text>

          <View style={styles.categoryPillsRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedCategory(cat.key as any);
                  }}
                  style={[
                    styles.categoryPill,
                    isSelected
                      ? styles.categoryPillActive
                      : styles.categoryPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected
                        ? styles.categoryPillTextActive
                        : styles.categoryPillTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* MODERN GAME CARDS LIST */}
        <View style={styles.gamesListSection}>
          {displayedGames.map((game) => {
            const seller = game.seller_id
              ? sellerMap.get(game.seller_id)
              : undefined;
            return (
              <GameCard
                key={game.id}
                game={game}
                sellerName={seller?.name}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  router.push(`/game/${game.id}`);
                }}
                onSellerPress={
                  seller ? () => router.push(`/seller/${seller.id}`) : undefined
                }
              />
            );
          })}
        </View>
      </ScrollView>

      {/* QUICK SELLER REGISTRATION MODAL */}
      <SellerFormModal
        visible={sellerModalVisible}
        onClose={() => setSellerModalVisible(false)}
        onSave={handleSaveSeller}
      />

      {/* QUICK GAME REGISTRATION MODAL */}
      <GameFormModal
        visible={gameModalVisible}
        onClose={() => setGameModalVisible(false)}
        onSave={handleSaveGame}
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 14,
      paddingBottom: 96,
    },
    topWidgetWrapper: {
      paddingHorizontal: 20,
    },
    accentColor: {
      color: colors.accent,
    },
    successColor: {
      color: colors.success,
    },
    dangerColor: {
      color: colors.danger,
    },
    mutedColor: {
      color: colors.textMuted,
    },
    metricsRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 18,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === "dark" ? "0px 2px 6px rgba(0, 0, 0, 0.2)" : "0px 2px 6px rgba(0, 0, 0, 0.04)",
      elevation: 2,
    },
    metricCardDanger: {
      backgroundColor: theme === "dark" ? "#261014" : "#FEF2F2",
      borderColor: colors.danger,
    },
    metricCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    metricLabelSuccess: {
      color: colors.success,
    },
    metricLabelDanger: {
      color: colors.danger,
    },
    metricValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      marginTop: 4,
    },
    metricSubtext: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 2,
    },
    metricSubtextDanger: {
      color: colors.danger,
    },
    padlockSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    padlockAlertBanner: {
      backgroundColor: theme === "dark" ? "#1E0E12" : "#FEF2F2",
      borderRadius: 20,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.danger,
      boxShadow: theme === "dark" ? "0px 4px 10px rgba(255, 59, 48, 0.3)" : "0px 4px 10px rgba(239, 68, 68, 0.08)",
      elevation: 3,
    },
    padlockHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    padlockTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    padlockBannerTitle: {
      color: colors.danger,
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: 0.5,
    },
    padlockBadge: {
      backgroundColor:
        theme === "dark" ? "rgba(255, 59, 48, 0.2)" : "rgba(239, 68, 68, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    padlockBadgeText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "800",
    },
    padlockInstruction: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 8,
      lineHeight: 17,
    },
    lockedGameItem: {
      backgroundColor: theme === "dark" ? "#2A1318" : "#FFFFFF",
      borderRadius: 16,
      padding: 12,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme === "dark" ? "#4A1D24" : "#FEE2E2",
    },
    lockedCoverImage: {
      width: 48,
      height: 64,
      borderRadius: 10,
      backgroundColor: colors.surfaceSubtle,
    },
    lockedCoverPlaceholder: {
      width: 48,
      height: 64,
      borderRadius: 10,
      backgroundColor: colors.surfaceSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    lockedGameDetails: {
      flex: 1,
      marginLeft: 12,
    },
    lockedGameTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    lockedSellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginTop: 2,
    },
    lockedSellerText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    lockedWarrantyText: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2,
    },
    warrantyActiveText: {
      color: colors.success,
    },
    warrantyExpiredText: {
      color: colors.danger,
    },
    claimBtn: {
      backgroundColor: colors.danger,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    claimBtnPressed: {
      backgroundColor: "#DC2626",
    },
    claimBtnText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    categorySection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    categoryHeading: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 12,
    },
    categoryPillsRow: {
      flexDirection: "row",
      gap: 8,
    },
    categoryPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    categoryPillActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
      boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.12)",
    },
    categoryPillInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.02)",
    },
    categoryPillText: {
      fontSize: 12,
    },
    categoryPillTextActive: {
      color: colors.pillActiveText,
      fontWeight: "800",
    },
    categoryPillTextInactive: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    gamesListSection: {
      paddingHorizontal: 20,
    },
  });
