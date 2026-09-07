import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';

type FilterType = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary';

export default function VaultScreen() {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 2 }}>
              VAULT INVENTORY
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 }}>
              Games Library
            </Text>
          </View>

          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/game/add');
            }}
            style={({ pressed }) => ({
              backgroundColor: colors.text,
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 20,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 12 }}>+ New Game</Text>
          </Pressable>
        </View>

        {/* SEARCH BAR (Inspired by TripGlide Image 1) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 14,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Search by game title or PSN email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, paddingHorizontal: 4 }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* FILTER CHIPS (Inspired by TripGlide Image 1) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8 }}
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
                style={{
                  backgroundColor: isSelected ? colors.pillActiveBg : colors.surface,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.pillActiveBg : colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isSelected ? 0.15 : 0.03,
                  shadowRadius: 3,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? colors.pillActiveText : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected ? '800' : '600',
                  }}
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
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />}
      >
        {filteredGames.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🎮</Text>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>No Games Found</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              {search ? 'Try adjusting your search query or filter.' : 'Your vault is currently empty.'}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
            const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
            const isLocked = game.status === 'Locked';

            return (
              <Pressable
                key={game.id}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  router.push(`/game/${game.id}`);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                  borderRadius: 22,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isLocked ? colors.danger : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
                  shadowRadius: 6,
                })}
              >
                {game.cover_image_url ? (
                  <Image
                    source={{ uri: game.cover_image_url }}
                    style={{ width: 62, height: 82, borderRadius: 14, backgroundColor: colors.surfaceSubtle }}
                  />
                ) : (
                  <View
                    style={{
                      width: 62,
                      height: 82,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View
                      style={{
                        backgroundColor: game.account_type === 'Primary' ? 'rgba(0, 112, 209, 0.15)' : 'rgba(147, 51, 234, 0.15)',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: game.account_type === 'Primary' ? '#0070D1' : '#9333EA',
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {game.account_type}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor:
                          isLocked
                            ? (theme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : '#FEE2E2')
                            : game.status === 'Active'
                            ? (theme === 'dark' ? 'rgba(48, 209, 88, 0.2)' : '#ECFDF5')
                            : 'rgba(255, 159, 10, 0.2)',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            isLocked
                              ? colors.danger
                              : game.status === 'Active'
                              ? colors.success
                              : colors.warning,
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {game.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
                    {warranty.isWarrantyActive ? (
                      <>
                        Warranty:{' '}
                        <Text style={{ color: warranty.isExpiringSoon ? colors.warning : colors.success, fontWeight: '800' }}>
                          {warranty.daysRemaining} days left
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: colors.textMuted }}>Warranty Expired</Text>
                    )}
                    {seller && ` • ${seller.name}`}
                  </Text>
                </View>

                {/* Circular Arrow Button */}
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: colors.surfaceSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 10,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>→</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
