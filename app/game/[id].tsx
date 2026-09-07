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
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Game, Seller, GameStatus } from '../../types/vault';
import { calculateWarranty, generateSellerDeepLink } from '../../utils/padlock';
import { useBiometricGuard } from '../../hooks/useBiometricGuard';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';
import { ModernHeader } from '../../components/ModernHeader';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import {
  ChevronLeft,
  Heart,
  Gamepad2,
  Star,
  ShieldCheck,
  ChevronRight,
  Lock,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react-native';

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useVaultTheme();

  const [game, setGame] = useState<Game | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

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
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Game not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>← Go Back</Text>
        </Pressable>
      </View>
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

  const androidStatusBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 36) : 0;
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? androidStatusBar : 48);
  const headerPaddingTop = safeTop + 12;
  const buttonBg = theme === 'dark' ? colors.surfaceElevated : '#FFFFFF';
  const buttonBorder = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* HERO COVER WITH FLOATING CIRCULAR HEADER BUTTONS (MATCHING USER ATTACHED IMAGE) */}
      <View style={{ width: '100%', height: 280, position: 'relative' }}>
        {game.cover_image_url ? (
          <Image
            source={{ uri: game.cover_image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme === 'dark' ? '#0B1120' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gamepad2 size={64} color={colors.textMuted} strokeWidth={1.5} />
          </View>
        )}

        {/* CONTRAST VIGNETTE */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        />

        {/* FLOATING HEADER DIRECTLY BELOW NOTIFICATION BAR */}
        <View
          style={{
            position: 'absolute',
            top: headerPaddingTop,
            left: 20,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* CIRCULAR BACK BUTTON (MATCHING REFERENCE IMAGE) */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: buttonBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: buttonBorder,
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 5,
            })}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          {/* RIGHT CIRCULAR ACTIONS: FAVORITE BUTTON + THEME TOGGLE */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsFavorite(!isFavorite);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: buttonBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: buttonBorder,
                opacity: pressed ? 0.8 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 5,
              })}
            >
              <Heart
                size={20}
                color={isFavorite ? '#EF4444' : colors.text}
                fill={isFavorite ? '#EF4444' : 'transparent'}
                strokeWidth={2.2}
              />
            </Pressable>

            <ThemeToggleButton size={48} />
          </View>
        </View>
      </View>

      {/* OVERLAY SHEET (MATCHING "Rio de Janeiro" SHEET IN ATTACHED IMAGE) */}
      <ScrollView
        style={{ flex: 1, marginTop: -32 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingHorizontal: 20,
            paddingTop: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {/* SHEET HANDLE BAR */}
          <View
            style={{
              width: 38,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          {/* TITLE & REPUTATION / RATING ROW */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 24,
                fontWeight: '800',
                letterSpacing: -0.4,
              }}
            >
              {game.title}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: theme === 'dark' ? 'rgba(255, 215, 0, 0.12)' : '#FEF3C7',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#F59E0B',
              }}
            >
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
                {seller?.reputation_score ? seller.reputation_score.toFixed(1) : '5.0'}
              </Text>
            </View>
          </View>

          {/* BADGES & METADATA ROW */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isLocked ? colors.danger : colors.success,
                }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
                PS5 {game.account_type}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isLocked
                  ? (theme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : '#FEE2E2')
                  : game.status === 'Active'
                  ? (theme === 'dark' ? 'rgba(48, 209, 88, 0.2)' : '#ECFDF5')
                  : 'rgba(255, 159, 10, 0.2)',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 0.5,
                borderColor: isLocked ? colors.danger : game.status === 'Active' ? colors.success : colors.warning,
              }}
            >
              <Text
                style={{
                  color: isLocked ? colors.danger : game.status === 'Active' ? colors.success : colors.warning,
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {game.status}
              </Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Purchased {game.purchase_date}
            </Text>
          </View>

        {/* CLICKABLE SELLER CARD */}
        {seller && (
          <Pressable
            onPress={() => router.push(`/seller/${seller.id}`)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
              borderRadius: 18,
              padding: 14,
              marginTop: 14,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
              shadowRadius: 4,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>
                  Seller: {seller.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
                    Tap to view vendor profile & all games
                  </Text>
                  <ChevronRight size={12} color={colors.accent} strokeWidth={2.4} />
                </View>
              </View>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.12)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Star size={11} color="#FFD700" fill="#FFD700" />
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 12 }}>
                {seller.reputation_score.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        )}

        {/* PADLOCK BANNER */}
        {isLocked && (
          <View
            style={{
              backgroundColor: theme === 'dark' ? '#1E0E12' : '#FEF2F2',
              borderRadius: 20,
              padding: 16,
              marginTop: 14,
              borderWidth: 1.5,
              borderColor: colors.danger,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PulsingPadlockBadge size="sm" showLabel={false} />
              <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 14 }}>
                LICENSE REVOKED BY SONY
              </Text>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
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
                  backgroundColor: pressed ? '#DC2626' : colors.danger,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Send Warranty Claim via {seller.contact_platform}
                </Text>
                <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>
            )}
          </View>
        )}

        {/* WARRANTY COVERAGE */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            marginTop: 14,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
            shadowRadius: 4,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
            Warranty Coverage
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <Text
              style={{
                color: warranty.isWarrantyActive ? colors.success : colors.danger,
                fontSize: 20,
                fontWeight: '800',
              }}
            >
              {warranty.isWarrantyActive ? `${warranty.daysRemaining} Days Left` : 'Expired'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {game.warranty_months} Months Total
            </Text>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            Expires: {warranty.expiryDate}
          </Text>
        </View>

        {/* SENSITIVE CREDENTIALS (BIOMETRIC SHIELD) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 18,
            marginTop: 14,
            borderWidth: 1,
            borderColor: isUnlocked ? colors.accent : colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
              PSN Account Credentials
            </Text>
            {isUnlocked && (
              <Pressable onPress={lock}>
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Hide & Lock</Text>
              </Pressable>
            )}
          </View>

          {!isUnlocked ? (
            /* LOCKED VIEW */
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Lock size={36} color={colors.accent} strokeWidth={2} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                Credentials Protected
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                Biometric authentication required to view PSN email, password, and 2FA codes.
              </Text>

              <Pressable
                onPress={requestUnlock}
                style={({ pressed }) => ({
                  backgroundColor: colors.text,
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 14,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 13 }}>
                  Unlock with Face ID / Passcode
                </Text>
              </Pressable>
            </View>
          ) : (
            /* UNLOCKED VIEW */
            <View style={{ marginTop: 14 }}>
              {/* PSN Email */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  PSN EMAIL
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                    {game.psn_email}
                  </Text>
                  <Pressable
                    onPress={() => copyToClipboard(game.psn_email, 'email')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    {copiedField === 'email' ? (
                      <Check size={12} color={colors.success} strokeWidth={2.4} />
                    ) : (
                      <Copy size={12} color={colors.accent} strokeWidth={2.2} />
                    )}
                    <Text style={{ color: copiedField === 'email' ? colors.success : colors.accent, fontSize: 12, fontWeight: '800' }}>
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* PSN Password */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  PSN PASSWORD
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                    {game.psn_password}
                  </Text>
                  <Pressable
                    onPress={() => copyToClipboard(game.psn_password, 'password')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    {copiedField === 'password' ? (
                      <Check size={12} color={colors.success} strokeWidth={2.4} />
                    ) : (
                      <Copy size={12} color={colors.accent} strokeWidth={2.2} />
                    )}
                    <Text style={{ color: copiedField === 'password' ? colors.success : colors.accent, fontSize: 12, fontWeight: '800' }}>
                      {copiedField === 'password' ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2FA Backup Codes */}
              {game.backup_codes && game.backup_codes.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                    2FA BACKUP CODES
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
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
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>
                          {code}
                        </Text>
                        <Pressable
                          onPress={() => copyToClipboard(code, `code-${index}`)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          {copiedField === `code-${index}` ? (
                            <Check size={12} color={colors.success} strokeWidth={2.4} />
                          ) : (
                            <Copy size={12} color={colors.accent} strokeWidth={2.2} />
                          )}
                          <Text style={{ color: copiedField === `code-${index}` ? colors.success : colors.accent, fontSize: 12, fontWeight: '700' }}>
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
                  backgroundColor: colors.surfaceSubtle,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <RefreshCw size={14} color={colors.accent} strokeWidth={2.2} />
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>
                  Replace Credentials (Archive Old to History)
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* STATUS ACTIONS */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
            Account Status Actions
          </Text>

          {!isLocked ? (
            <Pressable
              onPress={() => toggleGameStatus('Locked')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#DC2626' : colors.danger,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Lock size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Mark as Locked (Padlock Protocol)
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => toggleGameStatus('Active')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#059669' : colors.success,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Mark as Active / Restored
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>

      {/* CREDENTIAL REPLACEMENT MODAL */}
      <Modal visible={replaceModalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
              Replace PSN Credentials
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>
              The existing email and password will be archived into your credential history log.
            </Text>

            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              NEW PSN EMAIL
            </Text>
            <TextInput
              placeholder="new.psn.account@gmail.com"
              placeholderTextColor={colors.textMuted}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 14,
              }}
            />

            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              NEW PSN PASSWORD
            </Text>
            <TextInput
              placeholder="NewPassword#2024"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              secureTextEntry
              style={{
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setReplaceModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceSubtle,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleCredentialReplacement}
                style={{
                  flex: 1,
                  backgroundColor: colors.text,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.bg, fontWeight: '800' }}>Save & Archive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
