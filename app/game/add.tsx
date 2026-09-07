import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineVault } from '../../services/storage';
import { Game, Seller, AccountType } from '../../types/vault';

export default function AddGameScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Primary');
  const [warrantyMonths, setWarrantyMonths] = useState('6');
  const [psnEmail, setPsnEmail] = useState('');
  const [psnPassword, setPsnPassword] = useState('');
  const [backupCodesStr, setBackupCodesStr] = useState('');
  const [sellerId, setSellerId] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    const loadedSellers = OfflineVault.getSellers();
    setSellers(loadedSellers);
    if (loadedSellers.length > 0) {
      setSellerId(loadedSellers[0].id);
    }
  }, []);

  const handleSave = () => {
    if (!title.trim() || !psnEmail.trim() || !psnPassword.trim()) {
      Alert.alert('Required Fields', 'Please provide a game title, PSN email, and PSN password.');
      return;
    }

    const backupCodes = backupCodesStr
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const newGame: Game = {
      id: `game-${Date.now()}`,
      user_id: 'user-current',
      seller_id: sellerId || undefined,
      title: title.trim(),
      cover_image_url: coverUrl.trim() || undefined,
      account_type: accountType,
      status: 'Active',
      purchase_date: new Date().toISOString().split('T')[0],
      warranty_months: parseInt(warrantyMonths, 10) || 6,
      psn_email: psnEmail.trim(),
      psn_password: psnPassword.trim(),
      backup_codes: backupCodes,
    };

    OfflineVault.addGame(newGame);
    Alert.alert('Success', 'Game added to your Vault!');
    router.replace(`/game/${newGame.id}`);
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
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#00D2FF', fontSize: 15, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '800' }}>Add Digital Game</Text>
        <Pressable onPress={handleSave}>
          <Text style={{ color: '#30D158', fontSize: 15, fontWeight: '800' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* GAME TITLE */}
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          GAME TITLE *
        </Text>
        <TextInput
          placeholder="e.g. Demon's Souls"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          style={{
            backgroundColor: '#111726',
            color: '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#1E293B',
            marginBottom: 16,
          }}
        />

        {/* COVER IMAGE URL */}
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          COVER ART IMAGE URL
        </Text>
        <TextInput
          placeholder="https://image.api.playstation.com/..."
          placeholderTextColor="#64748B"
          value={coverUrl}
          onChangeText={setCoverUrl}
          autoCapitalize="none"
          style={{
            backgroundColor: '#111726',
            color: '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#1E293B',
            marginBottom: 16,
          }}
        />

        {/* ACCOUNT TYPE */}
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          ACCOUNT ACTIVATION TYPE
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {(['Primary', 'Secondary'] as AccountType[]).map((type) => {
            const isSelected = accountType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setAccountType(type)}
                style={{
                  flex: 1,
                  backgroundColor: isSelected ? '#0070D1' : '#111726',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isSelected ? '#0070D1' : '#1E293B',
                }}
              >
                <Text style={{ color: isSelected ? '#FFFFFF' : '#94A3B8', fontWeight: '700' }}>
                  {type} Account
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* WARRANTY MONTHS */}
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          WARRANTY DURATION (MONTHS)
        </Text>
        <TextInput
          placeholder="6"
          placeholderTextColor="#64748B"
          value={warrantyMonths}
          onChangeText={setWarrantyMonths}
          keyboardType="numeric"
          style={{
            backgroundColor: '#111726',
            color: '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#1E293B',
            marginBottom: 16,
          }}
        />

        {/* SELLER SELECTOR */}
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          SELECT SELLER
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {sellers.map((s) => {
              const isSelected = sellerId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSellerId(s.id)}
                  style={{
                    backgroundColor: isSelected ? '#00D2FF' : '#111726',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? '#00D2FF' : '#1E293B',
                  }}
                >
                  <Text style={{ color: isSelected ? '#080B14' : '#F8FAFC', fontWeight: '700', fontSize: 12 }}>
                    {s.name} ({s.contact_platform})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* SENSITIVE SECTION */}
        <View
          style={{
            backgroundColor: '#0F1626',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#0070D1',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#00D2FF', fontSize: 13, fontWeight: '800', marginBottom: 10 }}>
            🔒 SENSITIVE PSN CREDENTIALS
          </Text>

          {/* EMAIL */}
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
            PSN EMAIL *
          </Text>
          <TextInput
            placeholder="psn.account@gmail.com"
            placeholderTextColor="#64748B"
            value={psnEmail}
            onChangeText={setPsnEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: '#080B14',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: 10,
              borderWidth: 1,
              borderColor: '#1E293B',
              marginBottom: 12,
            }}
          />

          {/* PASSWORD */}
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
            PSN PASSWORD *
          </Text>
          <TextInput
            placeholder="AccountPassword#123"
            placeholderTextColor="#64748B"
            value={psnPassword}
            onChangeText={setPsnPassword}
            autoCapitalize="none"
            style={{
              backgroundColor: '#080B14',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: 10,
              borderWidth: 1,
              borderColor: '#1E293B',
              marginBottom: 12,
            }}
          />

          {/* BACKUP CODES */}
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
            2FA BACKUP CODES (COMMA SEPARATED)
          </Text>
          <TextInput
            placeholder="12345678, 87654321"
            placeholderTextColor="#64748B"
            value={backupCodesStr}
            onChangeText={setBackupCodesStr}
            autoCapitalize="none"
            style={{
              backgroundColor: '#080B14',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: 10,
              borderWidth: 1,
              borderColor: '#1E293B',
            }}
          />
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#005bb5' : '#0070D1',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 24,
          })}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
            Add Game to Vault
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
