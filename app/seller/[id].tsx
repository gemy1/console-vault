import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Seller, Game, ContactPlatform, SellerContactMethod } from '../../types/vault';
import { calculateWarranty } from '../../utils/padlock';
import { ModernHeader } from '../../components/ModernHeader';
import { PlatformIcon, PLATFORM_CONFIG } from '../../components/PlatformIcon';
import { openSellerContact, getSellerContactList, formatPlatformHandle } from '../../utils/contacts';
import {
  ShieldCheck,
  Star,
  Copy,
  Check,
  Gamepad2,
  ChevronRight,
  Pencil,
  FileText,
  Plus,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react-native';

const PLATFORM_LIST: ContactPlatform[] = [
  'WhatsApp',
  'Facebook',
  'Telegram',
  'Discord',
  'Other',
];

const RATING_PRESETS = ['5.0', '4.8', '4.5', '4.0'];

export default function SellerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editReputation, setEditReputation] = useState('5.0');
  const [editNotes, setEditNotes] = useState('');
  const [editContactMethods, setEditContactMethods] = useState<SellerContactMethod[]>([]);

  // Method add state inside edit modal
  const [newPlatform, setNewPlatform] = useState<ContactPlatform>('WhatsApp');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const loadData = () => {
    if (!id) return;
    const allSellers = OfflineVault.getSellers();
    const foundSeller = allSellers.find((s) => s.id === id);
    if (foundSeller) {
      setSeller(foundSeller);
      const allGames = OfflineVault.getGames();
      const sellerGames = allGames.filter((g) => g.seller_id === id);
      setGames(sellerGames);
    }
  };

  useEffect(() => {
    loadData();
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

  const contacts = getSellerContactList(seller);

  const copyContact = async (value: string, id: string) => {
    await Clipboard.setStringAsync(value);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditName(seller.name);
    setEditReputation(seller.reputation_score.toFixed(1));
    setEditNotes(seller.notes || '');
    setEditContactMethods(getSellerContactList(seller));
    setNewPlatform('WhatsApp');
    setNewValue('');
    setNewLabel('');
    setEditModalVisible(true);
  };

  const handleAddNewMethod = () => {
    if (!newValue.trim()) {
      Alert.alert('Required Field', `Please enter the ${newPlatform} number, username, or link.`);
      return;
    }
    const newMethod: SellerContactMethod = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      platform: newPlatform,
      value: newValue.trim(),
      label: newLabel.trim() || undefined,
    };
    setEditContactMethods((prev) => [...prev, newMethod]);
    setNewValue('');
    setNewLabel('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleRemoveEditMethod = (id: string) => {
    setEditContactMethods((prev) => prev.filter((m) => m.id !== id));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter a vendor name.');
      return;
    }

    let finalMethods = [...editContactMethods];
    if (newValue.trim()) {
      finalMethods.push({
        id: `cm-${Date.now()}`,
        platform: newPlatform,
        value: newValue.trim(),
        label: newLabel.trim() || undefined,
      });
    }

    if (finalMethods.length === 0) {
      Alert.alert('Connection Method Required', 'Please add at least one connection method.');
      return;
    }

    const primary = finalMethods[0];
    const score = parseFloat(editReputation) || 5.0;
    const clampedScore = Math.min(5.0, Math.max(1.0, score));

    const updated = OfflineVault.updateSeller(seller.id, {
      name: editName.trim(),
      contact_platform: primary.platform,
      contact_link: primary.value,
      contact_methods: finalMethods,
      reputation_score: clampedScore,
      notes: editNotes.trim() || undefined,
    });

    if (updated) {
      setSeller(updated);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setEditModalVisible(false);
  };

  const lockedGamesCount = games.filter((g) => g.status === 'Locked').length;
  const activeWarrantiesCount = games.filter((g) => {
    const w = calculateWarranty(g.purchase_date, g.warranty_months);
    return w.isWarrantyActive;
  }).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MODERN HEADER WITH CIRCULAR BACK BUTTON & EDIT ACTION */}
      <ModernHeader
        title="Vendor Profile"
        subtitle={seller.name}
        showBackButton={true}
        rightAction={
          <Pressable
            onPress={openEditModal}
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
            <Pencil size={20} color={colors.accent} strokeWidth={2.2} />
          </Pressable>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* SELLER HERO CARD */}
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
                backgroundColor: 'rgba(0, 112, 209, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.accent,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>
                {contacts.length} {contacts.length === 1 ? 'Connection Channel' : 'Connection Channels'}
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
        </View>

        {/* CONNECTION METHODS CARD (MULTIPLE PLATFORMS SUPPORT) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 22,
            padding: 18,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
              CONNECT WITH THIS SELLER ({contacts.length})
            </Text>
            <Pressable onPress={openEditModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={13} color={colors.accent} strokeWidth={2.4} />
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>Add Method</Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            {contacts.map((contact, index) => {
              const cfg = PLATFORM_CONFIG[contact.platform] || PLATFORM_CONFIG.Other;
              const isCopied = copiedId === (contact.id || `${index}`);

              return (
                <View
                  key={contact.id || index}
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: cfg.bgTint,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlatformIcon platform={contact.platform} size={18} color={cfg.defaultColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
                            {contact.platform}
                          </Text>
                          {contact.label && (
                            <View
                              style={{
                                backgroundColor: `${cfg.defaultColor}20`,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: cfg.defaultColor, fontSize: 10, fontWeight: '800' }}>
                                {contact.label}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {contact.value}
                        </Text>
                      </View>
                    </View>

                    {/* COPY BUTTON */}
                    <Pressable
                      onPress={() => copyContact(contact.value, contact.id || `${index}`)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginLeft: 6,
                      }}
                    >
                      {isCopied ? (
                        <Check size={11} color={colors.success} strokeWidth={2.4} />
                      ) : (
                        <Copy size={11} color={colors.textSecondary} strokeWidth={2.2} />
                      )}
                      <Text style={{ color: isCopied ? colors.success : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                        {isCopied ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* OPEN DIRECT CHAT BUTTON */}
                  <Pressable
                    onPress={() => openSellerContact(contact.platform, contact.value)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? `${cfg.defaultColor}CC` : cfg.defaultColor,
                      marginTop: 10,
                      paddingVertical: 9,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    })}
                  >
                    <PlatformIcon platform={contact.platform} size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                      Open {contact.platform} Chat
                    </Text>
                    <ExternalLink size={12} color="#FFFFFF" strokeWidth={2.2} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* DEDICATED FREE TEXT NOTES & GUARANTEE POLICIES CARD */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 22,
            padding: 18,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={15} color={colors.accent} strokeWidth={2.2} />
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                SELLER NOTES & POLICIES (FREE TEXT)
              </Text>
            </View>

            <Pressable onPress={openEditModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pencil size={12} color={colors.accent} strokeWidth={2.2} />
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>Edit</Text>
            </Pressable>
          </View>

          {seller.notes ? (
            <View
              style={{
                backgroundColor: colors.surfaceSubtle,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>
                {seller.notes}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={openEditModal}
              style={{
                backgroundColor: colors.surfaceSubtle,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                No free-text notes saved for this vendor. Tap here to add warranty policies, response times, or custom notes.
              </Text>
            </Pressable>
          )}
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
                  borderRadius: 18,
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

      {/* EDIT VENDOR MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
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
                  <Pencil size={20} color={colors.accent} strokeWidth={2.2} />
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
                    Edit Vendor & Contacts
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
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
                Manage WhatsApp, Facebook, Telegram and free text warranty notes for {seller.name}.
              </Text>

              {/* VENDOR NAME */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                VENDOR NAME *
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
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

              {/* CONNECTION METHODS LIST */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                  CONNECTION METHODS ({editContactMethods.length})
                </Text>

                <View style={{ gap: 8 }}>
                  {editContactMethods.map((method, idx) => {
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
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
                              {method.platform}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                              {method.value} {method.label ? `• ${method.label}` : ''}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          onPress={() => handleRemoveEditMethod(method.id)}
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
              </View>

              {/* ADD NEW CONNECTION METHOD */}
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
                  + ADD ANOTHER CONNECTION METHOD
                </Text>

                {/* PLATFORM SELECTOR TABS */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                  {PLATFORM_LIST.map((plat) => {
                    const isSelected = newPlatform === plat;
                    const cfg = PLATFORM_CONFIG[plat] || PLATFORM_CONFIG.Other;
                    return (
                      <Pressable
                        key={plat}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setNewPlatform(plat);
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
                  {newPlatform.toUpperCase()} HANDLE, NUMBER OR LINK
                </Text>
                <TextInput
                  placeholder={
                    newPlatform === 'WhatsApp'
                      ? '+1 202 555 0192'
                      : newPlatform === 'Facebook'
                      ? 'm.me/username or facebook.com/store'
                      : newPlatform === 'Telegram'
                      ? '@seller_telegram'
                      : newPlatform === 'Discord'
                      ? 'Discord tag or invite URL'
                      : 'https://website.com'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={newValue}
                  onChangeText={setNewValue}
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

                <TextInput
                  placeholder="Label (optional, e.g. Support, Messenger Page)"
                  placeholderTextColor={colors.textMuted}
                  value={newLabel}
                  onChangeText={setNewLabel}
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
                  onPress={handleAddNewMethod}
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
                  <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                    Add {newPlatform}
                  </Text>
                </Pressable>
              </View>

              {/* REPUTATION RATING PRESETS */}
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                REPUTATION RATING
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {RATING_PRESETS.map((preset) => {
                  const isSelected = editReputation === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setEditReputation(preset)}
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
                  placeholder="Enter free text notes, warranty rules, response times, accepted payment methods, refund conditions..."
                  placeholderTextColor={colors.textMuted}
                  value={editNotes}
                  onChangeText={setEditNotes}
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
                  onPress={() => setEditModalVisible(false)}
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
                  onPress={handleSaveEdit}
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
                    Save Changes
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
