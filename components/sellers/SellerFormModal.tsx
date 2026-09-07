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
import { ShieldCheck, Star, Plus, X, Trash2, FileText, Pencil } from 'lucide-react-native';
import { Seller, ContactPlatform, SellerContactMethod } from '../../types/vault';
import { PlatformIcon, PLATFORM_CONFIG } from '../common/PlatformIcon';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

const PLATFORM_LIST: ContactPlatform[] = [
  'WhatsApp',
  'Facebook',
  'Telegram',
  'Discord',
  'Other',
];

const RATING_PRESETS = ['5.0', '4.8', '4.5', '4.0'];

interface SellerFormModalProps {
  visible: boolean;
  initialSeller?: Seller | null;
  onClose: () => void;
  onSave: (sellerData: {
    name: string;
    contact_platform: ContactPlatform;
    contact_link: string;
    contact_methods: SellerContactMethod[];
    reputation_score: number;
    notes?: string;
  }) => void;
}

export function SellerFormModal({
  visible,
  initialSeller,
  onClose,
  onSave,
}: SellerFormModalProps) {
  const styles = useThemedStyles(createStyles);

  const [name, setName] = useState('');
  const [reputationScore, setReputationScore] = useState('5.0');
  const [notes, setNotes] = useState('');
  const [contactMethods, setContactMethods] = useState<SellerContactMethod[]>([]);

  // Method add state
  const [currentPlatform, setCurrentPlatform] = useState<ContactPlatform>('WhatsApp');
  const [currentValue, setCurrentValue] = useState('');
  const [currentLabel, setCurrentLabel] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialSeller) {
        setName(initialSeller.name);
        setReputationScore(initialSeller.reputation_score.toFixed(1));
        setNotes(initialSeller.notes || '');
        if (initialSeller.contact_methods && initialSeller.contact_methods.length > 0) {
          setContactMethods(initialSeller.contact_methods);
        } else if (initialSeller.contact_link) {
          setContactMethods([
            {
              id: 'primary',
              platform: initialSeller.contact_platform,
              value: initialSeller.contact_link,
              label: 'Primary',
            },
          ]);
        } else {
          setContactMethods([]);
        }
      } else {
        setName('');
        setReputationScore('5.0');
        setNotes('');
        setContactMethods([]);
      }
      setCurrentPlatform('WhatsApp');
      setCurrentValue('');
      setCurrentLabel('');
    }
  }, [visible, initialSeller]);

  const handleAddMethod = () => {
    if (!currentValue.trim()) {
      Alert.alert('Required Field', `Please enter the ${currentPlatform} handle, number, or link.`);
      return;
    }

    const newMethod: SellerContactMethod = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      platform: currentPlatform,
      value: currentValue.trim(),
      label: currentLabel.trim() || undefined,
    };

    setContactMethods([...contactMethods, newMethod]);
    setCurrentValue('');
    setCurrentLabel('');

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleRemoveMethod = (methodId?: string) => {
    if (!methodId) return;
    setContactMethods(contactMethods.filter((m) => m.id !== methodId));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a seller / store name.');
      return;
    }

    let finalMethods = [...contactMethods];
    if (finalMethods.length === 0 && currentValue.trim()) {
      finalMethods.push({
        id: `cm-${Date.now()}`,
        platform: currentPlatform,
        value: currentValue.trim(),
        label: currentLabel.trim() || 'Primary',
      });
    }

    if (finalMethods.length === 0) {
      Alert.alert(
        'Connection Method Required',
        'Please add at least one connection method (e.g. WhatsApp, Facebook, or Telegram).'
      );
      return;
    }

    const primary = finalMethods[0];
    const score = parseFloat(reputationScore) || 5.0;
    const clampedScore = Math.min(5.0, Math.max(1.0, score));

    onSave({
      name: name.trim(),
      contact_platform: primary.platform,
      contact_link: primary.value,
      contact_methods: finalMethods,
      reputation_score: clampedScore,
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
                {initialSeller ? (
                  <Pencil size={20} color={styles.accentIcon.color} strokeWidth={2.2} />
                ) : (
                  <ShieldCheck size={22} color={styles.accentIcon.color} strokeWidth={2.2} />
                )}
                <Text style={styles.headerTitle}>
                  {initialSeller ? 'Edit Seller Profile' : 'Register Digital Seller'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={16} color={styles.closeIcon.color} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.headerSubtitle}>
              Add multiple connection channels (WhatsApp, Facebook, Telegram) and free-text notes.
            </Text>

            {/* SELLER NAME */}
            <Text style={styles.fieldLabel}>SELLER / STORE NAME *</Text>
            <TextInput
              placeholder="e.g. PlayStation Elite Keys"
              placeholderTextColor={styles.placeholder.color}
              value={name}
              onChangeText={setName}
              style={styles.textInput}
            />

            {/* CONNECTION METHODS LIST */}
            <View style={styles.sectionMargin}>
              <Text style={styles.fieldLabel}>
                CONFIGURED CONNECTION METHODS ({contactMethods.length})
              </Text>

              {contactMethods.length === 0 ? (
                <View style={styles.emptyMethodsBox}>
                  <Text style={styles.emptyMethodsText}>
                    No methods added yet. Use the form below to add WhatsApp, Facebook, etc.
                  </Text>
                </View>
              ) : (
                <View style={styles.methodsList}>
                  {contactMethods.map((method, idx) => {
                    const cfg = PLATFORM_CONFIG[method.platform] || PLATFORM_CONFIG.Other;
                    return (
                      <View key={method.id || idx} style={styles.methodItem}>
                        <View style={styles.methodInfoRow}>
                          <View style={[styles.platformIconBox, { backgroundColor: cfg.bgTint }]}>
                            <PlatformIcon platform={method.platform} size={15} color={cfg.defaultColor} />
                          </View>
                          <View style={styles.methodTextCol}>
                            <View style={styles.methodPlatformRow}>
                              <Text style={styles.methodPlatformText}>{method.platform}</Text>
                              {idx === 0 && (
                                <View style={styles.primaryBadge}>
                                  <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.methodValueText} numberOfLines={1}>
                              {method.value} {method.label ? `• ${method.label}` : ''}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          onPress={() => handleRemoveMethod(method.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ADD CONNECTION METHOD SECTION */}
            <View style={styles.addMethodBox}>
              <Text style={styles.addMethodTitle}>+ ADD CONNECTION METHOD</Text>

              {/* PLATFORMS ROW */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.platformScrollContainer}
              >
                {PLATFORM_LIST.map((plat) => {
                  const isSelected = currentPlatform === plat;
                  const cfg = PLATFORM_CONFIG[plat] || PLATFORM_CONFIG.Other;
                  return (
                    <Pressable
                      key={plat}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        setCurrentPlatform(plat);
                      }}
                      style={[
                        styles.platformPill,
                        {
                          backgroundColor: isSelected ? cfg.defaultColor : styles.platformPillInactive.backgroundColor,
                          borderColor: isSelected ? cfg.defaultColor : styles.platformPillInactive.borderColor,
                        },
                      ]}
                    >
                      <PlatformIcon platform={plat} size={13} color={isSelected ? '#FFFFFF' : cfg.defaultColor} />
                      <Text
                        style={[
                          styles.platformPillText,
                          isSelected ? styles.platformPillTextSelected : styles.platformPillTextUnselected,
                        ]}
                      >
                        {plat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* VALUE INPUT */}
              <Text style={styles.inputSubLabel}>
                {currentPlatform.toUpperCase()} HANDLE, NUMBER OR LINK *
              </Text>
              <TextInput
                placeholder={
                  currentPlatform === 'WhatsApp'
                    ? '+1 202 555 0192'
                    : currentPlatform === 'Facebook'
                    ? 'm.me/username or facebook.com/store'
                    : currentPlatform === 'Telegram'
                    ? '@seller_telegram'
                    : currentPlatform === 'Discord'
                    ? 'Discord tag or invite URL'
                    : 'https://store-link.com'
                }
                placeholderTextColor={styles.placeholder.color}
                value={currentValue}
                onChangeText={setCurrentValue}
                autoCapitalize="none"
                style={styles.compactInput}
              />

              {/* LABEL INPUT */}
              <TextInput
                placeholder="Label (optional, e.g. Support, Messenger Page)"
                placeholderTextColor={styles.placeholder.color}
                value={currentLabel}
                onChangeText={setCurrentLabel}
                style={styles.labelInput}
              />

              <Pressable
                onPress={handleAddMethod}
                style={({ pressed }) => [
                  styles.addMethodSubmitBtn,
                  pressed && styles.addMethodSubmitBtnPressed,
                ]}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.addMethodSubmitText}>
                  Add {currentPlatform}
                </Text>
              </Pressable>
            </View>

            {/* REPUTATION RATING */}
            <Text style={styles.fieldLabel}>REPUTATION RATING</Text>
            <View style={styles.presetsRow}>
              {RATING_PRESETS.map((preset) => {
                const isSelected = reputationScore === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setReputationScore(preset)}
                    style={[
                      styles.presetButton,
                      isSelected ? styles.presetButtonSelected : styles.presetButtonUnselected,
                    ]}
                  >
                    <Star
                      size={12}
                      color={isSelected ? '#D97706' : '#F59E0B'}
                      fill={isSelected ? '#D97706' : '#F59E0B'}
                    />
                    <Text
                      style={[
                        styles.presetText,
                        isSelected ? styles.presetTextSelected : styles.presetTextUnselected,
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* FREE TEXT NOTES */}
            <View style={styles.notesSection}>
              <View style={styles.notesHeaderRow}>
                <FileText size={13} color={styles.closeIcon.color} strokeWidth={2.2} />
                <Text style={styles.fieldLabelInline}>
                  SELLER NOTES & GUARANTEE POLICIES (FREE TEXT)
                </Text>
              </View>
              <TextInput
                placeholder="Enter free text notes, warranty rules, response times, accepted payment methods, refund conditions..."
                placeholderTextColor={styles.placeholder.color}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
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
                  {initialSeller ? 'Save Changes' : 'Register Seller'}
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
    sectionMargin: {
      marginBottom: 14,
    },
    emptyMethodsBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    emptyMethodsText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    methodsList: {
      gap: 8,
    },
    methodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    methodInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    platformIconBox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodTextCol: {
      flex: 1,
    },
    methodPlatformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    methodPlatformText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    primaryBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    primaryBadgeText: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '800',
    },
    methodValueText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 1,
    },
    deleteBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      marginLeft: 8,
    },
    addMethodBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    addMethodTitle: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 10,
    },
    platformScrollContainer: {
      gap: 6,
      marginBottom: 12,
    },
    platformPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    platformPillInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    platformPillText: {
      fontSize: 12,
    },
    platformPillTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    platformPillTextUnselected: {
      color: colors.textSecondary,
      fontWeight: '600',
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
      marginBottom: 8,
    },
    labelInput: {
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
    addMethodSubmitBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    addMethodSubmitBtnPressed: {
      opacity: 0.85,
    },
    addMethodSubmitText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    presetsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    presetButton: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
    },
    presetButtonSelected: {
      backgroundColor: theme === 'dark' ? 'rgba(255, 215, 0, 0.2)' : '#FEF3C7',
      borderColor: '#F59E0B',
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
      color: '#D97706',
    },
    presetTextUnselected: {
      color: colors.textSecondary,
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
      minHeight: 85,
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
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
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
