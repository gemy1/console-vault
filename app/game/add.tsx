import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OfflineVault } from '../../services/storage';
import { Game, Seller, AccountType } from '../../types/vault';
import { ModernHeader, PlatformIcon } from '../../components/common';
import { Check, Lock } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export default function AddGameScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

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
    <View style={styles.container}>
      <ModernHeader
        title="Add Digital Game"
        subtitle="New Vault Entry"
        showBackButton={true}
        rightAction={
          <Pressable
            onPress={handleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.saveHeaderBtn, pressed && styles.saveHeaderBtnPressed]}
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* GAME TITLE */}
        <Text style={styles.fieldLabel}>GAME TITLE *</Text>
        <TextInput
          placeholder="e.g. Demon's Souls"
          placeholderTextColor={styles.placeholder.color}
          value={title}
          onChangeText={setTitle}
          style={styles.textInput}
        />

        {/* COVER IMAGE URL */}
        <Text style={styles.fieldLabel}>COVER ART IMAGE URL</Text>
        <TextInput
          placeholder="https://image.api.playstation.com/..."
          placeholderTextColor={styles.placeholder.color}
          value={coverUrl}
          onChangeText={setCoverUrl}
          autoCapitalize="none"
          style={styles.textInput}
        />

        {/* ACCOUNT TYPE */}
        <Text style={styles.fieldLabel}>ACCOUNT ACTIVATION TYPE</Text>
        <View style={styles.accountTypeRow}>
          {(['Primary', 'Secondary'] as AccountType[]).map((type) => {
            const isSelected = accountType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setAccountType(type)}
                style={[
                  styles.accountTypeBtn,
                  isSelected ? styles.accountTypeBtnActive : styles.accountTypeBtnInactive,
                ]}
              >
                <Text
                  style={[
                    styles.accountTypeText,
                    isSelected ? styles.accountTypeTextActive : styles.accountTypeTextInactive,
                  ]}
                >
                  {type} Account
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* WARRANTY MONTHS */}
        <Text style={styles.fieldLabel}>WARRANTY DURATION (MONTHS)</Text>
        <TextInput
          placeholder="6"
          placeholderTextColor={styles.placeholder.color}
          value={warrantyMonths}
          onChangeText={setWarrantyMonths}
          keyboardType="numeric"
          style={styles.textInput}
        />

        {/* SELLER SELECTOR */}
        <Text style={styles.fieldLabel}>SELECT SELLER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sellerScroll}>
          <View style={styles.sellerRow}>
            {sellers.map((s) => {
              const isSelected = sellerId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSellerId(s.id)}
                  style={[
                    styles.sellerPill,
                    isSelected ? styles.sellerPillActive : styles.sellerPillInactive,
                  ]}
                >
                  <PlatformIcon
                    platform={s.contact_platform}
                    size={14}
                    color={isSelected ? styles.sellerPillTextActive.color : undefined}
                  />
                  <Text
                    style={[
                      styles.sellerPillText,
                      isSelected ? styles.sellerPillTextActive : styles.sellerPillTextInactive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* SENSITIVE SECTION */}
        <View style={styles.sensitiveCard}>
          <View style={styles.sensitiveHeaderRow}>
            <Lock size={15} color={styles.accentIcon.color} strokeWidth={2.2} />
            <Text style={styles.sensitiveTitle}>SENSITIVE PSN CREDENTIALS</Text>
          </View>

          {/* EMAIL */}
          <Text style={styles.sensitiveLabel}>PSN EMAIL *</Text>
          <TextInput
            placeholder="psn.account@gmail.com"
            placeholderTextColor={styles.placeholder.color}
            value={psnEmail}
            onChangeText={setPsnEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.sensitiveInput}
          />

          {/* PASSWORD */}
          <Text style={styles.sensitiveLabel}>PSN PASSWORD *</Text>
          <TextInput
            placeholder="AccountPassword#123"
            placeholderTextColor={styles.placeholder.color}
            value={psnPassword}
            onChangeText={setPsnPassword}
            autoCapitalize="none"
            style={styles.sensitiveInput}
          />

          {/* BACKUP CODES */}
          <Text style={styles.sensitiveLabel}>2FA BACKUP CODES (COMMA SEPARATED)</Text>
          <TextInput
            placeholder="12345678, 87654321"
            placeholderTextColor={styles.placeholder.color}
            value={backupCodesStr}
            onChangeText={setBackupCodesStr}
            autoCapitalize="none"
            style={styles.sensitiveInputLast}
          />
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.bottomSaveBtn, pressed && styles.bottomSaveBtnPressed]}
        >
          <Text style={styles.bottomSaveBtnText}>Add Game to Vault</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    saveHeaderBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    saveHeaderBtnPressed: {
      opacity: 0.8,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    placeholder: {
      color: colors.textMuted,
    },
    textInput: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    accountTypeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    accountTypeBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
    },
    accountTypeBtnActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    accountTypeBtnInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    accountTypeText: {
      fontWeight: '800',
    },
    accountTypeTextActive: {
      color: colors.pillActiveText,
    },
    accountTypeTextInactive: {
      color: colors.textSecondary,
    },
    sellerScroll: {
      marginBottom: 16,
    },
    sellerRow: {
      flexDirection: 'row',
      gap: 8,
    },
    sellerPill: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sellerPillActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    sellerPillInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    sellerPillText: {
      fontWeight: '800',
      fontSize: 12,
    },
    sellerPillTextActive: {
      color: colors.pillActiveText,
    },
    sellerPillTextInactive: {
      color: colors.text,
    },
    sensitiveCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    sensitiveHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    accentIcon: {
      color: colors.accent,
    },
    sensitiveTitle: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
    },
    sensitiveLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    sensitiveInput: {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    sensitiveInputLast: {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bottomSaveBtn: {
      backgroundColor: colors.text,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    bottomSaveBtnPressed: {
      opacity: 0.8,
    },
    bottomSaveBtnText: {
      color: colors.bg,
      fontWeight: '800',
      fontSize: 15,
    },
  });
