import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import { calculateWarranty, generateSellerDeepLink } from '../../utils/padlock';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';

export default function DashboardScreen() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    const loadedGames = OfflineVault.getGames();
    const loadedSellers = OfflineVault.getSellers();
    setGames(loadedGames);
    setSellers(loadedSellers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 400);
  };

  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  // Metrics
  const totalGames = games.length;
  const lockedGames = games.filter((g) => g.status === 'Locked');
  const activeWarranties = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive && g.status !== 'Dead Loss' && g.status !== 'Archived';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {/* TOP HEADER */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#00D2FF', letterSpacing: 2 }}>
                CONSOLE VAULT
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#F8FAFC', marginTop: 2 }}>
                PS5 Operations Hub
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/game/add')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#005bb5' : '#0070D1',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ Add Game</Text>
            </Pressable>
          </View>
        </View>

        {/* METRICS ROW */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
          {/* Total Games */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#111726',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
              Total Vault
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {totalGames}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Digital Accounts</Text>
          </View>

          {/* Active Warranties */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#111726',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
              Warranties
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {activeWarranties.length}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Guaranteed Active</Text>
          </View>

          {/* Locked / Attention */}
          <View
            style={{
              flex: 1,
              backgroundColor: lockedGames.length > 0 ? '#261014' : '#111726',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: lockedGames.length > 0 ? '#FF3B30' : '#1E293B',
            }}
          >
            <Text
              style={{
                color: lockedGames.length > 0 ? '#FF453A' : '#94A3B8',
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Locked
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {lockedGames.length}
            </Text>
            <Text style={{ color: lockedGames.length > 0 ? '#FF857F' : '#64748B', fontSize: 10, marginTop: 2 }}>
              {lockedGames.length > 0 ? 'Requires Action' : 'All Clear'}
            </Text>
          </View>
        </View>

        {/* PADLOCK PROTOCOL SECTION (IF ANY GAMES ARE LOCKED) */}
        {lockedGames.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: '#1C0D11',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1.5,
                borderColor: '#FF3B30',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PulsingPadlockBadge size="md" showLabel={false} />
                  <Text style={{ color: '#FF453A', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>
                    PADLOCK PROTOCOL ACTIVE
                  </Text>
                </View>
                <Text style={{ color: '#FFA299', fontSize: 11, fontWeight: '600' }}>
                  {lockedGames.length} Account(s) Revoked
                </Text>
              </View>

              <Text style={{ color: '#E2E8F0', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                PlayStation has revoked access for the accounts below. Tap to generate pre-filled seller warranty claims.
              </Text>

              {lockedGames.map((game) => {
                const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
                const warranty = calculateWarranty(game.purchase_date, game.warranty_months);

                return (
                  <View
                    key={game.id}
                    style={{
                      backgroundColor: '#2E151A',
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#4A1D24',
                    }}
                  >
                    {game.cover_image_url ? (
                      <Image
                        source={{ uri: game.cover_image_url }}
                        style={{ width: 44, height: 56, borderRadius: 6, backgroundColor: '#111726' }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 56,
                          borderRadius: 6,
                          backgroundColor: '#1E293B',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>🎮</Text>
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {game.title}
                      </Text>
                      <Text style={{ color: '#FDA4AF', fontSize: 11, marginTop: 2 }}>
                        Seller: {seller?.name || 'Unknown'} ({seller?.contact_platform || 'N/A'})
                      </Text>
                      <Text
                        style={{
                          color: warranty.isWarrantyActive ? '#4ADE80' : '#F87171',
                          fontSize: 11,
                          fontWeight: '600',
                          marginTop: 2,
                        }}
                      >
                        {warranty.isWarrantyActive
                          ? `Warranty: ${warranty.daysRemaining} days left`
                          : 'Warranty: Expired'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        const deepLink = generateSellerDeepLink(game, seller);
                        if (deepLink) {
                          Linking.openURL(deepLink);
                        } else {
                          router.push(`/game/${game.id}`);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#DC2626' : '#EF4444',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      })}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                        Contact
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ACTIVE WARRANTIES & ALL GAMES */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>
              Your Games & Warranties
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/vault')}>
              <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '600' }}>View All →</Text>
            </Pressable>
          </View>

          {games.map((game) => {
            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
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
                {/* Cover Art */}
                {game.cover_image_url ? (
                  <Image
                    source={{ uri: game.cover_image_url }}
                    style={{ width: 50, height: 65, borderRadius: 8, backgroundColor: '#080B14' }}
                  />
                ) : (
                  <View
                    style={{
                      width: 50,
                      height: 65,
                      borderRadius: 8,
                      backgroundColor: '#1E293B',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                      {game.title}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {/* Account Type Pill */}
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

                    {/* Status Pill */}
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

                  {/* Warranty Countdown */}
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                      {warranty.isWarrantyActive ? (
                        <>
                          Warranty:{' '}
                          <Text style={{ color: warranty.isExpiringSoon ? '#FF9F0A' : '#30D158', fontWeight: '700' }}>
                            {warranty.daysRemaining} days remaining
                          </Text>
                        </>
                      ) : (
                        <Text style={{ color: '#94A3B8' }}>Warranty Expired ({warranty.expiryDate})</Text>
                      )}
                    </Text>
                  </View>
                </View>

                {/* Right Arrow */}
                <Text style={{ color: '#475569', fontSize: 18, marginLeft: 8 }}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
