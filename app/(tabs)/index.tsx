import { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Linking,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { VaultText as Text } from "../../components/common/VaultText";
import { useRouter } from "expo-router";
import * as Haptics from '@/utils/haptics';
import { Game, Seller, ContactPlatform, SellerContactMethod } from "../../types/vault";
import { calculateWarranty, generateSellerDeepLink } from "../../utils/padlock";
import { getGameAvailableSlots } from "../../utils/slots";
import { ModernHeader, QuickAddWidget } from "../../components/common";
import { GameCard, PulsingPadlockBadge, GameFormModal } from "../../components/games";
import { SellerFormModal } from "../../components/sellers";
import { ClientFormModal, WhatsAppDispatchModal } from "../../components/seller";
import {
  Gamepad2,
  ShieldCheck,
  Lock,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Share2,
  CheckCircle2,
  Clock,
  User,
  Plus,
} from "lucide-react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors, ThemeMode } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePersona } from "../../context/PersonaContext";
import { useVaultSync } from "../../context/VaultSyncContext";
import { Client, ClientAllocation } from "../../types/vault";
import { generateUUID } from "../../utils/uuid";

export default function DashboardScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { isSeller, formatCurrency, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const {
    games,
    sellers,
    clients,
    allocations,
    addGame,
    addSeller,
    addClient,
    refreshData,
  } = useVaultSync();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | "Active" | "Locked"
  >("All");
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);

  // WhatsApp Dispatch State
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchAllocation, setDispatchAllocation] = useState<ClientAllocation | null>(null);

  const handleSaveGame = (gameData: any) => {
    const newGame: Game = {
      id: generateUUID(),
      user_id: 'user-demo',
      status: 'Active',
      purchase_date: new Date().toISOString().split('T')[0],
      ...gameData,
    };
    addGame(newGame);
    setGameModalVisible(false);
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
      id: generateUUID(),
      user_id: 'user-demo',
      ...sellerData,
      created_at: new Date().toISOString(),
    };
    addSeller(newSeller);
    setSellerModalVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  useEffect(() => {
    refreshData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const clientsMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clients]);
  const gamesMap = useMemo(() => {
    const map: Record<string, Game> = {};
    games.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [games]);

  const totalGames = games.length;
  const lockedGames = games.filter((g) => g.status === "Locked");
  const activeWarranties = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  });

  // Seller KPI calculations
  const activeSellerAllocs = allocations.filter((a) => a.status === 'Active');
  const totalSalesRevenue = activeSellerAllocs.reduce((sum, a) => sum + (a.sale_price || 0), 0);
  const totalInventoryCost = games.reduce((sum, g) => sum + (g.cost_price || 0), 0);
  const netSellerProfit = totalSalesRevenue - totalInventoryCost;
  const isProfitable = netSellerProfit > 0;

  // Pre-index allocations by game_id in O(M) so we NEVER scan allocations in a loop
  const allocsByGameId = useMemo(() => {
    const map = new Map<string, ClientAllocation[]>();
    for (let i = 0; i < activeSellerAllocs.length; i++) {
      const a = activeSellerAllocs[i];
      const list = map.get(a.game_id);
      if (list) {
        list.push(a);
      } else {
        map.set(a.game_id, [a]);
      }
    }
    return map;
  }, [activeSellerAllocs]);

  // Available slots count: O(N) single-pass with instant O(1) dictionary lookups
  const totalAvailableSlots = useMemo(() => {
    let count = 0;
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const gameAllocs = allocsByGameId.get(g.id) || [];
      count += getGameAvailableSlots(g, gameAllocs).length;
    }
    return count;
  }, [games, allocsByGameId]);

  const recentSales = useMemo(() => {
    return [...activeSellerAllocs].reverse().slice(0, 6);
  }, [activeSellerAllocs]);

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

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const newClient: Client = {
      id: generateUUID(),
      user_id: 'user-demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...clientData,
    };
    await addClient(newClient);
    setClientModalVisible(false);
  };

  const handleDispatchReceipt = (alloc: ClientAllocation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setDispatchAllocation(alloc);
    setDispatchModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <ModernHeader
        title={isSeller ? t("tabSalesHub") : t("headerDashboardTitle")}
        subtitle={isSeller ? t("financialOverview") : t("headerDashboardSubtitle")}
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
        {/* BRAND SLOGAN HERO BANNER */}
        <View style={styles.sloganBanner}>
          <View style={[styles.sloganTagRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.sloganPulseDot} />
            <Text style={styles.sloganTagText}>
              {isSeller
                ? (isRTL ? 'إدارة المبيعات وتوزيع السلوتات' : 'PLAYSTATION DISTRIBUTION')
                : (isRTL ? 'الحماية والضمان المتكامل' : 'SECURE VAULT ARCHITECTURE')}
            </Text>
          </View>
          <Text style={[styles.sloganMainText, isRTL && styles.rtlText]}>
            {isSeller
              ? (isRTL ? 'منصة التوزيع والمبيعات' : 'PlayStation Sales Hub')
              : t('appSlogan')}
          </Text>
          <Text style={[styles.sloganSubText, isRTL && styles.rtlText]}>
            {isSeller
              ? (isRTL
                  ? 'متابعة شاملة لإيرادات الحسابات، الأرباح الصافية، وتوزيع السلوتات للعملاء'
                  : 'Live tracking for master inventory, profit margins & WhatsApp receipts')
              : t('appSloganSub')}
          </Text>
        </View>

        {/* QUICK SHORTCUTS TOP WIDGET */}
        <View style={styles.topWidgetWrapper}>
          <QuickAddWidget
            tag={t("quickShortcutsTag")}
            actions={
              isSeller
                ? [
                    {
                      label: t("quickAddInventory"),
                      sublabel: isRTL ? 'تسجيل حساب وتكلفة شراء' : 'Register account & cost price',
                      icon: "game",
                      onPress: () => setGameModalVisible(true),
                    },
                    {
                      label: t("quickAddClient"),
                      sublabel: isRTL ? 'تسجيل مشترٍ وتفاصيل واتساب' : 'Register buyer & WhatsApp link',
                      icon: "seller",
                      onPress: () => setClientModalVisible(true),
                    },
                  ]
                : [
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
                  ]
            }
          />
        </View>

        {/* METRICS SECTION */}
        {isSeller ? (
          // SELLER HUB KPI GRID
          <View style={[styles.sellerKpiGrid, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {/* TOTAL SALES */}
            <View style={styles.sellerKpiCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.metricLabel, styles.metricLabelSuccess, isRTL && styles.rtlText]}>
                  {t('totalSales')}
                </Text>
                <TrendingUp size={15} color="#10B981" strokeWidth={2.2} />
              </View>
              <Text style={[styles.sellerKpiValue, isRTL && styles.rtlText]}>
                {formatCurrency(totalSalesRevenue, currency)}
              </Text>
              <Text style={[styles.metricSubtext, isRTL && styles.rtlText]}>
                {activeSellerAllocs.length} {t('soldSlots')}
              </Text>
            </View>

            {/* TOTAL COST */}
            <View style={styles.sellerKpiCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>
                  {t('totalCost')}
                </Text>
                <Package size={15} color={styles.accentColor.color} strokeWidth={2.2} />
              </View>
              <Text style={[styles.sellerKpiValue, isRTL && styles.rtlText]}>
                {formatCurrency(totalInventoryCost, currency)}
              </Text>
              <Text style={[styles.metricSubtext, isRTL && styles.rtlText]}>
                {totalGames} {isRTL ? 'حساب في المخزون' : 'master accounts'}
              </Text>
            </View>

            {/* NET PROFIT */}
            <View style={styles.sellerKpiCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text
                  style={[
                    styles.metricLabel,
                    isProfitable ? styles.metricLabelSuccess : styles.metricLabelWarning,
                    isRTL && styles.rtlText,
                  ]}
                >
                  {t('netProfit')}
                </Text>
                <DollarSign
                  size={15}
                  color={isProfitable ? '#10B981' : '#F59E0B'}
                  strokeWidth={2.2}
                />
              </View>
              <Text
                style={[
                  styles.sellerKpiValue,
                  isProfitable ? styles.kpiProfitPositive : styles.kpiProfitNegative,
                  isRTL && styles.rtlText,
                ]}
              >
                {isProfitable ? '+' : ''}
                {formatCurrency(netSellerProfit, currency)}
              </Text>
              <Text style={[styles.metricSubtext, isRTL && styles.rtlText]}>
                {isProfitable
                  ? (isRTL ? 'أرباح صافية محققة' : 'Net positive margin')
                  : (isRTL ? 'جاري استرداد رأس المال' : 'Recovering inventory')}
              </Text>
            </View>

            {/* AVAILABLE SLOTS */}
            <View style={styles.sellerKpiCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>
                  {t('availableSlots')}
                </Text>
                <Users size={15} color="#3B82F6" strokeWidth={2.2} />
              </View>
              <Text style={[styles.sellerKpiValue, { color: '#3B82F6' }, isRTL && styles.rtlText]}>
                {totalAvailableSlots}
              </Text>
              <Text style={[styles.metricSubtext, isRTL && styles.rtlText]}>
                {isRTL ? 'سلوت متاح للبيع' : 'ready for allocation'}
              </Text>
            </View>
          </View>
        ) : (
          // GAMER DASHBOARD METRICS ROW
          <View style={[styles.metricsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            {/* Total Games */}
            <View style={styles.metricCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text
                  style={[styles.metricLabel, isRTL && styles.rtlText]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t("metricVaultTotal")}
                </Text>
                <Gamepad2
                  size={14}
                  color={styles.accentColor.color}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{totalGames}</Text>
              <Text
                style={[styles.metricSubtext, isRTL && styles.rtlText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t("metricGamesStored")}
              </Text>
            </View>

            {/* Active Warranties */}
            <View style={styles.metricCard}>
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text
                  style={[styles.metricLabel, styles.metricLabelSuccess, isRTL && styles.rtlText]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t("metricProtected")}
                </Text>
                <ShieldCheck
                  size={14}
                  color={styles.successColor.color}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{activeWarranties.length}</Text>
              <Text
                style={[styles.metricSubtext, isRTL && styles.rtlText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t("metricUnderWarranty")}
              </Text>
            </View>

            {/* Locked / Issues */}
            <View
              style={[
                styles.metricCard,
                lockedGames.length > 0 && styles.metricCardDanger,
              ]}
            >
              <View style={[styles.metricCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Text
                  style={[
                    styles.metricLabel,
                    lockedGames.length > 0 && styles.metricLabelDanger,
                    isRTL && styles.rtlText,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t("metricLocked")}
                </Text>
                <Lock
                  size={14}
                  color={
                    lockedGames.length > 0
                      ? styles.dangerColor.color
                      : styles.mutedColor.color
                  }
                  strokeWidth={2.2}
                />
              </View>
              <Text style={[styles.metricValue, isRTL && styles.rtlText]}>{lockedGames.length}</Text>
              <Text
                style={[
                  styles.metricSubtext,
                  lockedGames.length > 0 && styles.metricSubtextDanger,
                  isRTL && styles.rtlText,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {lockedGames.length > 0 ? t("metricPadlockAlert") : t("metricAllClear")}
              </Text>
            </View>
          </View>
        )}

        {/* BODY CONTENT: SELLER RECENT SALES VS GAMER GAMES LIST */}
        {isSeller ? (
          // SELLER HUB: RECENT SLOT DELIVERIES
          <View style={styles.recentSalesSection}>
            <View style={[styles.recentSalesHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={isRTL && { alignItems: 'flex-end' }}>
                <Text style={[styles.categoryHeading, isRTL && styles.rtlText]}>
                  {isRTL ? 'أحدث مبيعات السلوتات' : 'Recent Slot Allocations'}
                </Text>
                <Text style={[styles.recentSalesSub, isRTL && styles.rtlText]}>
                  {isRTL ? 'المشترون والفواتير وإيصالات التسليم' : 'Latest customer deliveries & WhatsApp receipts'}
                </Text>
              </View>

              <Pressable
                onPress={() => router.push('/(tabs)/vault')}
                style={styles.viewInventoryLink}
              >
                <Text style={styles.viewInventoryLinkText}>
                  {isRTL ? 'المخزون بالكامل' : 'All Inventory'}
                </Text>
                {isRTL ? <ChevronLeft size={14} color="#0070D1" /> : <ChevronRight size={14} color="#0070D1" />}
              </Pressable>
            </View>

            {recentSales.length === 0 ? (
              <View style={styles.emptyVaultCard}>
                <View style={styles.emptyIconCircle}>
                  <TrendingUp size={36} color="#10B981" strokeWidth={2} />
                </View>
                <Text style={[styles.emptyVaultTitle, isRTL && styles.rtlText]}>
                  {isRTL ? 'لا توجد مبيعات مسجلة حتى الآن' : 'No Slot Sales Recorded Yet'}
                </Text>
                <Text style={[styles.emptyVaultSubtitle, isRTL && styles.rtlText]}>
                  {isRTL
                    ? 'أضف أول حساب للمخزون أو افتح أي لعبة لبيع أول سلوت للعملاء.'
                    : 'Add master accounts to your inventory and start allocating slots to buyers.'}
                </Text>
                <Pressable
                  onPress={() => setGameModalVisible(true)}
                  style={styles.emptyAddBtn}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.emptyAddBtnText}>{t('quickAddInventory')}</Text>
                </Pressable>
              </View>
            ) : (
              recentSales.map((alloc: ClientAllocation) => {
                const game = gamesMap[alloc.game_id];
                const client = clientsMap[alloc.client_id];
                const warrantyInfo = calculateWarranty(alloc.sale_date, alloc.warranty_months);

                return (
                  <Pressable
                    key={alloc.id}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      router.push(`/game/${alloc.game_id}`);
                    }}
                    style={({ pressed }) => [
                      styles.recentSaleCard,
                      isNativeRTL && { flexDirection: 'row-reverse' },
                      pressed && styles.recentSaleCardPressed,
                    ]}
                  >
                    {/* GAME COVER */}
                    {game?.cover_image_url ? (
                      <Image source={{ uri: game.cover_image_url }} style={styles.recentSaleImage} />
                    ) : (
                      <View style={styles.recentSalePlaceholder}>
                        <Gamepad2 size={20} color={styles.mutedColor.color} />
                      </View>
                    )}

                    {/* SALE INFO */}
                    <View style={[styles.recentSaleDetails, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                      <Text style={[styles.recentSaleTitle, isRTL && styles.rtlText]} numberOfLines={1}>
                        {game?.title || 'PlayStation Game'}
                      </Text>

                      <View style={[styles.recentSaleMetaRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={styles.slotTypePill}>
                          <Text style={styles.slotTypePillText}>
                            {alloc.slot_type.replace('_', ' ')}
                          </Text>
                        </View>
                        <Text style={styles.recentClientName} numberOfLines={1}>
                          {client?.name || 'Client'}
                        </Text>
                      </View>
                    </View>

                    {/* PRICE & RECEIPT BUTTON */}
                    <View style={[styles.recentSaleRight, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                      <Text style={styles.recentSalePrice}>
                        {formatCurrency(alloc.sale_price, alloc.currency || currency)}
                      </Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDispatchReceipt(alloc);
                        }}
                        style={styles.recentReceiptBtn}
                      >
                        <Share2 size={14} color="#10B981" />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : (
          // GAMER DASHBOARD: COLLECTION & STATUS
          <>
            {/* PADLOCK PROTOCOL SECTION (IF ANY LOCKED) */}
            {lockedGames.length > 0 && (
              <View style={styles.padlockSection}>
                <View style={styles.padlockAlertBanner}>
                  <View style={[styles.padlockHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={[styles.padlockTitleGroup, isNativeRTL && { flexDirection: 'row-reverse' }]}>
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

                  <Text style={[styles.padlockInstruction, isRTL && styles.rtlText]}>
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
                      <Pressable
                        key={game.id}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          router.push(`/game/${game.id}`);
                        }}
                        style={({ pressed }) => [
                          styles.lockedGameItem,
                          isNativeRTL && { flexDirection: 'row-reverse' },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
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

                        <View style={[styles.lockedGameDetails, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12 }]}>
                          <Text style={[styles.lockedGameTitle, isRTL && styles.rtlText]} numberOfLines={1}>
                            {game.title}
                          </Text>

                          {seller && (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                router.push(`/seller/${seller.id}`);
                              }}
                              style={[styles.lockedSellerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
                            >
                              <Text style={[styles.lockedSellerText, isRTL && styles.rtlText]}>
                                <Text>{t("padlockSeller")}: </Text>
                                <Text>{seller.name}</Text>
                              </Text>
                              {isRTL ? (
                                <ChevronLeft
                                  size={11}
                                  color={styles.accentColor.color}
                                  strokeWidth={2.4}
                                />
                              ) : (
                                <ChevronRight
                                  size={11}
                                  color={styles.accentColor.color}
                                  strokeWidth={2.4}
                                />
                              )}
                            </Pressable>
                          )}

                          <Text
                            style={[
                              styles.lockedWarrantyText,
                              isRTL && styles.rtlText,
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
                          onPress={(e) => {
                            e.stopPropagation();
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
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* CATEGORY PILLS */}
            <View style={styles.categorySection}>
              <Text style={[styles.categoryHeading, isRTL && styles.rtlText]}>{t("categoryVaultCollection")}</Text>

              <View style={[styles.categoryPillsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
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
              {displayedGames.length === 0 ? (
                <View style={styles.emptyVaultCard}>
                  <View style={styles.emptyIconCircle}>
                    <Gamepad2 size={36} color="#00D2FF" strokeWidth={2} />
                  </View>
                  <Text style={[styles.emptyVaultTitle, isRTL && styles.rtlText]}>
                    {games.length === 0
                      ? t('emptyDashboardTitle')
                      : t('noGamesFound')}
                  </Text>
                  <Text style={[styles.emptyVaultSubtitle, isRTL && styles.rtlText]}>
                    {games.length === 0
                      ? t('emptyDashboardSubtitle')
                      : t('noGamesFoundSub')}
                  </Text>
                  {games.length === 0 && (
                    <Pressable
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch {}
                        setGameModalVisible(true);
                      }}
                      style={({ pressed }) => [
                        styles.emptyAddBtn,
                        pressed && styles.emptyAddBtnPressed,
                        isNativeRTL && { flexDirection: 'row-reverse' },
                      ]}
                    >
                      <Gamepad2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={styles.emptyAddBtnText}>
                        {t('emptyDashboardActionBtn')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                displayedGames.map((game) => {
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
                })
              )}
            </View>
          </>
        )}
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

      {/* QUICK CLIENT REGISTRATION MODAL */}
      <ClientFormModal
        visible={clientModalVisible}
        onClose={() => setClientModalVisible(false)}
        onSave={handleSaveClient}
      />

      {/* 1-TAP WHATSAPP DISPATCH MODAL */}
      {dispatchAllocation && gamesMap[dispatchAllocation.game_id] && (
        <WhatsAppDispatchModal
          visible={dispatchModalVisible}
          game={gamesMap[dispatchAllocation.game_id]}
          allocation={dispatchAllocation}
          client={clientsMap[dispatchAllocation.client_id]}
          onClose={() => {
            setDispatchModalVisible(false);
            setDispatchAllocation(null);
          }}
        />
      )}
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
      paddingTop: 10,
      paddingBottom: 135,
    },
    sloganBanner: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 16,
    },
    sloganTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    sloganPulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#00D2FF',
    },
    sloganTagText: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    sloganMainText: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.4,
      lineHeight: 28,
    },
    sloganSubText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
      lineHeight: 18,
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
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 18,
    },
    metricCard: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
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
      gap: 4,
    },
    metricLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.textMuted,
      fontSize: 10.5,
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
      fontSize: 22,
      fontWeight: "800",
      marginTop: 4,
    },
    metricSubtext: {
      color: colors.textSecondary,
      fontSize: 9.5,
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
    emptyVaultCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 36,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 8px 32px rgba(0, 0, 0, 0.4)' : '0px 8px 32px rgba(0, 0, 0, 0.05)',
      marginTop: 4,
      marginBottom: 20,
    },
    emptyIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.1)' : 'rgba(0, 112, 209, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.25)' : 'rgba(0, 112, 209, 0.18)',
    },
    emptyVaultTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyVaultSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 290,
      marginBottom: 20,
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#0070D1',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      boxShadow: '0px 4px 14px rgba(0, 112, 209, 0.35)',
    },
    emptyAddBtnPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    emptyAddBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    rtlText: {
      textAlign: 'right',
    },
    sellerKpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 20,
    },
    sellerKpiCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 2px 8px rgba(0, 0, 0, 0.25)' : '0px 2px 8px rgba(0, 0, 0, 0.04)',
      elevation: 2,
    },
    metricLabelWarning: {
      color: colors.warning,
    },
    sellerKpiValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginTop: 6,
      marginBottom: 2,
    },
    kpiProfitPositive: {
      color: '#10B981',
    },
    kpiProfitNegative: {
      color: '#F59E0B',
    },
    recentSalesSection: {
      paddingHorizontal: 20,
      marginTop: 4,
    },
    recentSalesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    recentSalesSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    viewInventoryLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewInventoryLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0070D1',
    },
    recentSaleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentSaleCardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    recentSaleImage: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
    },
    recentSalePlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme === 'dark' ? '#1E293B' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    recentSaleDetails: {
      flex: 1,
    },
    recentSaleTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    recentSaleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    slotTypePill: {
      backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    slotTypePillText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#3B82F6',
    },
    recentClientName: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
      flex: 1,
    },
    recentSaleRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    recentSalePrice: {
      fontSize: 13,
      fontWeight: '700',
      color: '#10B981',
    },
    recentReceiptBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
