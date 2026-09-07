import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';

export default function SellerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const allSellers = OfflineVault.getSellers();
    const foundSeller = allSellers.find((s) => s.id === id);
    if (foundSeller) {
      setSeller(foundSeller);
      const allGames = OfflineVault.getGames();
      const sellerGames = allGames.filter((g) => g.seller_id === id);
      setGames(sellerGames);
    }
  }, [id]);

  if (!seller) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F8FAFC', fontSize: 16 }}>Seller not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const openSellerChat = () => {
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

  const copyContact = async () => {
    await Clipboard.setStringAsync(seller.contact_link);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lockedGamesCount = games.filter((g) => g.status === 'Locked').length;
  const activeWarrantiesCount = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  }).length;

  const isWhatsApp = seller.contact_platform === 'WhatsApp';
  const isTelegram = seller.contact_platform === 'Telegram';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16' }}>
      {/* HEADER BAR */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: pressed ? '#1E293B' : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
          })}
        >
          <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
        <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>Vendor Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* SELLER HERO CARD */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: '#1E293B',
            alignItems: 'center',
          }}
        >
          {/* AVATAR */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#1E293B',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#00D2FF',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 32 }}>🛡️</Text>
          </View>

          <Text style={{ color: '#F8FAFC', fontSize: 20, fontWeight: '800' }}>{seller.name}</Text>

          {/* BADGES ROW */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View
              style={{
                backgroundColor: isWhatsApp ? 'rgba(37, 211, 102, 0.15)' : 'rgba(0, 136, 204, 0.15)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isWhatsApp ? '#25D366' : '#0088CC',
              }}
            >
              <Text
                style={{
                  color: isWhatsApp ? '#25D366' : '#0088CC',
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {seller.contact_platform}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.12)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#FFD700',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ color: '#FFD700', fontSize: 13 }}>★</Text>
              <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '800' }}>
                {seller.reputation_score.toFixed(1)} / 5.0
              </Text>
            </View>
          </View>

          {/* CONTACT INFO */}
          <Pressable
            onPress={copyContact}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: '#1E293B',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Handle:</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '600' }}>{seller.contact_link}</Text>
            <Text style={{ color: copied ? '#30D158' : '#00D2FF', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </Text>
          </Pressable>

          {seller.notes && (
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 18 }}>
              {seller.notes}
            </Text>
          )}

          {/* CHAT ACTION BUTTON */}
          <Pressable
            onPress={openSellerChat}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#005bb5' : '#0070D1',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              marginTop: 16,
              width: '100%',
              alignItems: 'center',
            })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
              Open Direct Chat in {seller.contact_platform} →
            </Text>
          </Pressable>
        </View>

        {/* METRICS ROW */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#0F172A',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
              Games Supplied
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {games.length}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#0F172A',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
              Active Warranty
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {activeWarrantiesCount}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: lockedGamesCount > 0 ? '#261014' : '#0F172A',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: lockedGamesCount > 0 ? '#FF3B30' : '#1E293B',
            }}
          >
            <Text
              style={{
                color: lockedGamesCount > 0 ? '#FF453A' : '#94A3B8',
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Locked
            </Text>
            <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {lockedGamesCount}
            </Text>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <Text style={{ color: '#F8FAFC', fontSize: 17, fontWeight: '800' }}>
            Games from this Seller ({games.length})
          </Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
            Tap any game to inspect credentials, status, or warranty
          </Text>
        </View>

        {/* GAMES LIST */}
        {games.length === 0 ? (
          <View style={{ backgroundColor: '#0F172A', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>No games associated with this seller yet.</Text>
          </View>
        ) : (
          games.map((game) => {
            const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
            const isLocked = game.status === 'Locked';

            return (
              <Pressable
                key={game.id}
                onPress={() => router.push(`/game/${game.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#172033' : '#0F172A',
                  borderRadius: 16,
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
                    style={{ width: 56, height: 72, borderRadius: 10, backgroundColor: '#080C16' }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 72,
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

                  {/* PILLS */}
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

                  {/* WARRANTY STATUS */}
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 6 }}>
                    {warranty.isWarrantyActive ? (
                      <>
                        Warranty:{' '}
                        <Text style={{ color: warranty.isExpiringSoon ? '#FF9F0A' : '#30D158', fontWeight: '700' }}>
                          {warranty.daysRemaining} days remaining
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: '#94A3B8' }}>Warranty Expired</Text>
                    )}
                  </Text>
                </View>

                <Text style={{ color: '#475569', fontSize: 20, marginLeft: 8 }}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
