import { useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { ModernHeader, QuickAddWidget } from '../../components/common';
import { GameCard, GameFormModal } from '../../components/games';
import { Game } from '../../types/vault';
import { Search, X, Gamepad2 } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

import { useVaultSync } from '../../context/VaultSyncContext';

type FilterType = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary' | 'Full';

export default function VaultScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const { games, sellers, addGame, refreshData } = useVaultSync();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const handleSaveGame = (gameData: any) => {
    const newGame: Game = {
      id: `game-${Date.now()}`,
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

  const onRefresh = () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const filteredGames = games.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.psn_email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Active') return g.status === 'Active';
    if (filter === 'Locked') return g.status === 'Locked';
    if (filter === 'Primary') return g.account_type === 'Primary';
    if (filter === 'Secondary') return g.account_type === 'Secondary';
    if (filter === 'Full') return g.account_type === 'Full';
    return true;
  });

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'All', label: t('filterAll') },
    { key: 'Active', label: t('filterActive') },
    { key: 'Locked', label: t('filterLocked') },
    { key: 'Primary', label: t('filterPrimary') },
    { key: 'Secondary', label: t('filterSecondary') },
    { key: 'Full', label: t('filterFull') },
  ];

  return (
    <View style={styles.container}>
      {/* MODERN HEADER WITH CIRCULAR BUTTONS BELOW NOTIFICATION BAR */}
      <ModernHeader
        title={t('headerVaultTitle')}
        subtitle={t('headerVaultSubtitle')}
      />

      <View style={styles.controlsHeader}>
        {/* QUICK ADD GAME TOP WIDGET */}
        <QuickAddWidget
          actions={[
            {
              label: t('quickAddNewGame'),
              sublabel: t('quickAddNewGameSub'),
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
          {filterButtons.map((item) => {
            const isSelected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setFilter(item.key);
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

      {/* GAMES LIST */}
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
            <Gamepad2 size={48} color={styles.searchIcon.color} strokeWidth={1.5} style={styles.emptyIconMargin} />
            <Text style={styles.emptyTitle}>{t('noGamesFound')}</Text>
            <Text style={styles.emptySubtitle}>
              {search ? t('noGamesFoundSub') : t('vaultEmptySub')}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
            return (
              <GameCard
                key={game.id}
                game={game}
                sellerName={seller?.name}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  router.push(`/game/${game.id}`);
                }}
                onSellerPress={seller ? () => router.push(`/seller/${seller.id}`) : undefined}
              />
            );
          })
        )}
      </ScrollView>

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
      paddingBottom: 96,
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
