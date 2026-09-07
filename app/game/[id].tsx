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
import { calculateWarranty, generateSellerDeepLink, generateWarrantyClaimMessage } from '../../utils/padlock';
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

  // Biometric Guard hook
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F8FAFC', fontSize: 16 }}>Game not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);

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
      status: 'Active', // Automatically restore to active once replaced
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14' }}>
      {/* HEADER */}
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
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '700' }}>← Back</Text>
        </Pressable>
        <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          Account Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* HERO CARD */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: game.status === 'Locked' ? '#FF3B30' : '#1E293B',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {game.cover_image_url ? (
            <Image
              source={{ uri: game.cover_image_url }}
              style={{ width: 75, height: 100, borderRadius: 10, backgroundColor: '#080B14' }}
            />
          ) : (
            <View
              style={{
                width: 75,
                height: 100,
                borderRadius: 10,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 32 }}>🎮</Text>
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{game.title}</Text>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View
                style={{
                  backgroundColor: game.account_type === 'Primary' ? '#003A70' : '#4C1D95',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: game.account_type === 'Primary' ? '#60A5FA' : '#C084FC',
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {game.account_type} Account
                </Text>
              </View>

              <View
                style={{
                  backgroundColor:
                    game.status === 'Locked'
                      ? '#3A1418'
                      : game.status === 'Active'
                      ? '#0E2E1A'
                      : '#2A1F0C',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color:
                      game.status === 'Locked'
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

            {seller && (
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
                Seller: <Text style={{ color: '#F8FAFC', fontWeight: '600' }}>{seller.name}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* PADLOCK PROTOCOL BANNER (IF LOCKED) */}
        {game.status === 'Locked' && (
          <View
            style={{
              backgroundColor: '#261014',
              borderRadius: 16,
              padding: 16,
              marginTop: 16,
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
                ? `Warranty is valid (${warranty.daysRemaining} days left). Contact ${seller?.name || 'seller'} to request replacement credentials.`
                : `Warranty expired on ${warranty.expiryDate}. Contact seller for out-of-warranty options.`}
            </Text>

            {seller && (
              <Pressable
                onPress={() => {
                  const link = generateSellerDeepLink(game, seller);
                  if (link) Linking.openURL(link);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#DC2626' : '#EF4444',
                  paddingVertical: 12,
                  borderRadius: 10,
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

        {/* WARRANTY STATUS CARD */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}
        >
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
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
              Purchased: {game.purchase_date}
            </Text>
          </View>

          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
            Duration: {game.warranty_months} months • Expiration Date: {warranty.expiryDate}
          </Text>
        </View>

        {/* SENSITIVE CREDENTIALS (BIOMETRIC GUARD) */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: isUnlocked ? '#0070D1' : '#1E293B',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 15, fontWeight: '700' }}>
              PSN Account Credentials
            </Text>
            {isUnlocked && (
              <Pressable onPress={lock}>
                <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: '600' }}>Hide & Lock</Text>
              </Pressable>
            )}
          </View>

          {!isUnlocked ? (
            /* LOCKED VIEW */
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>🔒</Text>
              <Text style={{ color: '#F8FAFC', fontWeight: '700', fontSize: 15 }}>
                Credentials Protected
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                Biometric authentication required to reveal PSN login and backup codes.
              </Text>

              <Pressable
                onPress={requestUnlock}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#005bb5' : '#0070D1',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Unlock with Face ID / Passcode
                </Text>
              </Pressable>
            </View>
          ) : (
            /* UNLOCKED VIEW */
            <View style={{ marginTop: 14 }}>
              {/* PSN Email */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                  PSN EMAIL
                </Text>
                <View
                  style={{
                    backgroundColor: '#0A0E1A',
                    borderRadius: 8,
                    padding: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#1E293B',
                  }}
                >
                  <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '600' }}>
                    {game.psn_email}
                  </Text>
                  <Pressable onPress={() => copyToClipboard(game.psn_email, 'email')}>
                    <Text style={{ color: copiedField === 'email' ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                      {copiedField === 'email' ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* PSN Password */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                  PSN PASSWORD
                </Text>
                <View
                  style={{
                    backgroundColor: '#0A0E1A',
                    borderRadius: 8,
                    padding: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#1E293B',
                  }}
                >
                  <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '600' }}>
                    {game.psn_password}
                  </Text>
                  <Pressable onPress={() => copyToClipboard(game.psn_password, 'password')}>
                    <Text style={{ color: copiedField === 'password' ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                      {copiedField === 'password' ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2FA Backup Codes */}
              {game.backup_codes && game.backup_codes.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                    2FA BACKUP CODES
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#0A0E1A',
                      borderRadius: 8,
                      padding: 10,
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
                          paddingVertical: 4,
                          borderBottomWidth: index < game.backup_codes!.length - 1 ? 1 : 0,
                          borderBottomColor: '#1E293B',
                        }}
                      >
                        <Text style={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: 12 }}>
                          {code}
                        </Text>
                        <Pressable onPress={() => copyToClipboard(code, `code-${index}`)}>
                          <Text style={{ color: copiedField === `code-${index}` ? '#30D158' : '#00D2FF', fontSize: 11, fontWeight: '600' }}>
                            {copiedField === `code-${index}` ? 'Copied' : 'Copy'}
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
                  backgroundColor: pressed ? '#1E293B' : '#182235',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#2D3D5A',
                  marginTop: 6,
                })}
              >
                <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 12 }}>
                  🔄 Replace Credentials (Archive Old to History)
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* STATUS ACTIONS */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
            Account Status Actions
          </Text>

          {game.status !== 'Locked' ? (
            <Pressable
              onPress={() => toggleGameStatus('Locked')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#7F1D1D' : '#991B1B',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                🔒 Mark as Locked (Padlock Protocol)
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => toggleGameStatus('Active')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#14532D' : '#166534',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
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
              backgroundColor: '#111726',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
              Replace PSN Credentials
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>
              The existing email and password will be archived into your credential audit log.
            </Text>

            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
              NEW PSN EMAIL
            </Text>
            <TextInput
              placeholder="e.g. new.psn.account@gmail.com"
              placeholderTextColor="#64748B"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#080B14',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: '#1E293B',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
              NEW PSN PASSWORD
            </Text>
            <TextInput
              placeholder="e.g. NewPassword#2024"
              placeholderTextColor="#64748B"
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              secureTextEntry
              style={{
                backgroundColor: '#080B14',
                color: '#FFFFFF',
                borderRadius: 8,
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
                  paddingVertical: 12,
                  borderRadius: 10,
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
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save & Archive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
