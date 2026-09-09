import { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { VaultText as Text } from '../../components/common/VaultText';
import { useRouter } from 'expo-router';
import * as Haptics from '@/utils/haptics';
import { ModernHeader, QuickAddWidget } from '../../components/common';
import { GameCard, GameFormModal } from '../../components/games';
import { SellerInventoryCard, SlotAllocationModal, WhatsAppDispatchModal } from '../../components/seller';
import { Game, ClientAllocation, Client, SlotType } from '../../types/vault';
import { Search, X, Gamepad2, Package } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { useVaultSync } from '../../context/VaultSyncContext';
import { generateUUID } from '../../utils/uuid';
import { isGameSoldOut } from '../../utils/slots';

type GamerFilter = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary' | 'Full';
type SellerFilter = 'All' | 'Available' | 'SoldOut' | 'PS5' | 'PS4' | 'BOTH';

export default function VaultScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { isSeller } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const { games, sellers, clients, allocations, addGame, refreshData } = useVaultSync();

  const [search, setSearch] = useState('');
  const [gamerFilter, setGamerFilter] = useState<GamerFilter>('All');
  const [sellerFilter, setSellerFilter] = useState<SellerFilter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  // Seller Modals State
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [selectedGameForSlot, setSelectedGameForSlot] = useState<Game | null>(null);
  const [selectedSlotType, setSelectedSlotType] = useState<SlotType | undefined>(undefined);
  const [editingAllocation, setEditingAllocation] = useState<ClientAllocation | null>(null);

  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchGame, setDispatchGame] = useState<Game | null>(null);
  const [dispatchAllocation, setDispatchAllocation] = useState<ClientAllocation | null>(null);

  const handleSaveGame = (gameData: any) => {
    const newGame: Game = {
      id: generateUUID(),
      user_id: 'user-demo',
      status: 'Active',
      purchase_date: new Date().toISOString().split('T')[0],
      is_inventory: isSeller,
      ...gameData,
    };
    addGame(newGame);
    setGameModalVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const sellerMap = useMemo(() => new Map(sellers.map((s) => [s.id, s])), [sellers]);
  const clientsMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clients]);

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch =
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.psn_email.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (isSeller) {
        // Seller mode filters
        const soldOut = isGameSoldOut(g, allocations);

        if (sellerFilter === 'Available') return !soldOut;
        if (sellerFilter === 'SoldOut') return soldOut;
        if (sellerFilter === 'PS5') return g.platform === 'PS5';
        if (sellerFilter === 'PS4') return g.platform === 'PS4';
        if (sellerFilter === 'BOTH') return g.platform === 'BOTH';
        return true;
      } else {
        // Gamer mode filters
        if (gamerFilter === 'All') return true;
        if (gamerFilter === 'Active') return g.status === 'Active';
        if (gamerFilter === 'Locked') return g.status === 'Locked';
        if (gamerFilter === 'Primary') return g.account_type === 'Primary';
        if (gamerFilter === 'Secondary') return g.account_type === 'Secondary';
        if (gamerFilter === 'Full') return g.account_type === 'Full';
        return true;
      }
    });
  }, [games, search, isSeller, sellerFilter, gamerFilter, allocations]);

  const gamerFilterButtons: { key: GamerFilter; label: string }[] = [
    { key: 'All', label: t('filterAll') },
    { key: 'Active', label: t('filterActive') },
    { key: 'Locked', label: t('filterLocked') },
    { key: 'Primary', label: t('filterPrimary') },
    { key: 'Secondary', label: t('filterSecondary') },
    { key: 'Full', label: t('filterFull') },
  ];

  const sellerFilterButtons: { key: SellerFilter; label: string }[] = [
    { key: 'All', label: t('filterAll') },
    { key: 'Available', label: t('availableSlots') },
    { key: 'SoldOut', label: t('soldSlots') },
    { key: 'PS5', label: 'PS5' },
    { key: 'PS4', label: 'PS4' },
    { key: 'BOTH', label: t('platformBoth') },
  ];

  const handleOpenSellSlot = (game: Game, slot?: SlotType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedGameForSlot(game);
    setSelectedSlotType(slot);
    setEditingAllocation(null);
    setSlotModalVisible(true);
  };

  const handleOpenManageSlot = (allocation: ClientAllocation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const game = games.find((g) => g.id === allocation.game_id);
    if (!game) return;
    setSelectedGameForSlot(game);
    setSelectedSlotType(allocation.slot_type);
    setEditingAllocation(allocation);
    setSlotModalVisible(true);
  };

  const handleOpenDispatchWhatsApp = (allocation: ClientAllocation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const game = games.find((g) => g.id === allocation.game_id);
    if (!game) return;
    setDispatchGame(game);
    setDispatchAllocation(allocation);
    setDispatchModalVisible(true);
  };

  const handleSlotAllocated = (allocation: ClientAllocation, client?: Client) => {
    setSlotModalVisible(false);
    if (selectedGameForSlot) {
      setDispatchGame(selectedGameForSlot);
      setDispatchAllocation(allocation);
      setDispatchModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <ModernHeader
        title={isSeller ? t('inventoryTitle') : t('headerVaultTitle')}
        subtitle={isSeller ? t('inventorySubtitle') : t('headerVaultSubtitle')}
      />

      <View style={styles.controlsHeader}>
        {/* QUICK ADD TOP WIDGET */}
        <QuickAddWidget
          actions={[
            {
              label: isSeller ? t('quickAddInventory') : t('quickAddNewGame'),
              sublabel: isSeller
                ? (isRTL ? 'تسجيل حساب وسعر الشراء والسلوتات' : 'Register account, cost price & console slots')
                : t('quickAddNewGameSub'),
              icon: 'game',
              onPress: () => setGameModalVisible(true),
            },
          ]}
        />

        {/* SEARCH BAR */}
        <View style={[styles.searchBar, isNativeRTL && { flexDirection: 'row-reverse' }]}>
          <Search
            size={16}
            color={styles.searchIcon.color}
            strokeWidth={2.2}
            style={[styles.searchIconMargin, isRTL ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8 }]}
          />
          <TextInput
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={styles.searchIcon.color}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color={styles.clearIcon.color} strokeWidth={2} style={styles.clearIconPadding} />
            </Pressable>
          )}
        </View>

        {/* FILTER CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={[styles.filterScrollContent, isNativeRTL && { flexDirection: 'row-reverse' }]}
        >
          {(isSeller ? sellerFilterButtons : gamerFilterButtons).map((item) => {
            const isSelected = isSeller
              ? sellerFilter === item.key
              : gamerFilter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  if (isSeller) {
                    setSellerFilter(item.key as SellerFilter);
                  } else {
                    setGamerFilter(item.key as GamerFilter);
                  }
                }}
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipActive : styles.filterChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* GAMES / INVENTORY LIST */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.accentTint.color}
          />
        }
      >
        {filteredGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            {isSeller ? (
              <Package size={48} color={styles.searchIcon.color} strokeWidth={1.5} style={styles.emptyIconMargin} />
            ) : (
              <Gamepad2 size={48} color={styles.searchIcon.color} strokeWidth={1.5} style={styles.emptyIconMargin} />
            )}
            <Text style={styles.emptyTitle}>
              {isSeller ? (isRTL ? 'المخزون فارغ' : 'No Inventory Found') : t('noGamesFound')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? t('noGamesFoundSub')
                : isSeller
                ? (isRTL ? 'أضف أول حساب للمخزون للبدء في توزيع السلوتات والمبيعات.' : 'Add your first master game account to start distributing slots.')
                : t('vaultEmptySub')}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            if (isSeller) {
              return (
                <SellerInventoryCard
                  key={`seller-${game.id}`}
                  game={game}
                  allocations={allocations}
                  clientsMap={clientsMap}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    router.push(`/game/${game.id}`);
                  }}
                  onSellSlot={handleOpenSellSlot}
                  onManageSlot={handleOpenManageSlot}
                  onDispatchWhatsApp={handleOpenDispatchWhatsApp}
                />
              );
            }

            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
            return (
              <GameCard
                key={`buyer-${game.id}`}
                game={game}
                sellerName={seller?.name}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  router.push(`/game/${game.id}`);
                }}
                onSellerPress={seller ? () => router.push(`/seller/${seller.id}`) : undefined}
              />
            );
          })
        )}
      </ScrollView>

      {/* QUICK GAME / INVENTORY REGISTRATION MODAL */}
      <GameFormModal
        visible={gameModalVisible}
        onClose={() => setGameModalVisible(false)}
        onSave={handleSaveGame}
      />

      {/* SLOT ALLOCATION MODAL */}
      {selectedGameForSlot && (
        <SlotAllocationModal
          visible={slotModalVisible}
          game={selectedGameForSlot}
          preselectedSlot={selectedSlotType}
          existingAllocation={editingAllocation}
          onClose={() => {
            setSlotModalVisible(false);
            setSelectedGameForSlot(null);
          }}
          onAllocated={handleSlotAllocated}
        />
      )}

      {/* 1-TAP WHATSAPP DISPATCH MODAL */}
      {dispatchGame && dispatchAllocation && (
        <WhatsAppDispatchModal
          visible={dispatchModalVisible}
          game={dispatchGame}
          allocation={dispatchAllocation}
          client={clientsMap[dispatchAllocation.client_id]}
          onClose={() => {
            setDispatchModalVisible(false);
            setDispatchGame(null);
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
    controlsHeader: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 10,
    },
    searchBar: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      boxShadow: theme === 'dark' ? '0px 1px 4px rgba(0, 0, 0, 0.2)' : '0px 1px 4px rgba(0, 0, 0, 0.04)',
      elevation: 2,
    },
    searchIcon: {
      color: colors.textMuted,
    },
    searchIconMargin: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    clearIcon: {
      color: colors.textSecondary,
    },
    clearIconPadding: {
      paddingHorizontal: 4,
    },
    filterScroll: {
      marginTop: 12,
    },
    filterScrollContent: {
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterChipActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
    },
    filterChipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.02)',
    },
    filterChipText: {
      fontSize: 12,
    },
    filterChipTextActive: {
      color: colors.pillActiveText,
      fontWeight: '800',
    },
    filterChipTextInactive: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingBottom: 135,
    },
    accentTint: {
      color: colors.accent,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
    },
    emptyIconMargin: {
      marginBottom: 12,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
      textAlign: 'center',
    },
  });
