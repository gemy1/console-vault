import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from '../services/supabase';

export default function AboutModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080B14' }}>
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
        <Text style={{ color: '#F8FAFC', fontSize: 17, fontWeight: '800' }}>
          Console Vault Architecture
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#00D2FF', fontSize: 15, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* APP BADGE */}
        <View
          style={{
            backgroundColor: '#111726',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: '#1E293B',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🎮</Text>
          <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '800' }}>Console Vault</Text>
          <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
            PS5 Account & Warranty Management
          </Text>
          <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>Version 1.0.0 (Production Build)</Text>
        </View>

        {/* SECURITY STATUS */}
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
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
            SECURITY & CLOUD STATUS
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 13 }}>Biometric Guard</Text>
            <Text style={{ color: '#30D158', fontSize: 13, fontWeight: '700' }}>Active (FaceID / TouchID)</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 13 }}>Offline Storage</Text>
            <Text style={{ color: '#30D158', fontSize: 13, fontWeight: '700' }}>Encrypted Cache Ready</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ color: '#F8FAFC', fontSize: 13 }}>Supabase Cloud</Text>
            <Text style={{ color: isSupabaseConfigured ? '#30D158' : '#FF9F0A', fontSize: 13, fontWeight: '700' }}>
              {isSupabaseConfigured ? 'Connected' : 'Offline / Local Demo'}
            </Text>
          </View>
        </View>

        {/* CORE WORKFLOWS SUMMARY */}
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
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
            INTEGRATED PROTOCOLS
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              🚨 The Padlock Protocol
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
              Instant license revocation claim dispatch via WhatsApp and Telegram with live warranty calculations.
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              🔐 Tap-to-Reveal Credentials
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
              Protected PSN emails, passwords, and 2FA backup codes behind on-device biometric security.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              🔄 Automatic Credential Archival
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
              Whenever credentials are replaced by a seller, the old credentials are saved to your audit log.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
