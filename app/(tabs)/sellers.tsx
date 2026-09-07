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
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';

export default function SellersScreen() {
  const router = useRouter();
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
    e.stopPropagation(); // Don't trigger card navigation
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16' }}>
      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#00D2FF', letterSpacing: 2 }}>
          VENDOR NETWORK
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#F8FAFC', marginTop: 2 }}>
          Digital Sellers
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          Tap a vendor to view all supplied games, credentials, and warranty status.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {sellers.map((seller) => {
          const sellerGamesCount = getSellerGamesCount(seller.id);
          const isWhatsApp = seller.contact_platform === 'WhatsApp';
          const isTelegram = seller.contact_platform === 'Telegram';

          return (
            <Pressable
              key={seller.id}
              onPress={() => openSellerProfile(seller.id)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#141E33' : '#0F172A',
                borderRadius: 18,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#1E293B',
              })}
            >
              {/* TOP ROW: ICON, NAME, RATING */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: '#1E293B',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#334155',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>🛡️</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                      {seller.name}
                    </Text>

                    {/* PLATFORM & GAMES COUNT ROW */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View
                        style={{
                          backgroundColor: isWhatsApp ? 'rgba(37, 211, 102, 0.15)' : 'rgba(0, 136, 204, 0.15)',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 0.5,
                          borderColor: isWhatsApp ? '#25D366' : '#0088CC',
                        }}
                      >
                        <Text
                          style={{
                            color: isWhatsApp ? '#25D366' : '#0088CC',
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {seller.contact_platform}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: '#1E293B',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>
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
                  <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '800' }}>
                    {seller.reputation_score.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* NOTES / BIO */}
              {seller.notes && (
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 10, lineHeight: 16 }}>
                  {seller.notes}
                </Text>
              )}

              {/* BOTTOM ACTION BAR */}
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#1E293B',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                  View {sellerGamesCount} Games →
                </Text>

                <Pressable
                  onPress={(e) => openQuickChat(seller, e)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#005bb5' : '#0070D1',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  })}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
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
