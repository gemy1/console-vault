import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Seller, Game, ContactPlatform } from '../../types/vault';
import { ModernHeader } from '../../components/ModernHeader';

const PLATFORMS: { key: ContactPlatform; label: string; icon: string; color: string }[] = [
  { key: 'WhatsApp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { key: 'Telegram', label: 'Telegram', icon: '✈️', color: '#0088CC' },
  { key: 'Discord', label: 'Discord', icon: '👾', color: '#5865F2' },
  { key: 'Other', label: 'Other', icon: '🌐', color: '#8E8E93' },
];

const RATING_PRESETS = ['5.0', '4.8', '4.5', '4.0'];

export default function SellersScreen() {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add Seller Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<ContactPlatform>('WhatsApp');
  const [contactLink, setContactLink] = useState('');
  const [reputationScore, setReputationScore] = useState('5.0');
  const [notes, setNotes] = useState('');

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
    } else if (seller.contact_platform === 'Discord') {
      if (seller.contact_link.startsWith('http')) {
        Linking.openURL(seller.contact_link);
      } else {
        Alert.alert('Discord Handle', `User tag: ${seller.contact_link}`);
      }
    } else {
      if (seller.contact_link.startsWith('http')) {
        Linking.openURL(seller.contact_link);
      } else {
        Alert.alert('Contact Link', seller.contact_link);
      }
    }
  };

  const handleSaveSeller = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a vendor name.');
      return;
    }
    if (!contactLink.trim()) {
      Alert.alert('Required Field', `Please provide the ${platform} handle or phone number.`);
      return;
    }

    const score = parseFloat(reputationScore) || 5.0;
    const clampedScore = Math.min(5.0, Math.max(1.0, score));

    const newSeller: Seller = {
      id: `seller-${Date.now()}`,
      user_id: 'user-demo',
      name: name.trim(),
      contact_platform: platform,
      contact_link: contactLink.trim(),
      reputation_score: clampedScore,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    OfflineVault.addSeller(newSeller);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    loadData();
    setModalVisible(false);

    // Reset Form
    setName('');
    setContactLink('');
    setNotes('');
    setReputationScore('5.0');
    setPlatform('WhatsApp');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MODERN HEADER WITH CIRCULAR BUTTONS BELOW NOTIFICATION BAR */}
      <ModernHeader
        title="Digital Vendors"
        subtitle="Reputation & Contacts"
        showAddButton={true}
        onAddPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          setModalVisible(true);
        }}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* QUICK ADD VENDOR BUTTON */}
        <Pressable
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setModalVisible(true);
          }}
          style={({ pressed }) => ({
            backgroundColor: theme === 'dark' ? 'rgba(0, 112, 209, 0.12)' : '#EFF6FF',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.accent,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: -2 }}>+</Text>
          </View>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '800' }}>
            Add New Digital Vendor
          </Text>
        </Pressable>

        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14 }}>
          Tap a vendor to inspect all supplied games, credentials, and warranty status.
        </Text>

        {sellers.map((seller) => {
          const sellerGamesCount = getSellerGamesCount(seller.id);
          const isWhatsApp = seller.contact_platform === 'WhatsApp';
          const isTelegram = seller.contact_platform === 'Telegram';
          const isDiscord = seller.contact_platform === 'Discord';

          const platformColor = isWhatsApp
            ? '#25D366'
            : isTelegram
            ? '#0088CC'
            : isDiscord
            ? '#5865F2'
            : '#8E8E93';

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
                          backgroundColor: `${platformColor}20`,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 0.5,
                          borderColor: platformColor,
                        }}
                      >
                        <Text
                          style={{
                            color: platformColor,
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

      {/* ADD SELLER MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: '90%',
            }}
          >
            {/* SHEET HANDLE */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* MODAL HEADER */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 24 }}>🛡️</Text>
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
                    Register Vendor
                  </Text>
                </View>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 18 }}>
                Save trusted vendor contacts for 1-tap warranty replacements and support.
              </Text>

              {/* VENDOR NAME */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                VENDOR / STORE NAME *
              </Text>
              <TextInput
                placeholder="e.g. PlayStation Elite Keys"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              />

              {/* CONTACT PLATFORM SELECTOR */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                CONTACT PLATFORM *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {PLATFORMS.map((p) => {
                  const isSelected = platform === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        setPlatform(p.key);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: isSelected ? p.color : colors.surfaceSubtle,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isSelected ? p.color : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : colors.text,
                          fontSize: 11,
                          fontWeight: '800',
                          marginTop: 2,
                        }}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* CONTACT LINK / HANDLE */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                {platform.toUpperCase()} NUMBER OR USERNAME *
              </Text>
              <TextInput
                placeholder={
                  platform === 'WhatsApp'
                    ? '+1 202 555 0192'
                    : platform === 'Telegram'
                    ? '@store_support'
                    : platform === 'Discord'
                    ? 'support#1234 or discord.gg/link'
                    : 'https://store-link.com or handle'
                }
                placeholderTextColor={colors.textMuted}
                value={contactLink}
                onChangeText={setContactLink}
                autoCapitalize="none"
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              />

              {/* REPUTATION RATING PRESETS */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                REPUTATION RATING
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {RATING_PRESETS.map((preset) => {
                  const isSelected = reputationScore === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setReputationScore(preset)}
                      style={{
                        flex: 1,
                        backgroundColor: isSelected ? (theme === 'dark' ? 'rgba(255, 215, 0, 0.2)' : '#FEF3C7') : colors.surfaceSubtle,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: isSelected ? '#F59E0B' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#D97706' : colors.textSecondary,
                          fontSize: 13,
                          fontWeight: '800',
                        }}
                      >
                        ★ {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* NOTES */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                WARRANTY & SUPPORT NOTES (OPTIONAL)
              </Text>
              <TextInput
                placeholder="e.g. 6-month primary warranty, instant replacement via WhatsApp."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 20,
                  minHeight: 70,
                  textAlignVertical: 'top',
                  fontSize: 14,
                }}
              />

              {/* ACTION BUTTONS */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 15,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: colors.surfaceSubtle,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSaveSeller}
                  style={({ pressed }) => ({
                    flex: 2,
                    paddingVertical: 15,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.8 : 1,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  })}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Save Vendor
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
