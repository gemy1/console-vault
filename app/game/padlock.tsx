import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import {
  calculateWarranty,
  generateSellerDeepLink,
  generateWarrantyClaimMessage,
} from '../../utils/padlock';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';
import { Copy, Check, ChevronRight } from 'lucide-react-native';
import { PlatformIcon } from '../../components/PlatformIcon';
import { getSellerContactList, openSellerContact } from '../../utils/contacts';

export default function PadlockProtocolModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useVaultTheme();

  const [game, setGame] = useState<Game | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [copied, setCopied] = useState(false);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>No game selected.</Text>
      </SafeAreaView>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const claimMessage = generateWarrantyClaimMessage(game, seller || undefined);
  const contacts = seller ? getSellerContactList(seller) : [];

  const handleCopy = async () => {
    await Clipboard.setStringAsync(claimMessage);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkInResolution = () => {
    OfflineVault.updateGame(game.id, { status: 'In Resolution' });
    Alert.alert('Status Updated', 'Game marked as In Resolution.');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '700' }}>Close</Text>
        </Pressable>
        <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '800' }}>
          PADLOCK PROTOCOL
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* ALERT HEADER */}
        <View
          style={{
            backgroundColor: theme === 'dark' ? '#261014' : '#FEF2F2',
            borderRadius: 22,
            padding: 18,
            borderWidth: 1.5,
            borderColor: colors.danger,
            alignItems: 'center',
          }}
        >
          <PulsingPadlockBadge size="lg" showLabel={false} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 10 }}>
            License Revocation Protocol
          </Text>
          <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
            Generate and dispatch your automated warranty replacement claim.
          </Text>
        </View>

        {/* STATUS CARD */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: theme === 'dark' ? 0.2 : 0.04,
            shadowRadius: 4,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
            WARRANTY VERIFICATION
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{game.title}</Text>
            <Text
              style={{
                color: warranty.isWarrantyActive ? colors.success : colors.danger,
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              {warranty.isWarrantyActive ? `ACTIVE (${warranty.daysRemaining}d left)` : 'EXPIRED'}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Seller: {seller?.name || 'Unknown'} • Available Channels: {contacts.length > 0 ? contacts.map((c) => c.platform).join(', ') : 'None'}
          </Text>
        </View>

        {/* GENERATED CLAIM STRING */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              PRE-FILLED CLAIM MESSAGE
            </Text>
            <Pressable onPress={handleCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {copied ? (
                <Check size={13} color={colors.success} strokeWidth={2.5} />
              ) : (
                <Copy size={13} color={colors.accent} strokeWidth={2.2} />
              )}
              <Text style={{ color: copied ? colors.success : colors.accent, fontSize: 12, fontWeight: '800' }}>
                {copied ? 'Copied' : 'Copy Text'}
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: colors.surfaceSubtle,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
              {claimMessage}
            </Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={{ marginTop: 20, gap: 10 }}>
          {seller && contacts.length > 0 && (
            <View style={{ gap: 8 }}>
              {contacts.map((contact, idx) => (
                <Pressable
                  key={contact.id || idx}
                  onPress={() => openSellerContact(contact.platform, contact.value, claimMessage)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#DC2626' : colors.danger,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <PlatformIcon platform={contact.platform} size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      Dispatch via {contact.platform}
                      {contact.label ? ` (${contact.label})` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={handleMarkInResolution}
            style={({ pressed }) => ({
              backgroundColor: colors.surfaceSubtle,
              paddingVertical: 15,
              borderRadius: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            })}
          >
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 14 }}>
              Mark as "In Resolution"
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
