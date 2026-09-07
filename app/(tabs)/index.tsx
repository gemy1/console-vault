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
import * as Haptics from 'expo-haptics';
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

  const totalGames = games.length;
  const lockedGames = games.filter((g) => g.status === 'Locked');
  const activeWarranties = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive && g.status !== 'Dead Loss' && g.status !== 'Archived';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {/* TOP HERO HEADER */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D2FF' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#00D2FF', letterSpacing: 2 }}>
                  CONSOLE VAULT
                </Text>
              </View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#F8FAFC', marginTop: 2 }}>
                PS5 Operations Hub
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
                paddingVertical: 9,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                shadowColor: '#0070D1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>+ Add Game</Text>
            </Pressable>
          </View>
        </View>

        {/* METRICS ROW */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
          {/* Total Games */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#0F172A',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Vault Total
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {totalGames}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Digital Licenses</Text>
          </View>

          {/* Active Warranties */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#0F172A',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Warranties
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {activeWarranties.length}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>Covered Active</Text>
          </View>

          {/* Locked */}
          <View
            style={{
              flex: 1,
              backgroundColor: lockedGames.length > 0 ? '#261014' : '#0F172A',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: lockedGames.length > 0 ? '#FF3B30' : '#1E293B',
            }}
          >
            <Text
              style={{
                color: lockedGames.length > 0 ? '#FF453A' : '#94A3B8',
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Locked
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {lockedGames.length}
            </Text>
            <Text style={{ color: lockedGames.length > 0 ? '#FFA299' : '#64748B', fontSize: 10, marginTop: 2 }}>
              {lockedGames.length > 0 ? 'Padlock Active' : 'All Clear'}
            </Text>
          </View>
        </View>

        {/* PADLOCK PROTOCOL SECTION (IF ANY LOCKED) */}
        {lockedGames.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: '#1E0E12',
                borderRadius: 20,
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
                <View style={{ backgroundColor: 'rgba(255, 59, 48, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ color: '#FF453A', fontSize: 11, fontWeight: '700' }}>
                    {lockedGames.length} Action Needed
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#E2E8F0', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                Sony has revoked access for the account(s) below. Tap to generate warranty replacement claim text.
              </Text>

              {lockedGames.map((game) => {
                const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
                const warranty = calculateWarranty(game.purchase_date, game.warranty_months);

                return (
                  <View
                    key={game.id}
                    style={{
                      backgroundColor: '#2A1318',
                      borderRadius: 14,
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
                        style={{ width: 46, height: 60, borderRadius: 8, backgroundColor: '#080C16' }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 46,
                          height: 60,
                          borderRadius: 8,
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

                      {/* Tappable Seller Link */}
                      {seller && (
                        <Pressable onPress={() => router.push(`/seller/${seller.id}`)}>
                          <Text style={{ color: '#00D2FF', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                            Seller: {seller.name} →
                          </Text>
                        </Pressable>
                      )}

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
                          : 'Warranty Expired'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
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
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        Contact
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ALL GAMES & ACTIVE WARRANTIES */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#F8FAFC', fontSize: 17, fontWeight: '800' }}>
              Your Games & Coverage
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/vault')}>
              <Text style={{ color: '#00D2FF', fontSize: 13, fontWeight: '700' }}>View All →</Text>
            </Pressable>
          </View>

          {games.map((game) => {
            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
            const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
            const isLocked = game.status === 'Locked';

            // Calculate progress percentage (0 - 100)
            const totalDays = game.warranty_months * 30.4;
            const progressPercent = Math.min(100, Math.max(0, (warranty.daysRemaining / totalDays) * 100));

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
                {/* Cover Art */}
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

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  {/* Pills Row */}
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

                    {/* Tappable Seller Pill */}
                    {seller && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/seller/${seller.id}`);
                        }}
                        style={{
                          backgroundColor: '#1E293B',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                          {seller.name}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Warranty Progress Bar */}
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                        {warranty.isWarrantyActive ? (
                          <>
                            <Text style={{ color: warranty.isExpiringSoon ? '#FF9F0A' : '#30D158', fontWeight: '700' }}>
                              {warranty.daysRemaining} days left
                            </Text>
                            {' '}({game.warranty_months}m warranty)
                          </>
                        ) : (
                          <Text style={{ color: '#94A3B8' }}>Expired ({warranty.expiryDate})</Text>
                        )}
                      </Text>
                    </View>

                    {/* Progress Track */}
                    <View
                      style={{
                        height: 4,
                        backgroundColor: '#1E293B',
                        borderRadius: 2,
                        marginTop: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: warranty.isExpiringSoon
                            ? '#FF9F0A'
                            : warranty.isWarrantyActive
                            ? '#30D158'
                            : '#64748B',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Right Arrow */}
                <Text style={{ color: '#475569', fontSize: 20, marginLeft: 10 }}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
