import { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { VaultText as Text } from '../common/VaultText';
import * as Haptics from '@/utils/haptics';
import { useSwipeDownModal } from '../../hooks/useSwipeDownModal';
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
  ImageIcon,
  User,
  Users,
  BadgeCheck,
  Tv2,
  Monitor,
  Layers,
  ShoppingBag,
  DollarSign,
} from 'lucide-react-native';
import { Game, Seller, AccountType, ConsolePlatform, ContactPlatform, SellerContactMethod } from '../../types/vault';
import { OfflineVault } from '../../services/storage';
import { PlatformIcon } from '../common/PlatformIcon';
import { SellerFormModal } from '../sellers/SellerFormModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCustomAlert } from '../../context/AlertContext';
import { usePersona } from '../../context/PersonaContext';
import { generateUUID } from '../../utils/uuid';

const WARRANTY_PRESETS = ['3', '6', '12', '24', '999'];

export interface GameFormData {
  title: string;
  cover_image_url?: string;
  account_type: AccountType;
  platform: ConsolePlatform;
  warranty_months: number;
  seller_id?: string;
  psn_email: string;
  psn_password?: string;
  backup_codes?: string[];
  notes?: string;
  cost_price?: number;
  currency?: string;
  is_inventory?: boolean;
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
  const { t, isRTL } = useLanguage();
  const { showAlert } = useCustomAlert();
  const { isSeller, currency } = usePersona();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverImageError, setCoverImageError] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('Primary');
  const [platform, setPlatform] = useState<ConsolePlatform>('PS5');
  const [costPrice, setCostPrice] = useState('0');
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
      loadSellers();
      setSellerDropdownOpen(false);
      setSellerSearchQuery('');

      if (initialGame) {
        setTitle(initialGame.title);
        setCoverUrl(initialGame.cover_image_url || '');
        setAccountType(initialGame.account_type);
        setPlatform(initialGame.platform || 'PS5');
        setCostPrice(initialGame.cost_price ? String(initialGame.cost_price) : '');
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
        setPlatform('PS5');
        setCostPrice('');
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
      id: generateUUID(),
      user_id: 'user-demo',
      ...sellerData,
      created_at: new Date().toISOString(),
    };

    OfflineVault.addSeller(newSeller);
    loadSellers();
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
      showAlert({
        title: t('alertRequiredField'),
        message: t('alertEnterGameTitle'),
        type: 'warning',
      });
      return;
    }
    if (!psnEmail.trim()) {
      showAlert({
        title: t('alertRequiredField'),
        message: t('alertEnterPsnEmail'),
        type: 'warning',
      });
      return;
    }
    // PSN Password is now optional!

    const backupCodes = backupCodesStr
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);

    const parsedWarranty = parseInt(warrantyMonths, 10);
    const validWarranty = isNaN(parsedWarranty) || parsedWarranty < 0 ? 6 : parsedWarranty;

    const parsedCost = parseFloat(costPrice);
    const validCost = !isNaN(parsedCost) && parsedCost > 0 ? parsedCost : undefined;

    onSave({
      title: title.trim(),
      cover_image_url: coverUrl.trim() || undefined,
      account_type: accountType,
      platform,
      warranty_months: validWarranty,
      seller_id: sellerMode === 'seller' && sellerId ? sellerId : undefined,
      psn_email: psnEmail.trim(),
      psn_password: psnPassword.trim() || undefined,
      backup_codes: backupCodes.length > 0 ? backupCodes : undefined,
      notes: notes.trim() || undefined,
      cost_price: validCost,
      currency: validCost !== undefined ? (initialGame?.currency || currency) : undefined,
      is_inventory: isSeller,
    });
  };

  const { panY, panHandlers, closeWithSlide } = useSwipeDownModal({ visible, onClose });

  // ── Derived: valid cover URL for live preview
  const isValidCoverUrl = useMemo(() => {
    if (!coverUrl.trim()) return false;
    try {
      const u = new URL(coverUrl.trim());
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, [coverUrl]);

  // ── Account type chip data
  const ACCOUNT_TYPES: { type: AccountType; abbr: string; labelKey: 'accountTypePrimary' | 'accountTypeSecondary' | 'accountTypeFull'; icon: React.ReactNode }[] = [
    {
      type: 'Primary',
      abbr: 'PA',
      labelKey: 'accountTypePrimary',
      icon: null,
    },
    {
      type: 'Secondary',
      abbr: 'SA',
      labelKey: 'accountTypeSecondary',
      icon: null,
    },
    {
      type: 'Full',
      abbr: 'FA',
      labelKey: 'accountTypeFull',
      icon: null,
    },
  ];

  // ── Platform chip data
  const PLATFORM_TYPES: { plt: ConsolePlatform; abbr: string; labelKey: 'platformPS5' | 'platformPS4' | 'platformBoth' }[] = [
    { plt: 'PS5', abbr: 'PS5', labelKey: 'platformPS5' },
    { plt: 'PS4', abbr: 'PS4', labelKey: 'platformPS4' },
    { plt: 'BOTH', abbr: isRTL ? 'كلاهما' : 'BOTH', labelKey: 'platformBoth' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeWithSlide}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* BACKDROP DISMISS ON TAP */}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithSlide} />

        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: panY }] }]}>
          {/* SHEET HANDLE */}
          <View {...panHandlers} style={styles.handleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ── HEADER ── */}
            <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.titleGroup, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                {initialGame ? (
                  <Pencil size={20} color={styles.accentIcon.color} strokeWidth={2.2} />
                ) : (
                  <Gamepad2 size={22} color={styles.accentIcon.color} strokeWidth={2.2} />
                )}
                <Text style={styles.headerTitle}>
                  {initialGame ? t('modalEditGameTitle') : t('modalAddGameTitle')}
                </Text>
              </View>
              <Pressable onPress={closeWithSlide} style={styles.closeButton}>
                <X size={16} color={styles.closeIcon.color} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
              {t('modalGameSubtitle')}
            </Text>

            {/* ══════════════════════════════════════════════
                SECTION 1 — GAME INFO
            ══════════════════════════════════════════════ */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Gamepad2 size={13} color={styles.sectionCardIcon.color} strokeWidth={2.2} />
                <Text style={styles.sectionCardTitle}>{isRTL ? 'معلومات اللعبة' : 'GAME INFO'}</Text>
              </View>

              {/* GAME TITLE */}
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldGameTitle')}</Text>
              <TextInput
                placeholder={t('fieldGameTitlePlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={title}
                onChangeText={setTitle}
                style={[styles.inCardInput, isRTL && styles.rtlText]}
              />

              {/* COVER ART — with live thumbnail preview */}
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldCoverUrl')}</Text>
              <View style={[styles.coverArtRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                {/* URL Input — rendered FIRST so we can measure its height */}
                <TextInput
                  placeholder={t('fieldCoverUrlPlaceholder')}
                  placeholderTextColor={styles.placeholder.color}
                  value={coverUrl}
                  onChangeText={(val) => {
                    setCoverUrl(val);
                    setCoverImageError(false);
                  }}
                  autoCapitalize="none"
                  style={[styles.inCardInput, styles.coverInput, isRTL && styles.rtlText]}
                />
                {/* Fixed-size Thumbnail */}
                <View style={styles.coverThumbContainer}>
                  {isValidCoverUrl && !coverImageError ? (
                    <Image
                      source={{ uri: coverUrl.trim() }}
                      style={styles.coverThumb}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                      onError={() => setCoverImageError(true)}
                    />
                  ) : (
                    <View style={styles.coverThumbPlaceholder}>
                      <ImageIcon size={18} color={styles.placeholder.color} strokeWidth={1.5} />
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════
                SECTION 2 — ACCOUNT & PLATFORM
            ══════════════════════════════════════════════ */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <ShieldCheck size={13} color={styles.sectionCardIcon.color} strokeWidth={2.2} />
                <Text style={styles.sectionCardTitle}>{isRTL ? 'نوع الحساب والمنصة' : 'ACCOUNT & PLATFORM'}</Text>
              </View>

              {/* ACCOUNT ACTIVATION TYPE — 2-line chips, NO icons */}
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldAccountType')}</Text>
              <View style={[styles.chipRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                {ACCOUNT_TYPES.map(({ type, abbr, labelKey }) => {
                  const isSelected = accountType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        setAccountType(type);
                      }}
                      style={[
                        styles.twoLineChip,
                        isSelected ? styles.twoLineChipActive : styles.twoLineChipInactive,
                      ]}
                    >
                      {/* Abbreviation */}
                      <Text style={[
                        styles.chipAbbr,
                        isSelected ? styles.chipAbbrActive : styles.chipAbbrInactive,
                      ]}>
                        {abbr}
                      </Text>
                      {/* Full label */}
                      <Text
                        style={[
                          styles.chipSubLabel,
                          isSelected ? styles.chipSubLabelActive : styles.chipSubLabelInactive,
                        ]}
                        numberOfLines={1}
                      >
                        {t(labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* CONSOLE PLATFORM — chips, NO icons */}
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText, { marginTop: 4 }]}>{t('platformLabel')}</Text>
              <View style={[styles.chipRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                {PLATFORM_TYPES.map(({ plt, abbr, labelKey }) => {
                  const isSelected = platform === plt;
                  return (
                    <Pressable
                      key={plt}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                        setPlatform(plt);
                      }}
                      style={[
                        styles.twoLineChip,
                        isSelected ? styles.twoLineChipActive : styles.twoLineChipInactive,
                      ]}
                    >
                      {/* Abbreviation */}
                      <Text style={[
                        styles.chipAbbr,
                        isSelected ? styles.chipAbbrActive : styles.chipAbbrInactive,
                      ]}>
                        {abbr}
                      </Text>
                      {/* Full label */}
                      <Text
                        style={[
                          styles.chipSubLabel,
                          isSelected ? styles.chipSubLabelActive : styles.chipSubLabelInactive,
                        ]}
                        numberOfLines={1}
                      >
                        {t(labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ══════════════════════════════════════════════
                SECTION 3 — PRICING & WARRANTY
            ══════════════════════════════════════════════ */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <DollarSign size={13} color={styles.sectionCardIcon.color} strokeWidth={2.2} />
                <Text style={styles.sectionCardTitle}>{isRTL ? 'السعر والضمان' : 'PRICING & WARRANTY'}</Text>
              </View>

              {/* COST / PURCHASE PRICE */}
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {isSeller ? t('costPrice') : t('purchasePrice')} ({currency})
              </Text>
              <TextInput
                style={[styles.inCardInput, isRTL && styles.rtlText]}
                value={costPrice}
                onChangeText={setCostPrice}
                placeholder="0.00"
                placeholderTextColor={styles.placeholder.color}
                keyboardType="numeric"
              />

              {/* WARRANTY DURATION */}
              <View style={[styles.fieldHeaderWithIcon, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Clock size={12} color={styles.fieldLabelIcon.color} strokeWidth={2.2} />
                <Text style={styles.fieldLabelInline}>{t('fieldWarrantyDuration')}</Text>
              </View>
              {/* Quick presets */}
              <View style={[styles.presetsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                {WARRANTY_PRESETS.map((preset) => {
                  const isSelected = warrantyMonths === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
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
                        {preset === '999' ? t('warrantyLifetime') : `${preset} ${t('warrantyMonthsUnit')}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* Custom override input — shown only when no preset matches */}
              <TextInput
                placeholder={t('warrantyCustomPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={warrantyMonths}
                onChangeText={(val) => {
                  setWarrantyMonths(val);
                }}
                keyboardType="numeric"
                style={[styles.warrantyCustomInput, isRTL && styles.rtlText,
                  WARRANTY_PRESETS.includes(warrantyMonths) && styles.warrantyCustomInputDimmed,
                ]}
              />
            </View>

            {/* ══════════════════════════════════════════════
                SECTION 4 — SELLER / STORE
            ══════════════════════════════════════════════ */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionCardHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <ShoppingBag size={13} color={styles.sectionCardIcon.color} strokeWidth={2.2} />
                <Text style={styles.sectionCardTitle}>{isRTL ? 'المتجر / البائع' : 'SELLER / STORE'}</Text>
              </View>

              {/* SELLER MODE SWITCHER — equal-width, icon above label */}
              <View style={[styles.sellerModeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Pressable
                  onPress={() => handleSelectSellerMode('direct')}
                  style={[
                    styles.sellerModeChip,
                    sellerMode === 'direct' ? styles.sellerModeChipActive : styles.sellerModeChipInactive,
                  ]}
                >
                  <Globe
                    size={18}
                    color={sellerMode === 'direct' ? styles.sellerModeTextActive.color : styles.sellerModeTextInactive.color}
                    strokeWidth={2.2}
                  />
                  <Text style={[
                    styles.sellerModeChipLabel,
                    sellerMode === 'direct' ? styles.sellerModeTextActive : styles.sellerModeTextInactive,
                  ]}>
                    {isRTL ? 'مباشر' : 'Direct'}
                  </Text>
                  <Text style={[
                    styles.sellerModeChipSub,
                    sellerMode === 'direct' ? styles.sellerModeChipSubActive : styles.sellerModeChipSubInactive,
                  ]} numberOfLines={1}>
                    {t('sellerModeDirect')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectSellerMode('seller')}
                  style={[
                    styles.sellerModeChip,
                    sellerMode === 'seller' ? styles.sellerModeChipActive : styles.sellerModeChipInactive,
                  ]}
                >
                  <Store
                    size={18}
                    color={sellerMode === 'seller' ? styles.sellerModeTextActive.color : styles.sellerModeTextInactive.color}
                    strokeWidth={2.2}
                  />
                  <Text style={[
                    styles.sellerModeChipLabel,
                    sellerMode === 'seller' ? styles.sellerModeTextActive : styles.sellerModeTextInactive,
                  ]}>
                    {isRTL ? 'متجر' : 'Seller'}
                  </Text>
                  <Text style={[
                    styles.sellerModeChipSub,
                    sellerMode === 'seller' ? styles.sellerModeChipSubActive : styles.sellerModeChipSubInactive,
                  ]} numberOfLines={1}>
                    {t('sellerModeRegistered')} ({sellers.length})
                  </Text>
                </Pressable>
              </View>

              {/* DIRECT PURCHASE NOTICE */}
              {sellerMode === 'direct' ? (
                <View style={styles.directNoticeBox}>
                  <Text style={[styles.directNoticeText, isRTL && styles.rtlText]}>
                    {t('sellerDirectNotice')}
                  </Text>
                </View>
              ) : (
                /* REGISTERED SELLER DROPDOWN & PICKER */
                <View style={styles.sellerDropdownWrapper}>
                  {/* DROPDOWN TRIGGER BUTTON */}
                  <Pressable
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setSellerDropdownOpen(!sellerDropdownOpen);
                    }}
                    style={[styles.dropdownTrigger, isNativeRTL && { flexDirection: 'row-reverse' }]}
                  >
                    {selectedSeller ? (
                      <View style={[styles.dropdownSelectedRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={styles.dropdownIconBadge}>
                          <PlatformIcon
                            platform={selectedSeller.contact_platform}
                            size={14}
                            color={styles.accentIcon.color}
                          />
                        </View>
                        <View style={styles.dropdownSelectedInfo}>
                          <Text style={[styles.dropdownSelectedName, isRTL && styles.rtlText]}>{selectedSeller.name}</Text>
                          <View style={[styles.dropdownScoreRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                            <Star size={10} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.dropdownScoreText}>
                              {selectedSeller.reputation_score.toFixed(1)} • {selectedSeller.contact_platform}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.dropdownPlaceholderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                        <Store size={15} color={styles.placeholder.color} strokeWidth={2} />
                        <Text style={styles.dropdownPlaceholderText}>{t('sellerDropdownPlaceholder')}</Text>
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
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                          setQuickAddSellerVisible(true);
                        }}
                        style={({ pressed }) => [
                          styles.quickAddSellerBtn,
                          pressed && styles.quickAddSellerBtnPressed,
                          isNativeRTL && { flexDirection: 'row-reverse' },
                        ]}
                      >
                        <View style={styles.quickAddPlusCircle}>
                          <Plus size={13} color="#FFFFFF" strokeWidth={2.8} />
                        </View>
                        <Text style={styles.quickAddSellerText}>{t('sellerQuickRegister')}</Text>
                      </Pressable>

                      {/* SEARCH INPUT */}
                      <View style={[styles.dropdownSearchBox, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                        <Search size={14} color={styles.placeholder.color} strokeWidth={2.2} />
                        <TextInput
                          placeholder={t('sellerSearchPlaceholder')}
                          placeholderTextColor={styles.placeholder.color}
                          value={sellerSearchQuery}
                          onChangeText={setSellerSearchQuery}
                          style={[styles.dropdownSearchInput, isRTL && styles.rtlText]}
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
                            <Text style={[styles.emptySearchText, isRTL && styles.rtlText]}>
                              {t('sellerNoMatch', { query: sellerSearchQuery })}
                            </Text>
                            <Pressable
                              onPress={() => setQuickAddSellerVisible(true)}
                              style={styles.emptyRegisterBtn}
                            >
                              <Text style={styles.emptyRegisterBtnText}>{t('sellerRegisterNow')}</Text>
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
                                  isNativeRTL && { flexDirection: 'row-reverse' },
                                ]}
                              >
                                <View style={[styles.dropdownItemLeft, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                                  <View style={styles.dropdownItemIconBox}>
                                    <PlatformIcon
                                      platform={s.contact_platform}
                                      size={14}
                                      color={styles.accentIcon.color}
                                    />
                                  </View>
                                  <View style={styles.dropdownItemInfo}>
                                    <Text style={[styles.dropdownItemName, isRTL && styles.rtlText]} numberOfLines={1}>
                                      {s.name}
                                    </Text>
                                    <View style={[styles.dropdownItemMetaRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                                      <Text style={styles.dropdownItemMetaText}>
                                        {s.reputation_score.toFixed(1)} • {s.contact_platform}
                                        {s.contact_methods && s.contact_methods.length > 1
                                          ? ` ${t('sellerMethodsCount', { count: s.contact_methods.length })}`
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

            {/* ══════════════════════════════════════════════
                SECTION 5 — SENSITIVE CREDENTIALS
            ══════════════════════════════════════════════ */}
            <View style={styles.sensitiveBox}>
              <View style={[styles.sensitiveTitleRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <Lock size={15} color={styles.accentIcon.color} strokeWidth={2.2} />
                <Text style={styles.sensitiveTitle}>{t('sensitiveHeader')}</Text>
              </View>

              <Text style={[styles.inputSubLabel, isRTL && styles.rtlText]}>{t('fieldPsnEmail')}</Text>
              <TextInput
                placeholder={t('fieldPsnEmailPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={psnEmail}
                onChangeText={setPsnEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.compactInput, isRTL && styles.rtlText]}
              />

              {/* PSN PASSWORD IS NOW OPTIONAL */}
              <Text style={[styles.inputSubLabel, isRTL && styles.rtlText]}>{t('fieldPsnPassword')}</Text>
              <TextInput
                placeholder={t('fieldPsnPasswordPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={psnPassword}
                onChangeText={setPsnPassword}
                autoCapitalize="none"
                style={[styles.compactInput, isRTL && styles.rtlText]}
              />

              <Text style={[styles.inputSubLabel, isRTL && styles.rtlText]}>{t('fieldBackupCodes')}</Text>
              <TextInput
                placeholder={t('fieldBackupCodesPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={backupCodesStr}
                onChangeText={setBackupCodesStr}
                autoCapitalize="none"
                style={[styles.compactInput, isRTL && styles.rtlText]}
              />
            </View>

            {/* ══════════════════════════════════════════════
                SECTION 6 — NOTES
            ══════════════════════════════════════════════ */}
            <View style={styles.notesSection}>
              <View style={[styles.notesHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <FileText size={13} color={styles.closeIcon.color} strokeWidth={2.2} />
                <Text style={styles.fieldLabelInline}>
                  {t('fieldGameNotes')}
                </Text>
              </View>
              <TextInput
                placeholder={t('fieldGameNotesPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={[styles.notesInput, isRTL && styles.rtlText]}
              />
            </View>

            {/* ── ACTION BUTTONS ── */}
            <View style={[styles.buttonRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Pressable onPress={closeWithSlide} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>{t('btnCancel')}</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
              >
                <Text style={styles.submitBtnText}>
                  {initialGame ? t('btnSubmitSaveChanges') : t('btnSubmitAddGame')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
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
    rtlText: {
      textAlign: 'right',
    },
    keyboardContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '92%',
    },
    scrollContent: {
      paddingBottom: 32,
    },

    /* ── SECTION CARDS ── */
    sectionCard: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    sectionCardIcon: {
      color: colors.accent,
    },
    sectionCardTitle: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    /* ── COVER ART ROW ── */
    coverArtRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      marginBottom: 12,
    },
    coverThumbContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexShrink: 0,
    },
    coverThumb: {
      width: 48,
      height: 48,
      borderRadius: 11,
    },
    coverThumbPlaceholder: {
      width: 48,
      height: 48,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverInput: {
      flex: 1,
      height: 48,
      marginBottom: 0,
    },

    /* ── 2-LINE CHIPS (Account type & Platform) ── */
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    twoLineChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 14,
      borderWidth: 1.5,
      gap: 4,
    },
    twoLineChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    twoLineChipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    chipIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipIconWrapActive: {
      backgroundColor: colors.accent,
    },
    chipIconWrapInactive: {
      backgroundColor: colors.surfaceSubtle,
    },
    chipAbbr: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    chipAbbrActive: {
      color: '#FFFFFF',
    },
    chipAbbrInactive: {
      color: colors.textSecondary,
    },
    chipSubLabel: {
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'center',
    },
    chipSubLabelActive: {
      color: 'rgba(255,255,255,0.82)',
    },
    chipSubLabelInactive: {
      color: colors.textMuted,
    },

    /* ── WARRANTY CUSTOM INPUT ── */
    warrantyCustomInput: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 4,
      fontSize: 14,
    },
    warrantyCustomInputDimmed: {
      opacity: 0.45,
    },

    /* ── IN-CARD INPUT (solid surface bg, matches compactInput) ── */
    inCardInput: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      fontSize: 14,
    },

    /* ── SELLER MODE CHIPS ── */
    sellerModeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      gap: 4,
    },
    sellerModeChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    sellerModeChipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    sellerModeChipLabel: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    sellerModeChipSub: {
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'center',
    },
    sellerModeChipSubActive: {
      color: 'rgba(255,255,255,0.82)',
    },
    sellerModeChipSubInactive: {
      color: colors.textMuted,
    },
    sellerModeTextActive: {
      color: '#FFFFFF',
    },
    sellerModeTextInactive: {
      color: colors.textSecondary,
    },
    handleContainer: {
      width: '100%',
      paddingTop: 2,
      paddingBottom: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetHandle: {
      width: 42,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.border,
      alignSelf: 'center',
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
