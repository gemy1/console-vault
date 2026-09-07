import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineVault } from '../../services/storage';
import { Seller } from '../../types/vault';

export default function SellersScreen() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setSellers(OfflineVault.getSellers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const openSellerChat = (seller: Seller) => {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#F8FAFC' }}>Seller Directory</Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          Trusted third-party digital vendors and warranty contacts.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />}
      >
        {sellers.map((seller) => {
          const isWhatsApp = seller.contact_platform === 'WhatsApp';
          const isTelegram = seller.contact_platform === 'Telegram';

          return (
            <View
              key={seller.id}
              style={{
                backgroundColor: '#111726',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#1E293B',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{seller.name}</Text>
                  
                  {/* Platform & Rating */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View
                      style={{
                        backgroundColor: isWhatsApp ? '#0E2E1A' : isTelegram ? '#002B4D' : '#1E293B',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: isWhatsApp ? '#25D366' : isTelegram ? '#0088CC' : '#94A3B8',
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        {seller.contact_platform}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFD700', fontSize: 13 }}>★</Text>
                      <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>
                        {seller.reputation_score.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Direct Action Button */}
                <Pressable
                  onPress={() => openSellerChat(seller)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#005bb5' : '#0070D1',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  })}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Chat Now</Text>
                </Pressable>
              </View>

              {/* Notes */}
              {seller.notes && (
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 10, lineHeight: 16 }}>
                  {seller.notes}
                </Text>
              )}

              {/* Contact Link preview */}
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
                <Text style={{ color: '#64748B', fontSize: 11 }}>
                  Direct Handle: <Text style={{ color: '#94A3B8' }}>{seller.contact_link}</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
