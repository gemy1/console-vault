import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  Star,
  Plus,
  X,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  Layers,
} from 'lucide-react-native';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Seller, Game, ContactPlatform, SellerContactMethod } from '../../types/vault';
import { ModernHeader } from '../../components/ModernHeader';
import { PlatformIcon, PLATFORM_CONFIG } from '../../components/PlatformIcon';
import { openSellerContact, getSellerContactList, formatPlatformHandle } from '../../utils/contacts';

const PLATFORM_LIST: ContactPlatform[] = [
  'WhatsApp',
  'Facebook',
  'Telegram',
  'Discord',
  'Other',
];

const RATING_PRESETS = ['5.0', '4.8', '4.5', '4.0'];

export default function SellersScreen() {
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add / Edit Seller Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [reputationScore, setReputationScore] = useState('5.0');
  const [notes, setNotes] = useState('');

  // Multiple connection methods state
  const [contactMethods, setContactMethods] = useState<SellerContactMethod[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<ContactPlatform>('WhatsApp');
  const [currentValue, setCurrentValue] = useState('');
  const [currentLabel, setCurrentLabel] = useState('');

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

  const openAddModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingSellerId(null);
    setName('');
    setContactMethods([]);
    setCurrentPlatform('WhatsApp');
    setCurrentValue('');
    setCurrentLabel('');
    setReputationScore('5.0');
    setNotes('');
    setModalVisible(true);
  };

  const openEditModal = (seller: Seller, e?: any) => {
    if (e) e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingSellerId(seller.id);
    setName(seller.name);
    setContactMethods(getSellerContactList(seller));
    setCurrentPlatform('WhatsApp');
    setCurrentValue('');
    setCurrentLabel('');
    setReputationScore(seller.reputation_score.toFixed(1));
    setNotes(seller.notes || '');
    setModalVisible(true);
  };

  const handleAddMethod = () => {
    if (!currentValue.trim()) {
      Alert.alert('Required Field', `Please enter the ${currentPlatform} phone, username, or profile link.`);
      return;
    }

    const newMethod: SellerContactMethod = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      platform: currentPlatform,
      value: currentValue.trim(),
      label: currentLabel.trim() || undefined,
    };

    setContactMethods((prev) => [...prev, newMethod]);
    setCurrentValue('');
    setCurrentLabel('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleRemoveMethod = (id: string) => {
    setContactMethods((prev) => prev.filter((m) => m.id !== id));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSaveSeller = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a vendor name.');
      return;
    }

    let finalMethods = [...contactMethods];
    // If the user typed in the method field without tapping "+ Add Method", auto-append it
    if (currentValue.trim()) {
      finalMethods.push({
        id: `cm-${Date.now()}`,
        platform: currentPlatform,
        value: currentValue.trim(),
        label: currentLabel.trim() || undefined,
      });
    }

    if (finalMethods.length === 0) {
      Alert.alert(
        'Connection Method Required',
        'Please add at least one connection method (like WhatsApp, Facebook, or Telegram).'
      );
      return;
    }

    const primaryMethod = finalMethods[0];
    const score = parseFloat(reputationScore) || 5.0;
    const clampedScore = Math.min(5.0, Math.max(1.0, score));

    if (editingSellerId) {
      OfflineVault.updateSeller(editingSellerId, {
        name: name.trim(),
        contact_platform: primaryMethod.platform,
        contact_link: primaryMethod.value,
        contact_methods: finalMethods,
        reputation_score: clampedScore,
        notes: notes.trim() || undefined,
      });
    } else {
      const newSeller: Seller = {
        id: `seller-${Date.now()}`,
        user_id: 'user-demo',
        name: name.trim(),
        contact_platform: primaryMethod.platform,
        contact_link: primaryMethod.value,
        contact_methods: finalMethods,
        reputation_score: clampedScore,
        notes: notes.trim() || undefined,
        created_at: new Date().toISOString(),
      };
      OfflineVault.addSeller(newSeller);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    loadData();
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MODERN HEADER WITH CIRCULAR BUTTONS BELOW NOTIFICATION BAR */}
      <ModernHeader
        title="Digital Vendors"
        subtitle="Reputation & Multi-Contacts"
        showAddButton={true}
        onAddPress={openAddModal}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ADD VENDOR QUICK BANNER */}
        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: colors.accent,
            borderStyle: 'dashed',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0, 112, 209, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} color={colors.accent} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                Register New Digital Vendor
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                Add WhatsApp, Facebook, Telegram & custom notes
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.accent} strokeWidth={2.2} />
        </Pressable>

        {/* VENDORS LIST */}
        {sellers.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ShieldCheck size={48} color={colors.textMuted} strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>No Digital Vendors Found</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Tap above to register your first seller with multiple contact methods and notes.
            </Text>
          </View>
        ) : (
          sellers.map((seller) => {
            const sellerGamesCount = getSellerGamesCount(seller.id);
            const contacts = getSellerContactList(seller);
            const primaryContact = contacts[0] || { platform: seller.contact_platform, value: seller.contact_link };

            return (
              <Pressable
                key={seller.id}
                onPress={() => openSellerProfile(seller.id)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
                  shadowRadius: 6,
                })}
              >
                {/* TOP ROW: ICON, NAME, EDIT BUTTON, RATING */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: colors.surfaceSubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <ShieldCheck size={22} color={colors.accent} strokeWidth={2} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                        {seller.name}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View
                          style={{
                            backgroundColor: colors.surfaceSubtle,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                            {sellerGamesCount} {sellerGamesCount === 1 ? 'Game' : 'Games'}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: 'rgba(0, 112, 209, 0.12)',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>
                            {contacts.length} {contacts.length === 1 ? 'Channel' : 'Channels'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* RIGHT SIDE: EDIT BUTTON & STAR RATING */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={(e) => openEditModal(seller, e)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.surfaceSubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Pencil size={14} color={colors.textSecondary} strokeWidth={2.2} />
                    </Pressable>

                    <View
                      style={{
                        backgroundColor: 'rgba(255, 215, 0, 0.12)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        borderWidth: 0.5,
                        borderColor: '#FFD700',
                      }}
                    >
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>
                        {seller.reputation_score.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* CONNECTION METHODS PILLS */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 }}>
                    Connection Methods:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {contacts.map((method, idx) => {
                      const cfg = PLATFORM_CONFIG[method.platform] || PLATFORM_CONFIG.Other;
                      return (
                        <Pressable
                          key={method.id || idx}
                          onPress={(e) => {
                            e.stopPropagation();
                            openSellerContact(method.platform, method.value);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: cfg.bgTint,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 10,
                            borderWidth: 0.5,
                            borderColor: cfg.defaultColor,
                          }}
                        >
                          <PlatformIcon platform={method.platform} size={13} color={cfg.defaultColor} />
                          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                            {formatPlatformHandle(method.platform, method.value)}
                          </Text>
                          {method.label && (
                            <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: '600' }}>
                              ({method.label})
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* FREE TEXT NOTES PREVIEW */}
                {seller.notes && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: 10,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <FileText size={13} color={colors.textSecondary} strokeWidth={2} style={{ marginTop: 2 }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 16 }} numberOfLines={2}>
                      {seller.notes}
                    </Text>
                  </View>
                )}

                {/* BOTTOM ACTION BAR */}
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>
                      View {sellerGamesCount} Games & Info
                    </Text>
                    <ChevronRight size={13} color={colors.accent} strokeWidth={2.4} />
                  </View>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      if (primaryContact) {
                        openSellerContact(primaryContact.platform, primaryContact.value);
                      }
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#005bb5' : colors.text,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    })}
                  >
                    <PlatformIcon
                      platform={primaryContact.platform}
                      size={13}
                      color={colors.bg}
                    />
                    <Text style={{ color: colors.bg, fontSize: 11, fontWeight: '800' }}>
                      Quick Chat
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* REGISTER / EDIT VENDOR MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 22,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: '92%',
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
                  <ShieldCheck size={22} color={colors.accent} strokeWidth={2.2} />
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
                    {editingSellerId ? 'Edit Vendor Profile' : 'Register Digital Vendor'}
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
                  <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>
                Add multiple connection methods (WhatsApp, Facebook, Telegram) and free-text notes for warranties.
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
                  padding: 13,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                  fontSize: 14,
                }}
              />

              {/* CURRENT ADDED METHODS LIST */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                    CONFIGURED CONNECTION METHODS ({contactMethods.length})
                  </Text>
                </View>

                {contactMethods.length === 0 ? (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceSubtle,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      No methods added yet. Use the form below to add WhatsApp, Facebook, etc.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {contactMethods.map((method, idx) => {
                      const cfg = PLATFORM_CONFIG[method.platform] || PLATFORM_CONFIG.Other;
                      return (
                        <View
                          key={method.id || idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.surfaceSubtle,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                backgroundColor: cfg.bgTint,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PlatformIcon platform={method.platform} size={15} color={cfg.defaultColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
                                  {method.platform}
                                </Text>
                                {idx === 0 && (
                                  <View
                                    style={{
                                      backgroundColor: 'rgba(0, 112, 209, 0.15)',
                                      paddingHorizontal: 6,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                    }}
                                  >
                                    <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800' }}>
                                      Primary
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                                {method.value} {method.label ? `• ${method.label}` : ''}
                              </Text>
                            </View>
                          </View>

                          <Pressable
                            onPress={() => handleRemoveMethod(method.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              marginLeft: 8,
                            }}
                          >
                            <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* ADD CONNECTION METHOD SECTION */}
              <View
                style={{
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800', marginBottom: 10 }}>
                  + ADD CONNECTION METHOD (WHATSAPP, FACEBOOK, ETC.)
                </Text>

                {/* PLATFORM SELECTOR TABS */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                  {PLATFORM_LIST.map((plat) => {
                    const isSelected = currentPlatform === plat;
                    const cfg = PLATFORM_CONFIG[plat] || PLATFORM_CONFIG.Other;
                    return (
                      <Pressable
                        key={plat}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setCurrentPlatform(plat);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: isSelected ? cfg.defaultColor : colors.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: isSelected ? cfg.defaultColor : colors.border,
                        }}
                      >
                        <PlatformIcon platform={plat} size={13} color={isSelected ? '#FFFFFF' : cfg.defaultColor} />
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : colors.textSecondary,
                            fontSize: 12,
                            fontWeight: isSelected ? '800' : '600',
                          }}
                        >
                          {plat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* METHOD VALUE INPUT */}
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
                  {currentPlatform.toUpperCase()} HANDLE, NUMBER OR LINK *
                </Text>
                <TextInput
                  placeholder={
                    currentPlatform === 'WhatsApp'
                      ? '+1 202 555 0192'
                      : currentPlatform === 'Facebook'
                      ? 'm.me/username or facebook.com/store'
                      : currentPlatform === 'Telegram'
                      ? '@seller_telegram'
                      : currentPlatform === 'Discord'
                      ? 'Discord tag (user#1234) or invite URL'
                      : 'https://store-website.com'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                />

                {/* METHOD LABEL (OPTIONAL) */}
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
                  LABEL / DESCRIPTION (OPTIONAL)
                </Text>
                <TextInput
                  placeholder="e.g. VIP Hotline, Messenger Page, Sales Team"
                  placeholderTextColor={colors.textMuted}
                  value={currentLabel}
                  onChangeText={setCurrentLabel}
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                />

                <Pressable
                  onPress={handleAddMethod}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#005bb5' : colors.accent,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  })}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                    Add {currentPlatform} to Vendor Methods
                  </Text>
                </Pressable>
              </View>

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
                        paddingVertical: 9,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                        borderWidth: 1,
                        borderColor: isSelected ? '#F59E0B' : colors.border,
                      }}
                    >
                      <Star size={12} color={isSelected ? '#D97706' : '#F59E0B'} fill={isSelected ? '#D97706' : '#F59E0B'} />
                      <Text
                        style={{
                          color: isSelected ? '#D97706' : colors.textSecondary,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* FREE TEXT NOTES */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <FileText size={13} color={colors.textSecondary} strokeWidth={2.2} />
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                    SELLER NOTES & GUARANTEE POLICIES (FREE TEXT)
                  </Text>
                </View>
                <TextInput
                  placeholder="Enter free text notes, warranty rules, response times, accepted payment methods, refund conditions, or account restore notes..."
                  placeholderTextColor={colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.text,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    minHeight: 85,
                    textAlignVertical: 'top',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                />
              </View>

              {/* ACTION BUTTONS */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: colors.surfaceSubtle,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSaveSeller}
                  style={({ pressed }) => ({
                    flex: 2,
                    paddingVertical: 14,
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
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {editingSellerId ? 'Save Changes' : 'Register Vendor'}
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
