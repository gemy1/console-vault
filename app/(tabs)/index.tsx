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
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import { calculateWarranty, generateSellerDeepLink } from '../../utils/padlock';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';
import { ModernHeader } from '../../components/ModernHeader';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [games, setGames] = useState<Game[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Active' | 'Locked'>('All');

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

  const displayedGames = games.filter((g) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Active') return g.status === 'Active';
    if (selectedCategory === 'Locked') return g.status === 'Locked';
    return true;
  });

  const categories = [
    { key: 'All', label: `All (${totalGames})` },
    { key: 'Active', label: `Active (${activeWarranties.length})` },
    { key: 'Locked', label: `Locked (${lockedGames.length})` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MODERN HEADER (Sits comfortably below the notification bar with circular buttons) */}
      <ModernHeader
        title="Console Vault"
        subtitle="PS5 Operations Hub"
        showAddButton={true}
        onAddPress={() => router.push('/game/add')}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* METRICS ROW (Inspired by Fintech / Invoice Image 2) */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 18 }}>
          {/* Total Games */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
              shadowRadius: 6,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Vault Total
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {totalGames}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>Games Stored</Text>
          </View>

          {/* Active Warranties */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
              shadowRadius: 6,
            }}
          >
            <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Warranty
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {activeWarranties.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>Guaranteed</Text>
          </View>

          {/* Locked */}
          <View
            style={{
              flex: 1,
              backgroundColor: lockedGames.length > 0 ? (theme === 'dark' ? '#261014' : '#FEF2F2') : colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: lockedGames.length > 0 ? colors.danger : colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
              shadowRadius: 6,
            }}
          >
            <Text
              style={{
                color: lockedGames.length > 0 ? colors.danger : colors.textMuted,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Locked
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {lockedGames.length}
            </Text>
            <Text
              style={{
                color: lockedGames.length > 0 ? colors.danger : colors.textSecondary,
                fontSize: 10,
                marginTop: 2,
              }}
            >
              {lockedGames.length > 0 ? 'Padlock Alert' : 'All Clear'}
            </Text>
          </View>
        </View>

        {/* PADLOCK PROTOCOL SECTION (IF ANY LOCKED) */}
        {lockedGames.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: theme === 'dark' ? '#1E0E12' : '#FEF2F2',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1.5,
                borderColor: colors.danger,
                shadowColor: colors.danger,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
                shadowRadius: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PulsingPadlockBadge size="md" showLabel={false} />
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
                    PADLOCK PROTOCOL ACTIVE
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '800' }}>
                    {lockedGames.length} Revoked
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                Sony has revoked access for the account(s) below. Tap to generate warranty replacement claim text.
              </Text>

              {lockedGames.map((game) => {
                const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
                const warranty = calculateWarranty(game.purchase_date, game.warranty_months);

                return (
                  <View
                    key={game.id}
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A1318' : '#FFFFFF',
                      borderRadius: 16,
                      padding: 12,
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: theme === 'dark' ? '#4A1D24' : '#FEE2E2',
                    }}
                  >
                    {game.cover_image_url ? (
                      <Image
                        source={{ uri: game.cover_image_url }}
                        style={{ width: 48, height: 64, borderRadius: 10, backgroundColor: colors.surfaceSubtle }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 64,
                          borderRadius: 10,
                          backgroundColor: colors.surfaceSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>🎮</Text>
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
                        {game.title}
                      </Text>

                      {seller && (
                        <Pressable onPress={() => router.push(`/seller/${seller.id}`)}>
                          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                            Seller: {seller.name} →
                          </Text>
                        </Pressable>
                      )}

                      <Text
                        style={{
                          color: warranty.isWarrantyActive ? colors.success : colors.danger,
                          fontSize: 11,
                          fontWeight: '700',
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
                        backgroundColor: pressed ? '#DC2626' : colors.danger,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                      })}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        Claim
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* CATEGORY PILLS (TripGlide Style) */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
            Vault Collection
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setSelectedCategory(cat.key as any);
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
                    shadowOpacity: isSelected ? 0.12 : 0.02,
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
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* MODERN GAME CARDS LIST */}
        <View style={{ paddingHorizontal: 20 }}>
          {displayedGames.map((game) => {
            const seller = game.seller_id ? sellerMap.get(game.seller_id) : undefined;
            const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
            const isLocked = game.status === 'Locked';

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
                  backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                  borderRadius: 20,
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
                {/* Cover Art */}
                {game.cover_image_url ? (
                  <Image
                    source={{ uri: game.cover_image_url }}
                    style={{ width: 62, height: 82, borderRadius: 12, backgroundColor: colors.surfaceSubtle }}
                  />
                ) : (
                  <View
                    style={{
                      width: 62,
                      height: 82,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>🎮</Text>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  {/* Badges Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
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

                    {seller && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/seller/${seller.id}`);
                        }}
                        style={{
                          backgroundColor: colors.surfaceSubtle,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                          {seller.name}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Warranty Countdown & Progress Track */}
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                        {warranty.isWarrantyActive ? (
                          <>
                            <Text style={{ color: warranty.isExpiringSoon ? colors.warning : colors.success, fontWeight: '800' }}>
                              {warranty.daysRemaining} days left
                            </Text>
                            {' '}({game.warranty_months}m warranty)
                          </>
                        ) : (
                          <Text style={{ color: colors.textMuted }}>Expired ({warranty.expiryDate})</Text>
                        )}
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 5,
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: 3,
                        marginTop: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: warranty.isExpiringSoon
                            ? colors.warning
                            : warranty.isWarrantyActive
                            ? colors.success
                            : colors.textMuted,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
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
          })}
        </View>
      </ScrollView>
    </View>
  );
}
