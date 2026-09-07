import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { ModernHeader } from '../../components/ModernHeader';

export default function SellersScreen() {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setSellers(OfflineVault.getSellers());
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

  const getSellerGamesCount = (sellerId: string) => {
    return games.filter((g) => g.seller_id === sellerId).length;
  };

  const openSellerProfile = (sellerId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(`/seller/${sellerId}`);
  };

  const openQuickChat = (seller: Seller, e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (seller.contact_platform === 'WhatsApp') {
      const cleanPhone = seller.contact_link.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`);
    } else if (seller.contact_platform === 'Telegram') {
      const handle = seller.contact_link.replace(/^@/, '');
      Linking.openURL(`https://t.me/${handle}`);
    } else {
      Linking.openURL(seller.contact_link);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {/* MODERN HEADER */}
      <ModernHeader
        title="Digital Vendors"
        subtitle="Reputation & Contacts"
        showAddButton={false}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14 }}>
          Tap a vendor to inspect all supplied games, credentials, and warranty status.
        </Text>

        {sellers.map((seller) => {
          const sellerGamesCount = getSellerGamesCount(seller.id);
          const isWhatsApp = seller.contact_platform === 'WhatsApp';

          return (
            <Pressable
              key={seller.id}
              onPress={() => openSellerProfile(seller.id)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                borderRadius: 20,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
                shadowRadius: 6,
              })}
            >
              {/* TOP ROW: ICON, NAME, RATING */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.surfaceSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>🛡️</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                      {seller.name}
                    </Text>

                    {/* PLATFORM & GAMES COUNT ROW */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View
                        style={{
                          backgroundColor: isWhatsApp ? 'rgba(37, 211, 102, 0.15)' : 'rgba(0, 136, 204, 0.15)',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: isWhatsApp ? '#25D366' : '#0088CC',
                            fontSize: 10,
                            fontWeight: '800',
                          }}
                        >
                          {seller.contact_platform}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: colors.surfaceSubtle,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                          {sellerGamesCount} {sellerGamesCount === 1 ? 'Game' : 'Games'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* STAR RATING */}
                <View
                  style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.12)',
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    borderWidth: 0.5,
                    borderColor: '#FFD700',
                  }}
                >
                  <Text style={{ color: '#FFD700', fontSize: 12 }}>★</Text>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>
                    {seller.reputation_score.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* NOTES */}
              {seller.notes && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 16 }}>
                  {seller.notes}
                </Text>
              )}

              {/* BOTTOM ACTION BAR */}
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>
                  View {sellerGamesCount} Games →
                </Text>

                <Pressable
                  onPress={(e) => openQuickChat(seller, e)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#005bb5' : '#0070D1',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 8,
                  })}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    Chat Now
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
