import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gamepad2, Pencil, X, Lock, ShieldCheck, FileText, Clock } from 'lucide-react-native';
import { Game, Seller, AccountType } from '../../types/vault';
import { OfflineVault } from '../../services/storage';
import { PlatformIcon } from '../common/PlatformIcon';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

const WARRANTY_PRESETS = ['3', '6', '12', '24'];

export interface GameFormData {
  title: string;
  cover_image_url?: string;
  account_type: AccountType;
  warranty_months: number;
  seller_id?: string;
  psn_email: string;
  psn_password: string;
  backup_codes?: string[];
  notes?: string;
}

interface GameFormModalProps {
  visible: boolean;
  initialGame?: Game | null;
  onClose: () => void;
  onSave: (gameData: GameFormData) => void;
}

export function GameFormModal({
  visible,
  initialGame,
  onClose,
  onSave,
}: GameFormModalProps) {
  const styles = useThemedStyles(createStyles);

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Primary');
  const [warrantyMonths, setWarrantyMonths] = useState('6');
  const [sellerId, setSellerId] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [psnEmail, setPsnEmail] = useState('');
  const [psnPassword, setPsnPassword] = useState('');
  const [backupCodesStr, setBackupCodesStr] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      const loadedSellers = OfflineVault.getSellers();
      setSellers(loadedSellers);

      if (initialGame) {
        setTitle(initialGame.title);
        setCoverUrl(initialGame.cover_image_url || '');
        setAccountType(initialGame.account_type);
        setWarrantyMonths(String(initialGame.warranty_months || 6));
        setSellerId(initialGame.seller_id || '');
        setPsnEmail(initialGame.psn_email || '');
        setPsnPassword(initialGame.psn_password || '');
        setBackupCodesStr(initialGame.backup_codes ? initialGame.backup_codes.join(', ') : '');
        setNotes(initialGame.notes || '');
      } else {
        setTitle('');
        setCoverUrl('');
        setAccountType('Primary');
        setWarrantyMonths('6');
        setSellerId(loadedSellers.length > 0 ? loadedSellers[0].id : '');
        setPsnEmail('');
        setPsnPassword('');
        setBackupCodesStr('');
        setNotes('');
      }
    }
  }, [visible, initialGame]);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a game title.');
      return;
    }
    if (!psnEmail.trim()) {
      Alert.alert('Required Field', 'Please enter the PSN account email.');
      return;
    }
    if (!psnPassword.trim()) {
      Alert.alert('Required Field', 'Please enter the PSN account password.');
      return;
    }

    const backupCodes = backupCodesStr
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);

    const parsedWarranty = parseInt(warrantyMonths, 10);
    const validWarranty = isNaN(parsedWarranty) || parsedWarranty < 0 ? 6 : parsedWarranty;

    onSave({
      title: title.trim(),
      cover_image_url: coverUrl.trim() || undefined,
      account_type: accountType,
      warranty_months: validWarranty,
      seller_id: sellerId || undefined,
      psn_email: psnEmail.trim(),
      psn_password: psnPassword.trim(),
      backup_codes: backupCodes.length > 0 ? backupCodes : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.modalSheet}>
          {/* SHEET HANDLE */}
          <View style={styles.sheetHandle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* HEADER */}
            <View style={styles.headerRow}>
              <View style={styles.titleGroup}>
                {initialGame ? (
                  <Pencil size={20} color={styles.accentIcon.color} strokeWidth={2.2} />
                ) : (
                  <Gamepad2 size={22} color={styles.accentIcon.color} strokeWidth={2.2} />
                )}
                <Text style={styles.headerTitle}>
                  {initialGame ? 'Edit Game Details' : 'Register Digital Game'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={16} color={styles.closeIcon.color} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.headerSubtitle}>
              Store account credentials, set warranty duration, and link digital seller.
            </Text>

            {/* GAME TITLE */}
            <Text style={styles.fieldLabel}>GAME TITLE *</Text>
            <TextInput
              placeholder="e.g. Demon's Souls or Marvel's Spider-Man 2"
              placeholderTextColor={styles.placeholder.color}
              value={title}
              onChangeText={setTitle}
              style={styles.textInput}
            />

            {/* COVER ART IMAGE URL */}
            <Text style={styles.fieldLabel}>COVER ART IMAGE URL (OPTIONAL)</Text>
            <TextInput
              placeholder="https://image.api.playstation.com/..."
              placeholderTextColor={styles.placeholder.color}
              value={coverUrl}
              onChangeText={setCoverUrl}
              autoCapitalize="none"
              style={styles.textInput}
            />

            {/* ACCOUNT ACTIVATION TYPE */}
            <Text style={styles.fieldLabel}>ACCOUNT ACTIVATION TYPE</Text>
            <View style={styles.accountTypeRow}>
              {(['Primary', 'Secondary'] as AccountType[]).map((type) => {
                const isSelected = accountType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setAccountType(type);
                    }}
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

            {/* WARRANTY DURATION */}
            <View style={styles.fieldHeaderWithIcon}>
              <Clock size={12} color={styles.fieldLabelIcon.color} strokeWidth={2.2} />
              <Text style={styles.fieldLabelInline}>WARRANTY DURATION (MONTHS)</Text>
            </View>
            <View style={styles.presetsRow}>
              {WARRANTY_PRESETS.map((preset) => {
                const isSelected = warrantyMonths === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setWarrantyMonths(preset);
                    }}
                    style={[
                      styles.presetButton,
                      isSelected ? styles.presetButtonSelected : styles.presetButtonUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        isSelected ? styles.presetTextSelected : styles.presetTextUnselected,
                      ]}
                    >
                      {preset} Mos
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* CUSTOM WARRANTY MONTHS INPUT */}
            <TextInput
              placeholder="Custom duration in months (e.g. 18)"
              placeholderTextColor={styles.placeholder.color}
              value={warrantyMonths}
              onChangeText={setWarrantyMonths}
              keyboardType="numeric"
              style={styles.textInput}
            />

            {/* LINKED SELLER */}
            <View style={styles.fieldHeaderWithIcon}>
              <ShieldCheck size={12} color={styles.fieldLabelIcon.color} strokeWidth={2.2} />
              <Text style={styles.fieldLabelInline}>LINKED SELLER</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sellerScrollContent}
              style={styles.sellerScrollView}
            >
              <Pressable
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSellerId('');
                }}
                style={[
                  styles.sellerPill,
                  sellerId === '' ? styles.sellerPillActive : styles.sellerPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.sellerPillText,
                    sellerId === '' ? styles.sellerPillTextActive : styles.sellerPillTextInactive,
                  ]}
                >
                  Direct / No Seller
                </Text>
              </Pressable>

              {sellers.map((s) => {
                const isSelected = sellerId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setSellerId(s.id);
                    }}
                    style={[
                      styles.sellerPill,
                      isSelected ? styles.sellerPillActive : styles.sellerPillInactive,
                    ]}
                  >
                    <PlatformIcon
                      platform={s.contact_platform}
                      size={13}
                      color={isSelected ? '#FFFFFF' : undefined}
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
            </ScrollView>

            {/* SENSITIVE CREDENTIALS BOX */}
            <View style={styles.sensitiveBox}>
              <View style={styles.sensitiveTitleRow}>
                <Lock size={15} color={styles.accentIcon.color} strokeWidth={2.2} />
                <Text style={styles.sensitiveTitle}>SENSITIVE PSN CREDENTIALS</Text>
              </View>

              <Text style={styles.inputSubLabel}>PSN EMAIL *</Text>
              <TextInput
                placeholder="psn.account@gmail.com"
                placeholderTextColor={styles.placeholder.color}
                value={psnEmail}
                onChangeText={setPsnEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.compactInput}
              />

              <Text style={styles.inputSubLabel}>PSN PASSWORD *</Text>
              <TextInput
                placeholder="AccountPassword#123"
                placeholderTextColor={styles.placeholder.color}
                value={psnPassword}
                onChangeText={setPsnPassword}
                autoCapitalize="none"
                style={styles.compactInput}
              />

              <Text style={styles.inputSubLabel}>2FA BACKUP CODES (COMMA SEPARATED)</Text>
              <TextInput
                placeholder="12345678, 87654321, 11223344"
                placeholderTextColor={styles.placeholder.color}
                value={backupCodesStr}
                onChangeText={setBackupCodesStr}
                autoCapitalize="none"
                style={styles.compactInput}
              />
            </View>

            {/* GAME NOTES */}
            <View style={styles.notesSection}>
              <View style={styles.notesHeaderRow}>
                <FileText size={13} color={styles.closeIcon.color} strokeWidth={2.2} />
                <Text style={styles.fieldLabelInline}>
                  GAME NOTES & ACTIVATION REMARKS (OPTIONAL)
                </Text>
              </View>
              <TextInput
                placeholder="e.g. Primary activated on living room PS5, secondary used on bedroom console, order #..."
                placeholderTextColor={styles.placeholder.color}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />
            </View>

            {/* BUTTONS */}
            <View style={styles.buttonRow}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
              >
                <Text style={styles.submitBtnText}>
                  {initialGame ? 'Save Changes' : 'Add Game to Vault'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '92%',
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    titleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accentIcon: {
      color: colors.accent,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeIcon: {
      color: colors.textSecondary,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 16,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 6,
    },
    fieldHeaderWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    fieldLabelIcon: {
      color: colors.textSecondary,
    },
    fieldLabelInline: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    inputSubLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
    },
    placeholder: {
      color: colors.textMuted,
    },
    textInput: {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
      borderRadius: 14,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      fontSize: 14,
    },
    accountTypeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    accountTypeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    accountTypeBtnActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    accountTypeBtnInactive: {
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.border,
    },
    accountTypeText: {
      fontWeight: '800',
      fontSize: 13,
    },
    accountTypeTextActive: {
      color: colors.pillActiveText,
    },
    accountTypeTextInactive: {
      color: colors.textSecondary,
    },
    presetsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    presetButton: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    presetButtonSelected: {
      backgroundColor: theme === 'dark' ? 'rgba(0, 112, 209, 0.25)' : 'rgba(0, 112, 209, 0.12)',
      borderColor: colors.accent,
    },
    presetButtonUnselected: {
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.border,
    },
    presetText: {
      fontSize: 12,
      fontWeight: '800',
    },
    presetTextSelected: {
      color: colors.accent,
    },
    presetTextUnselected: {
      color: colors.textSecondary,
    },
    sellerScrollView: {
      marginBottom: 16,
    },
    sellerScrollContent: {
      gap: 8,
      paddingVertical: 2,
    },
    sellerPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
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
      backgroundColor: colors.surfaceSubtle,
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
    sensitiveBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    sensitiveTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    sensitiveTitle: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    compactInput: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 13,
      marginBottom: 10,
    },
    notesSection: {
      marginBottom: 20,
    },
    notesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    notesInput: {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 75,
      textAlignVertical: 'top',
      fontSize: 13,
      lineHeight: 18,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 14,
    },
    submitBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.accent,
      boxShadow: '0px 4px 8px rgba(0, 112, 209, 0.3)',
      elevation: 4,
    },
    submitBtnPressed: {
      opacity: 0.8,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
  });
