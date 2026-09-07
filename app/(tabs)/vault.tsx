import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { ModernHeader } from '../../components/ModernHeader';
import { GameCard } from '../../components/GameCard';
import { Game, Seller } from '../../types/vault';
import { Search, X, Gamepad2 } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

type FilterType = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary';

export default function VaultScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const [games, setGames] = useState<Game[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setGames(OfflineVault.getGames());
    setSellers(OfflineVault.getSellers());
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
    return true;
  });

  const filterButtons: FilterType[] = ['All', 'Active', 'Locked', 'Primary', 'Secondary'];

  return (
    <View style={styles.container}>
      {/* MODERN HEADER WITH CIRCULAR BUTTONS BELOW NOTIFICATION BAR */}
      <ModernHeader
        title="Game Vault"
        subtitle="Inventory & Licenses"
        showAddButton={true}
        onAddPress={() => router.push('/game/add')}
      />

      <View style={styles.controlsHeader}>
        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Search size={16} color={styles.searchIcon.color} strokeWidth={2.2} style={styles.searchIconMargin} />
          <TextInput
            placeholder="Search by game title or PSN email..."
            placeholderTextColor={styles.searchIcon.color}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
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
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterButtons.map((item) => {
            const isSelected = filter === item;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setFilter(item);
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
                  {item}
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
            <Text style={styles.emptyTitle}>No Games Found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try adjusting your search query or filter.' : 'Your vault is currently empty.'}
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
      shadowRadius: 4,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
    },
    filterChipActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
      shadowOpacity: 0.12,
    },
    filterChipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowOpacity: 0.02,
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
      paddingBottom: 40,
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
