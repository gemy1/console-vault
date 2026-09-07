import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { Game, Seller, GameStatus } from '../../types/vault';
import { calculateWarranty, generateSellerDeepLink } from '../../utils/padlock';
import { useBiometricGuard } from '../../hooks/useBiometricGuard';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { isUnlocked, requestUnlock, lock } = useBiometricGuard(60);

  useEffect(() => {
    if (!id) return;
    const games = OfflineVault.getGames();
    const found = games.find((g) => g.id === id);
    if (found) {
      setGame(found);
      if (found.seller_id) {
        const sellers = OfflineVault.getSellers();
        const foundSeller = sellers.find((s) => s.id === found.seller_id);
        if (foundSeller) setSeller(foundSeller);
      }
    }
  }, [id]);

  if (!game) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F8FAFC', fontSize: 16 }}>Game not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const isLocked = game.status === 'Locked';

  const copyToClipboard = async (text: string, fieldName: string) => {
    await Clipboard.setStringAsync(text);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleGameStatus = (newStatus: GameStatus) => {
    const updated = OfflineVault.updateGame(game.id, { status: newStatus });
    if (updated) {
      setGame(updated);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  };

  const handleCredentialReplacement = () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      Alert.alert('Missing Fields', 'Please provide both new PSN email and password.');
      return;
    }

    const updated = OfflineVault.updateGame(game.id, {
      psn_email: newEmail.trim(),
      psn_password: newPassword.trim(),
      status: 'Active',
    });

    if (updated) {
      setGame(updated);
      setReplaceModalVisible(false);
      setNewEmail('');
      setNewPassword('');
      Alert.alert('Credentials Updated', 'Old credentials archived to history. Game restored to Active.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080C16' }}>
      {/* HEADER WITH SMOOTH BACK */}
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
        <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          Account Details
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* HERO CARD */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: isLocked ? '#FF3B30' : '#1E293B',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {game.cover_image_url ? (
            <Image
              source={{ uri: game.cover_image_url }}
              style={{ width: 80, height: 106, borderRadius: 12, backgroundColor: '#080C16' }}
            />
          ) : (
            <View
              style={{
                width: 80,
                height: 106,
                borderRadius: 12,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 36 }}>🎮</Text>
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{game.title}</Text>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <View
                style={{
                  backgroundColor: game.account_type === 'Primary' ? 'rgba(0, 112, 209, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: game.account_type === 'Primary' ? '#0070D1' : '#9333EA',
                }}
              >
                <Text
                  style={{
                    color: game.account_type === 'Primary' ? '#60A5FA' : '#C084FC',
                    fontSize: 11,
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
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
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
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {game.status}
                </Text>
              </View>
            </View>

            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>
              Purchased: {game.purchase_date}
            </Text>
          </View>
        </View>

        {/* CLICKABLE SELLER CARD */}
        {seller && (
          <Pressable
            onPress={() => router.push(`/seller/${seller.id}`)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#172033' : '#0F172A',
              borderRadius: 16,
              padding: 14,
              marginTop: 14,
              borderWidth: 1,
              borderColor: '#1E293B',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>🛡️</Text>
              </View>
              <View>
                <Text style={{ color: '#F8FAFC', fontWeight: '700', fontSize: 14 }}>
                  Seller: {seller.name}
                </Text>
                <Text style={{ color: '#00D2FF', fontSize: 11, marginTop: 2 }}>
                  Tap to view vendor profile & all games ›
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.12)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 12 }}>
                ★ {seller.reputation_score.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        )}

        {/* PADLOCK PROTOCOL BANNER (IF LOCKED) */}
        {isLocked && (
          <View
            style={{
              backgroundColor: '#1E0E12',
              borderRadius: 18,
              padding: 16,
              marginTop: 14,
              borderWidth: 1.5,
              borderColor: '#FF3B30',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PulsingPadlockBadge size="sm" showLabel={false} />
              <Text style={{ color: '#FF453A', fontWeight: '800', fontSize: 14 }}>
                LICENSE REVOKED BY SONY
              </Text>
            </View>

            <Text style={{ color: '#E2E8F0', fontSize: 13, marginTop: 6, lineHeight: 18 }}>
              {warranty.isWarrantyActive
                ? `Warranty is active (${warranty.daysRemaining} days remaining). Contact ${seller?.name || 'seller'} to request replacement credentials.`
                : `Warranty expired on ${warranty.expiryDate}.`}
            </Text>

            {seller && (
              <Pressable
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                  const link = generateSellerDeepLink(game, seller);
                  if (link) Linking.openURL(link);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#DC2626' : '#EF4444',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 12,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Send Warranty Claim via {seller.contact_platform} →
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* WARRANTY PROGRESS CARD */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 16,
            padding: 16,
            marginTop: 14,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}
        >
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
            Warranty Coverage
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <Text
              style={{
                color: warranty.isWarrantyActive ? '#30D158' : '#94A3B8',
                fontSize: 20,
                fontWeight: '800',
              }}
            >
              {warranty.isWarrantyActive ? `${warranty.daysRemaining} Days Left` : 'Expired'}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              {game.warranty_months} Months Total
            </Text>
          </View>

          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
            Expires: {warranty.expiryDate}
          </Text>
        </View>

        {/* SENSITIVE CREDENTIALS (BIOMETRIC SHIELD) */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 18,
            padding: 18,
            marginTop: 14,
            borderWidth: 1,
            borderColor: isUnlocked ? '#0070D1' : '#1E293B',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 15, fontWeight: '800' }}>
              PSN Account Credentials
            </Text>
            {isUnlocked && (
              <Pressable onPress={lock}>
                <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: '700' }}>Hide & Lock</Text>
              </Pressable>
            )}
          </View>

          {!isUnlocked ? (
            /* LOCKED VIEW */
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 38, marginBottom: 10 }}>🔒</Text>
              <Text style={{ color: '#F8FAFC', fontWeight: '700', fontSize: 15 }}>
                Credentials Protected
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                Biometric authentication required to view PSN email, password, and 2FA codes.
              </Text>

              <Pressable
                onPress={requestUnlock}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#005bb5' : '#0070D1',
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Unlock with Face ID / Passcode
                </Text>
              </Pressable>
            </View>
          ) : (
            /* UNLOCKED VIEW */
            <View style={{ marginTop: 14 }}>
              {/* PSN Email */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  PSN EMAIL
                </Text>
                <View
                  style={{
                    backgroundColor: '#080C16',
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#1E293B',
                  }}
                >
                  <Text style={{ color: '#F8FAFC', fontSize: 14, fontWeight: '600' }}>
                    {game.psn_email}
                  </Text>
                  <Pressable onPress={() => copyToClipboard(game.psn_email, 'email')}>
                    <Text style={{ color: copiedField === 'email' ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '800' }}>
                      {copiedField === 'email' ? '✓ Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* PSN Password */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  PSN PASSWORD
                </Text>
                <View
                  style={{
                    backgroundColor: '#080C16',
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#1E293B',
                  }}
                >
                  <Text style={{ color: '#F8FAFC', fontSize: 14, fontWeight: '600' }}>
                    {game.psn_password}
                  </Text>
                  <Pressable onPress={() => copyToClipboard(game.psn_password, 'password')}>
                    <Text style={{ color: copiedField === 'password' ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '800' }}>
                      {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2FA Backup Codes */}
              {game.backup_codes && game.backup_codes.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                    2FA BACKUP CODES
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#080C16',
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#1E293B',
                    }}
                  >
                    {game.backup_codes.map((code, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 6,
                          borderBottomWidth: index < game.backup_codes!.length - 1 ? 1 : 0,
                          borderBottomColor: '#1E293B',
                        }}
                      >
                        <Text style={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: 13 }}>
                          {code}
                        </Text>
                        <Pressable onPress={() => copyToClipboard(code, `code-${index}`)}>
                          <Text style={{ color: copiedField === `code-${index}` ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                            {copiedField === `code-${index}` ? '✓ Copied' : 'Copy'}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Replace Credentials Action */}
              <Pressable
                onPress={() => setReplaceModalVisible(true)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#1E293B' : '#141E33',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#253452',
                  marginTop: 6,
                })}
              >
                <Text style={{ color: '#60A5FA', fontWeight: '800', fontSize: 13 }}>
                  🔄 Replace Credentials (Archive Old to History)
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* STATUS ACTIONS */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
            Account Status Actions
          </Text>

          {!isLocked ? (
            <Pressable
              onPress={() => toggleGameStatus('Locked')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#7F1D1D' : '#991B1B',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                🔒 Mark as Locked (Padlock Protocol)
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => toggleGameStatus('Active')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#14532D' : '#166534',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                ✅ Mark as Active / Restored
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* CREDENTIAL REPLACEMENT MODAL */}
      <Modal visible={replaceModalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#0F172A',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
              Replace PSN Credentials
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>
              The existing email and password will be archived into your credential history log.
            </Text>

            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              NEW PSN EMAIL
            </Text>
            <TextInput
              placeholder="new.psn.account@gmail.com"
              placeholderTextColor="#64748B"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#080C16',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#1E293B',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              NEW PSN PASSWORD
            </Text>
            <TextInput
              placeholder="NewPassword#2024"
              placeholderTextColor="#64748B"
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              secureTextEntry
              style={{
                backgroundColor: '#080C16',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#1E293B',
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setReplaceModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#1E293B',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleCredentialReplacement}
                style={{
                  flex: 1,
                  backgroundColor: '#0070D1',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save & Archive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
