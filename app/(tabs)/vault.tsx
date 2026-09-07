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
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';

type FilterType = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary';

export default function VaultScreen() {
  const router = useRouter();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#00D2FF', letterSpacing: 2 }}>
              VAULT INVENTORY
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#F8FAFC', marginTop: 2 }}>
              Games Library
            </Text>
          </View>

          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/game/add');
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#005bb5' : '#0070D1',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ New Game</Text>
          </Pressable>
        </View>

        {/* SEARCH BAR */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 14,
            borderWidth: 1,
            borderColor: '#1E293B',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Search by game title or PSN email..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: '#FFFFFF', fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={{ color: '#94A3B8', fontSize: 14, paddingHorizontal: 4 }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* FILTER CHIPS */}
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
                  backgroundColor: isSelected ? '#0070D1' : '#0F172A',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0070D1' : '#1E293B',
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : '#94A3B8',
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
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {filteredGames.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🎮</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 17, fontWeight: '800' }}>No Games Found</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
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
                  backgroundColor: pressed ? '#141E33' : '#0F172A',
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isLocked ? '#FF3B30' : '#1E293B',
                  flexDirection: 'row',
                  alignItems: 'center',
                })}
              >
                {game.cover_image_url ? (
                  <Image
                    source={{ uri: game.cover_image_url }}
                    style={{ width: 56, height: 74, borderRadius: 10, backgroundColor: '#080C16' }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 74,
                      borderRadius: 10,
                      backgroundColor: '#1E293B',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View
                      style={{
                        backgroundColor: game.account_type === 'Primary' ? 'rgba(0, 112, 209, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        borderWidth: 0.5,
                        borderColor: game.account_type === 'Primary' ? '#0070D1' : '#9333EA',
                      }}
                    >
                      <Text
                        style={{
                          color: game.account_type === 'Primary' ? '#60A5FA' : '#C084FC',
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        {game.account_type}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor:
                          isLocked
                            ? 'rgba(255, 59, 48, 0.2)'
                            : game.status === 'Active'
                            ? 'rgba(48, 209, 88, 0.2)'
                            : 'rgba(255, 159, 10, 0.2)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        borderWidth: 0.5,
                        borderColor:
                          isLocked
                            ? '#FF3B30'
                            : game.status === 'Active'
                            ? '#30D158'
                            : '#FF9F0A',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            isLocked
                              ? '#FF453A'
                              : game.status === 'Active'
                              ? '#30D158'
                              : '#FF9F0A',
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        {game.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 6 }}>
                    {warranty.isWarrantyActive ? (
                      <>
                        Warranty:{' '}
                        <Text style={{ color: warranty.isExpiringSoon ? '#FF9F0A' : '#30D158', fontWeight: '700' }}>
                          {warranty.daysRemaining} days left
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: '#94A3B8' }}>Warranty Expired</Text>
                    )}
                    {seller && ` • ${seller.name}`}
                  </Text>
                </View>

                <Text style={{ color: '#475569', fontSize: 20, marginLeft: 10 }}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
