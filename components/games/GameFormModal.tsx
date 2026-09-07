import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Gamepad2,
  Pencil,
  X,
  Lock,
  ShieldCheck,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Check,
  Store,
  Star,
  Globe,
} from 'lucide-react-native';
import { Game, Seller, AccountType, ContactPlatform, SellerContactMethod } from '../../types/vault';
import { OfflineVault } from '../../services/storage';
import { PlatformIcon } from '../common/PlatformIcon';
import { SellerFormModal } from '../sellers/SellerFormModal';
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
  psn_password?: string;
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
  
  // Seller State
  // sellerMode: 'direct' | 'seller'
  const [sellerMode, setSellerMode] = useState<'direct' | 'seller'>('direct');
  const [sellerId, setSellerId] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [quickAddSellerVisible, setQuickAddSellerVisible] = useState(false);

  // Credentials
  const [psnEmail, setPsnEmail] = useState('');
  const [psnPassword, setPsnPassword] = useState('');
  const [backupCodesStr, setBackupCodesStr] = useState('');
  const [notes, setNotes] = useState('');

  const loadSellers = () => {
    const loadedSellers = OfflineVault.getSellers();
    setSellers(loadedSellers);
    return loadedSellers;
  };

  useEffect(() => {
    if (visible) {
      const loadedSellers = loadSellers();
      setSellerDropdownOpen(false);
      setSellerSearchQuery('');

      if (initialGame) {
        setTitle(initialGame.title);
        setCoverUrl(initialGame.cover_image_url || '');
        setAccountType(initialGame.account_type);
        setWarrantyMonths(String(initialGame.warranty_months || 6));
        
        if (initialGame.seller_id) {
          setSellerMode('seller');
          setSellerId(initialGame.seller_id);
        } else {
          setSellerMode('direct');
          setSellerId('');
        }

        setPsnEmail(initialGame.psn_email || '');
        setPsnPassword(initialGame.psn_password || '');
        setBackupCodesStr(initialGame.backup_codes ? initialGame.backup_codes.join(', ') : '');
        setNotes(initialGame.notes || '');
      } else {
        setTitle('');
        setCoverUrl('');
        setAccountType('Primary');
        setWarrantyMonths('6');
        setSellerMode('direct');
        setSellerId('');
        setPsnEmail('');
        setPsnPassword('');
        setBackupCodesStr('');
        setNotes('');
      }
    }
  }, [visible, initialGame]);

  const selectedSeller = useMemo(() => {
    return sellers.find((s) => s.id === sellerId);
  }, [sellers, sellerId]);

  const filteredSellers = useMemo(() => {
    if (!sellerSearchQuery.trim()) return sellers;
    const q = sellerSearchQuery.toLowerCase();
    return sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact_platform.toLowerCase().includes(q)
    );
  }, [sellers, sellerSearchQuery]);

  const handleSelectSellerMode = (mode: 'direct' | 'seller') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSellerMode(mode);
    if (mode === 'direct') {
      setSellerId('');
      setSellerDropdownOpen(false);
    } else {
      if (!sellerId && sellers.length > 0) {
        setSellerId(sellers[0].id);
      }
    }
  };

  const handleSelectSeller = (seller: Seller) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSellerId(seller.id);
    setSellerDropdownOpen(false);
    setSellerSearchQuery('');
  };

  const handleSaveQuickSeller = (sellerData: {
    name: string;
    contact_platform: ContactPlatform;
    contact_link: string;
    contact_methods: SellerContactMethod[];
    reputation_score: number;
    notes?: string;
  }) => {
    const newSeller: Seller = {
      id: `seller-${Date.now()}`,
      user_id: 'user-demo',
      ...sellerData,
      created_at: new Date().toISOString(),
    };

    OfflineVault.addSeller(newSeller);
    const updatedSellers = loadSellers();
    setSellerMode('seller');
    setSellerId(newSeller.id);
    setQuickAddSellerVisible(false);
    setSellerDropdownOpen(false);
    setSellerSearchQuery('');

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a game title.');
      return;
    }
    if (!psnEmail.trim()) {
      Alert.alert('Required Field', 'Please enter the PSN account email.');
      return;
    }
    // PSN Password is now optional!

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
      seller_id: sellerMode === 'seller' && sellerId ? sellerId : undefined,
      psn_email: psnEmail.trim(),
      psn_password: psnPassword.trim() || undefined,
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

            {/* SELLER ASSIGNMENT SECTION (3 OPTIONS: DIRECT, SELECT SELLER, QUICK ADD SELLER) */}
            <View style={styles.sellerSectionContainer}>
              <View style={styles.fieldHeaderWithIcon}>
                <ShieldCheck size={12} color={styles.fieldLabelIcon.color} strokeWidth={2.2} />
                <Text style={styles.fieldLabelInline}>SELLER ASSIGNMENT</Text>
              </View>

              {/* SELLER MODE SWITCHER (DIRECT vs REGISTERED SELLER) */}
              <View style={styles.sellerModeRow}>
                <Pressable
                  onPress={() => handleSelectSellerMode('direct')}
                  style={[
                    styles.sellerModeBtn,
                    sellerMode === 'direct' ? styles.sellerModeBtnActive : styles.sellerModeBtnInactive,
                  ]}
                >
                  <Globe size={13} color={sellerMode === 'direct' ? styles.sellerModeTextActive.color : styles.sellerModeTextInactive.color} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.sellerModeText,
                      sellerMode === 'direct' ? styles.sellerModeTextActive : styles.sellerModeTextInactive,
                    ]}
                  >
                    Direct Purchase
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectSellerMode('seller')}
                  style={[
                    styles.sellerModeBtn,
                    sellerMode === 'seller' ? styles.sellerModeBtnActive : styles.sellerModeBtnInactive,
                  ]}
                >
                  <Store size={13} color={sellerMode === 'seller' ? styles.sellerModeTextActive.color : styles.sellerModeTextInactive.color} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.sellerModeText,
                      sellerMode === 'seller' ? styles.sellerModeTextActive : styles.sellerModeTextInactive,
                    ]}
                  >
                    Registered Seller ({sellers.length})
                  </Text>
                </Pressable>
              </View>

              {/* DIRECT PURCHASE NOTICE */}
              {sellerMode === 'direct' ? (
                <View style={styles.directNoticeBox}>
                  <Text style={styles.directNoticeText}>
                    Direct / Personal Purchase: No external seller warranty needed. Claims and credentials managed directly.
                  </Text>
                </View>
              ) : (
                /* REGISTERED SELLER DROPDOWN & PICKER */
                <View style={styles.sellerDropdownWrapper}>
                  {/* DROPDOWN TRIGGER BUTTON */}
                  <Pressable
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setSellerDropdownOpen(!sellerDropdownOpen);
                    }}
                    style={styles.dropdownTrigger}
                  >
                    {selectedSeller ? (
                      <View style={styles.dropdownSelectedRow}>
                        <View style={styles.dropdownIconBadge}>
                          <PlatformIcon
                            platform={selectedSeller.contact_platform}
                            size={14}
                            color={styles.accentIcon.color}
                          />
                        </View>
                        <View style={styles.dropdownSelectedInfo}>
                          <Text style={styles.dropdownSelectedName}>{selectedSeller.name}</Text>
                          <View style={styles.dropdownScoreRow}>
                            <Star size={10} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.dropdownScoreText}>
                              {selectedSeller.reputation_score.toFixed(1)} • {selectedSeller.contact_platform}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dropdownPlaceholderRow}>
                        <Store size={15} color={styles.placeholder.color} strokeWidth={2} />
                        <Text style={styles.dropdownPlaceholderText}>Select a seller from your library...</Text>
                      </View>
                    )}

                    <View style={styles.dropdownChevronBox}>
                      {sellerDropdownOpen ? (
                        <ChevronUp size={16} color={styles.closeIcon.color} strokeWidth={2.2} />
                      ) : (
                        <ChevronDown size={16} color={styles.closeIcon.color} strokeWidth={2.2} />
                      )}
                    </View>
                  </Pressable>

                  {/* EXPANDABLE SELLER DROPDOWN MENU */}
                  {sellerDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {/* QUICK ADD NEW SELLER BUTTON */}
                      <Pressable
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setQuickAddSellerVisible(true);
                        }}
                        style={({ pressed }) => [
                          styles.quickAddSellerBtn,
                          pressed && styles.quickAddSellerBtnPressed,
                        ]}
                      >
                        <View style={styles.quickAddPlusCircle}>
                          <Plus size={13} color="#FFFFFF" strokeWidth={2.8} />
                        </View>
                        <Text style={styles.quickAddSellerText}>+ Register New Seller</Text>
                      </Pressable>

                      {/* SEARCH INPUT */}
                      <View style={styles.dropdownSearchBox}>
                        <Search size={14} color={styles.placeholder.color} strokeWidth={2.2} />
                        <TextInput
                          placeholder="Search sellers by name or platform..."
                          placeholderTextColor={styles.placeholder.color}
                          value={sellerSearchQuery}
                          onChangeText={setSellerSearchQuery}
                          style={styles.dropdownSearchInput}
                        />
                        {sellerSearchQuery.length > 0 && (
                          <Pressable onPress={() => setSellerSearchQuery('')}>
                            <X size={14} color={styles.placeholder.color} strokeWidth={2} />
                          </Pressable>
                        )}
                      </View>

                      {/* SELLERS LIST */}
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownScrollList}
                        showsVerticalScrollIndicator={false}
                      >
                        {filteredSellers.length === 0 ? (
                          <View style={styles.emptySearchBox}>
                            <Text style={styles.emptySearchText}>
                              No sellers match "{sellerSearchQuery}".
                            </Text>
                            <Pressable
                              onPress={() => setQuickAddSellerVisible(true)}
                              style={styles.emptyRegisterBtn}
                            >
                              <Text style={styles.emptyRegisterBtnText}>+ Register this Seller Now</Text>
                            </Pressable>
                          </View>
                        ) : (
                          filteredSellers.map((s) => {
                            const isSelected = sellerId === s.id;
                            return (
                              <Pressable
                                key={s.id}
                                onPress={() => handleSelectSeller(s)}
                                style={[
                                  styles.dropdownItem,
                                  isSelected && styles.dropdownItemSelected,
                                ]}
                              >
                                <View style={styles.dropdownItemLeft}>
                                  <View style={styles.dropdownItemIconBox}>
                                    <PlatformIcon
                                      platform={s.contact_platform}
                                      size={14}
                                      color={styles.accentIcon.color}
                                    />
                                  </View>
                                  <View style={styles.dropdownItemInfo}>
                                    <Text style={styles.dropdownItemName} numberOfLines={1}>
                                      {s.name}
                                    </Text>
                                    <View style={styles.dropdownItemMetaRow}>
                                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                                      <Text style={styles.dropdownItemMetaText}>
                                        {s.reputation_score.toFixed(1)} • {s.contact_platform}
                                        {s.contact_methods && s.contact_methods.length > 1
                                          ? ` (${s.contact_methods.length} methods)`
                                          : ''}
                                      </Text>
                                    </View>
                                  </View>
                                </View>

                                {isSelected && (
                                  <View style={styles.dropdownCheckmark}>
                                    <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
                                  </View>
                                )}
                              </Pressable>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

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

              {/* PSN PASSWORD IS NOW OPTIONAL */}
              <Text style={styles.inputSubLabel}>PSN PASSWORD (OPTIONAL)</Text>
              <TextInput
                placeholder="AccountPassword#123 (or leave blank)"
                placeholderTextColor={styles.placeholder.color}
                value={psnPassword}
                onChangeText={setPsnPassword}
                autoCapitalize="none"
                style={styles.compactInput}
              />

              <Text style={styles.inputSubLabel}>2FA BACKUP CODES (COMMA SEPARATED, OPTIONAL)</Text>
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

      {/* NESTED QUICK ADD SELLER MODAL */}
      <SellerFormModal
        visible={quickAddSellerVisible}
        onClose={() => setQuickAddSellerVisible(false)}
        onSave={handleSaveQuickSeller}
      />
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

    /* SELLER ASSIGNMENT ENHANCEMENTS */
    sellerSectionContainer: {
      marginBottom: 16,
    },
    sellerModeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    sellerModeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    sellerModeBtnActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    sellerModeBtnInactive: {
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.border,
    },
    sellerModeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    sellerModeTextActive: {
      color: colors.pillActiveText,
    },
    sellerModeTextInactive: {
      color: colors.textSecondary,
    },
    directNoticeBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    directNoticeText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    sellerDropdownWrapper: {
      position: 'relative',
    },
    dropdownTrigger: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownSelectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    dropdownIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 112, 209, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownSelectedInfo: {
      flex: 1,
    },
    dropdownSelectedName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    dropdownScoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    dropdownScoreText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    dropdownPlaceholderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    dropdownPlaceholderText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    dropdownChevronBox: {
      paddingLeft: 8,
    },
    dropdownMenu: {
      marginTop: 6,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 6px 16px rgba(0, 0, 0, 0.4)' : '0px 6px 16px rgba(0, 0, 0, 0.08)',
      elevation: 5,
    },
    quickAddSellerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      marginBottom: 8,
    },
    quickAddSellerBtnPressed: {
      opacity: 0.85,
    },
    quickAddPlusCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAddSellerText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    dropdownSearchBox: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    dropdownSearchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      paddingVertical: 0,
    },
    dropdownScrollList: {
      maxHeight: 180,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 4,
    },
    dropdownItemSelected: {
      backgroundColor: theme === 'dark' ? 'rgba(0, 112, 209, 0.2)' : 'rgba(0, 112, 209, 0.1)',
    },
    dropdownItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    dropdownItemIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownItemInfo: {
      flex: 1,
    },
    dropdownItemName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    dropdownItemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 1,
    },
    dropdownItemMetaText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    dropdownCheckmark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySearchBox: {
      padding: 16,
      alignItems: 'center',
    },
    emptySearchText: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyRegisterBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.accent,
    },
    emptyRegisterBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    /* SENSITIVE PSN CREDENTIALS */
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
