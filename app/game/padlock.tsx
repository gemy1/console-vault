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
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import {
  calculateWarranty,
  generateSellerDeepLink,
  generateWarrantyClaimMessage,
} from '../../utils/padlock';
import { PulsingPadlockBadge } from '../../components/PulsingPadlockBadge';

export default function PadlockProtocolModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F8FAFC' }}>No game selected.</Text>
      </SafeAreaView>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const claimMessage = generateWarrantyClaimMessage(game, seller || undefined);
  const deepLink = generateSellerDeepLink(game, seller || undefined);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(claimMessage);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLaunchDeepLink = () => {
    if (!deepLink) {
      Alert.alert('No Contact Info', 'Seller contact information is missing.');
      return;
    }
    Linking.openURL(deepLink);
  };

  const handleMarkInResolution = () => {
    OfflineVault.updateGame(game.id, { status: 'In Resolution' });
    Alert.alert('Status Updated', 'Game marked as In Resolution.');
    router.back();
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
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '700' }}>Close</Text>
        </Pressable>
        <Text style={{ color: '#FF453A', fontSize: 16, fontWeight: '800' }}>
          PADLOCK PROTOCOL
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* ALERT HEADER */}
        <View
          style={{
            backgroundColor: '#261014',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1.5,
            borderColor: '#FF3B30',
            alignItems: 'center',
          }}
        >
          <PulsingPadlockBadge size="lg" showLabel={false} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 10 }}>
            License Revocation Protocol
          </Text>
          <Text style={{ color: '#FDA4AF', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            Generate and dispatch your automated warranty replacement claim.
          </Text>
        </View>

        {/* STATUS CARD */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 14,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}
        >
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
            WARRANTY VERIFICATION
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{game.title}</Text>
            <Text
              style={{
                color: warranty.isWarrantyActive ? '#30D158' : '#FF453A',
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              {warranty.isWarrantyActive ? `ACTIVE (${warranty.daysRemaining}d left)` : 'EXPIRED'}
            </Text>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
            Seller: {seller?.name || 'Unknown'} • Platform: {seller?.contact_platform || 'N/A'}
          </Text>
        </View>

        {/* GENERATED CLAIM STRING */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 14,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              PRE-FILLED CLAIM MESSAGE
            </Text>
            <Pressable onPress={handleCopy}>
              <Text style={{ color: copied ? '#30D158' : '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                {copied ? 'Copied!' : 'Copy Text'}
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: '#080B14',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          >
            <Text style={{ color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
              {claimMessage}
            </Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={{ marginTop: 20, gap: 10 }}>
          {seller && deepLink && (
            <Pressable
              onPress={handleLaunchDeepLink}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#DC2626' : '#EF4444',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Open {seller.contact_platform} with Pre-filled Claim →
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleMarkInResolution}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1E293B' : '#141D2E',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#2D3D5A',
            })}
          >
            <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 14 }}>
              Mark as "In Resolution"
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
