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
import { OfflineVault } from '../../services/storage';
import { Game, GameStatus, AccountType } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';

type FilterType = 'All' | 'Active' | 'Locked' | 'Primary' | 'Secondary';

export default function VaultScreen() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setGames(OfflineVault.getGames());
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  // Filtering
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#F8FAFC' }}>Game Vault</Text>
          <Pressable
            onPress={() => router.push('/game/add')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#005bb5' : '#0070D1',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>+ New Game</Text>
          </Pressable>
        </View>

        {/* SEARCH INPUT */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 14,
            borderWidth: 1,
            borderColor: '#1E293B',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Search by title or PSN email..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: '#FFFFFF', fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={{ color: '#94A3B8', fontSize: 14 }}>✕</Text>
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
                onPress={() => setFilter(item)}
                style={{
                  backgroundColor: isSelected ? '#0070D1' : '#111726',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0070D1' : '#1E293B',
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : '#94A3B8',
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
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
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {filteredGames.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎮</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>No Games Found</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              {search ? 'Try adjusting your search or filter criteria.' : 'Your vault is currently empty.'}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            const warranty = calculateWarranty(game.purchase_date, game.warranty_months);

            return (
              <Pressable
                key={game.id}
                onPress={() => router.push(`/game/${game.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#172033' : '#111726',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: game.status === 'Locked' ? '#FF3B30' : '#1E293B',
                  flexDirection: 'row',
                  alignItems: 'center',
                })}
              >
                {game.cover_image_url ? (
                  <Image
                    source={{ uri: game.cover_image_url }}
                    style={{ width: 52, height: 68, borderRadius: 8, backgroundColor: '#080B14' }}
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 68,
                      borderRadius: 8,
                      backgroundColor: '#1E293B',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View
                      style={{
                        backgroundColor: game.account_type === 'Primary' ? '#003A70' : '#4C1D95',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
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
                          game.status === 'Locked'
                            ? '#3A1418'
                            : game.status === 'Active'
                            ? '#0E2E1A'
                            : '#2A1F0C',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            game.status === 'Locked'
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

                  <Text style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>
                    Purchase: {game.purchase_date} • {warranty.daysRemaining}d warranty
                  </Text>
                </View>

                <Text style={{ color: '#475569', fontSize: 18, marginLeft: 8 }}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
