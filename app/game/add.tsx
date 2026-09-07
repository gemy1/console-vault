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
import { useVaultTheme } from '../../context/ThemeContext';
import { OfflineVault } from '../../services/storage';
import { Game, Seller, AccountType } from '../../types/vault';
import { ModernHeader } from '../../components/ModernHeader';

export default function AddGameScreen() {
  const router = useRouter();
  const { colors } = useVaultTheme();

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModernHeader
        title="Add Digital Game"
        subtitle="New Vault Entry"
        showBackButton={true}
        rightAction={
          <Pressable
            onPress={handleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>✓</Text>
          </Pressable>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* GAME TITLE */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          GAME TITLE *
        </Text>
        <TextInput
          placeholder="e.g. Demon's Souls"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        />

        {/* COVER IMAGE URL */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          COVER ART IMAGE URL
        </Text>
        <TextInput
          placeholder="https://image.api.playstation.com/..."
          placeholderTextColor={colors.textMuted}
          value={coverUrl}
          onChangeText={setCoverUrl}
          autoCapitalize="none"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        />

        {/* ACCOUNT TYPE */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
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
                  backgroundColor: isSelected ? colors.pillActiveBg : colors.surface,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isSelected ? colors.pillActiveBg : colors.border,
                }}
              >
                <Text style={{ color: isSelected ? colors.pillActiveText : colors.textSecondary, fontWeight: '800' }}>
                  {type} Account
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* WARRANTY MONTHS */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          WARRANTY DURATION (MONTHS)
        </Text>
        <TextInput
          placeholder="6"
          placeholderTextColor={colors.textMuted}
          value={warrantyMonths}
          onChangeText={setWarrantyMonths}
          keyboardType="numeric"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        />

        {/* SELLER SELECTOR */}
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
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
                    backgroundColor: isSelected ? colors.pillActiveBg : colors.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.pillActiveBg : colors.border,
                  }}
                >
                  <Text style={{ color: isSelected ? colors.pillActiveText : colors.text, fontWeight: '800', fontSize: 12 }}>
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
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: 8,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800', marginBottom: 12 }}>
            🔒 SENSITIVE PSN CREDENTIALS
          </Text>

          {/* EMAIL */}
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            PSN EMAIL *
          </Text>
          <TextInput
            placeholder="psn.account@gmail.com"
            placeholderTextColor={colors.textMuted}
            value={psnEmail}
            onChangeText={setPsnEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: colors.surfaceSubtle,
              color: colors.text,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 12,
            }}
          />

          {/* PASSWORD */}
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            PSN PASSWORD *
          </Text>
          <TextInput
            placeholder="AccountPassword#123"
            placeholderTextColor={colors.textMuted}
            value={psnPassword}
            onChangeText={setPsnPassword}
            autoCapitalize="none"
            style={{
              backgroundColor: colors.surfaceSubtle,
              color: colors.text,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 12,
            }}
          />

          {/* BACKUP CODES */}
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            2FA BACKUP CODES (COMMA SEPARATED)
          </Text>
          <TextInput
            placeholder="12345678, 87654321"
            placeholderTextColor={colors.textMuted}
            value={backupCodesStr}
            onChangeText={setBackupCodesStr}
            autoCapitalize="none"
            style={{
              backgroundColor: colors.surfaceSubtle,
              color: colors.text,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({
            backgroundColor: colors.text,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 24,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 15 }}>
            Add Game to Vault
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
