import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';
import { ModernHeader } from '../../components/ModernHeader';
import {
  MessageCircle,
  ShieldCheck,
  Star,
  Copy,
  Check,
  Gamepad2,
  ChevronRight,
} from 'lucide-react-native';

export default function SellerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Seller not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>← Go Back</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MODERN HEADER WITH CIRCULAR BACK BUTTON & CHAT ACTION */}
      <ModernHeader
        title="Vendor Profile"
        subtitle={seller.name}
        showBackButton={true}
        rightAction={
          <Pressable
            onPress={openSellerChat}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 4,
            })}
          >
            <MessageCircle size={20} color={colors.accent} strokeWidth={2.2} />
          </Pressable>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* SELLER HERO CARD (Inspired by Fintech Profile Card Image 2) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 22,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
            shadowRadius: 8,
          }}
        >
          {/* AVATAR */}
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.surfaceSubtle,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.accent,
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={38} color={colors.accent} strokeWidth={2} />
          </View>

          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{seller.name}</Text>

          {/* BADGES ROW */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View
              style={{
                backgroundColor: isWhatsApp ? 'rgba(37, 211, 102, 0.15)' : 'rgba(0, 136, 204, 0.15)',
                paddingHorizontal: 12,
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
                  fontWeight: '800',
                }}
              >
                {seller.contact_platform}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.12)',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#FFD700',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>
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
              marginTop: 14,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: colors.surfaceSubtle,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Handle:</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{seller.contact_link}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 }}>
              {copied ? (
                <Check size={12} color={colors.success} strokeWidth={2.4} />
              ) : (
                <Copy size={12} color={colors.accent} strokeWidth={2.2} />
              )}
              <Text style={{ color: copied ? colors.success : colors.accent, fontSize: 11, fontWeight: '800' }}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </Pressable>

          {seller.notes && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 18 }}>
              {seller.notes}
            </Text>
          )}

          {/* CHAT ACTION BUTTON */}
          <Pressable
            onPress={openSellerChat}
            style={({ pressed }) => ({
              backgroundColor: colors.text,
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 14,
              marginTop: 18,
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 14 }}>
              Open Direct Chat in {seller.contact_platform}
            </Text>
            <ChevronRight size={16} color={colors.bg} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* METRICS ROW */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Games Supplied
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {games.length}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Active Warranty
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {activeWarrantiesCount}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: lockedGamesCount > 0 ? (theme === 'dark' ? '#261014' : '#FEF2F2') : colors.surface,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: lockedGamesCount > 0 ? colors.danger : colors.border,
            }}
          >
            <Text
              style={{
                color: lockedGamesCount > 0 ? colors.danger : colors.textMuted,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Locked
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {lockedGamesCount}
            </Text>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            Games from this Seller ({games.length})
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            Tap any game to inspect credentials, status, or warranty
          </Text>
        </View>

        {/* GAMES LIST */}
        {games.length === 0 ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No games associated with this seller yet.</Text>
          </View>
        ) : (
          games.map((game) => {
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
                    style={{ width: 60, height: 78, borderRadius: 12, backgroundColor: colors.surfaceSubtle }}
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 78,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Gamepad2 size={24} color={colors.textMuted} strokeWidth={1.8} />
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {game.title}
                  </Text>

                  {/* PILLS */}
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

                  {/* WARRANTY STATUS */}
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
                  </Text>
                </View>

                {/* Circular Arrow */}
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
                  <ChevronRight size={16} color={colors.text} strokeWidth={2.4} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
