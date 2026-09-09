import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import { X, User, Phone, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Client, ContactPlatform } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface ClientFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void> | void;
  initialClient?: Client | null;
}

const PLATFORMS: ContactPlatform[] = ['WhatsApp', 'Telegram', 'Discord', 'Facebook', 'Other'];

export function ClientFormModal({
  visible,
  onClose,
  onSave,
  initialClient,
}: ClientFormModalProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const [name, setName] = useState('');
  const [contactPlatform, setContactPlatform] = useState<ContactPlatform>('WhatsApp');
  const [contactLink, setContactLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name);
      setContactPlatform(initialClient.contact_platform || 'WhatsApp');
      setContactLink(initialClient.contact_link || '');
      setNotes(initialClient.notes || '');
    } else {
      setName('');
      setContactPlatform('WhatsApp');
      setContactLink('');
      setNotes('');
    }
    setErrorMsg(null);
  }, [initialClient, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg(isRTL ? 'يرجى إدخال اسم العميل' : 'Please enter client name');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSave({
        name: name.trim(),
        contact_platform: contactPlatform,
        contact_link: contactLink.trim(),
        notes: notes.trim() || undefined,
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.modalSheet}>
          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerTitleBlock, isRTL && { alignItems: 'flex-end' }]}>
              <Text style={styles.sheetTitle}>
                {initialClient
                  ? (isRTL ? 'تعديل بيانات العميل' : 'Edit Client')
                  : t('addNewClient')}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {isRTL
                  ? 'تسجيل المشتري للتواصل ومتابعة السلوتات'
                  : 'Register client for contact & warranty tracking'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={20} color={styles.closeIcon.color} />
            </Pressable>
          </View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* CLIENT NAME */}
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
              {t('clientName')} *
            </Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlText]}
              value={name}
              onChangeText={setName}
              placeholder={isRTL ? 'مثال: أحمد محمد' : 'e.g. Alex Hunter'}
              placeholderTextColor={styles.placeholder.color}
            />

            {/* CONTACT PLATFORM SELECTOR */}
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
              {isRTL ? 'طريقة التواصل' : 'Contact Channel'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.platformsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
            >
              {PLATFORMS.map((plt) => {
                const isSelected = contactPlatform === plt;
                return (
                  <Pressable
                    key={plt}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setContactPlatform(plt);
                    }}
                    style={[
                      styles.platformPill,
                      isSelected && styles.platformPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.platformPillText,
                        isSelected && styles.platformPillTextActive,
                      ]}
                    >
                      {plt}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* CONTACT HANDLE / NUMBER */}
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
              {t('clientContact')}
            </Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlText]}
              value={contactLink}
              onChangeText={setContactLink}
              placeholder={
                contactPlatform === 'WhatsApp'
                  ? '+201012345678'
                  : '@username'
              }
              placeholderTextColor={styles.placeholder.color}
              keyboardType={
                contactPlatform === 'WhatsApp'
                  ? 'phone-pad'
                  : 'default'
              }
            />

            {/* NOTES */}
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
              {t('fieldNotes')}
            </Text>
            <TextInput
              style={[styles.textArea, isRTL && styles.rtlText]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('fieldNotesPlaceholder')}
              placeholderTextColor={styles.placeholder.color}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          {/* FOOTER SAVE BUTTON */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>
                {isSubmitting
                  ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                  : t('btnSubmitSaveChanges')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, mode: ThemeMode) => {
  const isDark = mode === 'dark';

  return StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitleBlock: {
      flex: 1,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    sheetSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    closeIcon: {
      color: colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    scrollContent: {
      paddingBottom: 20,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    rtlText: {
      textAlign: 'right',
    },
    textInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    textArea: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 70,
      textAlignVertical: 'top',
    },
    placeholder: {
      color: colors.textMuted,
    },
    platformsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    platformPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    platformPillActive: {
      backgroundColor: isDark ? 'rgba(0, 112, 209, 0.2)' : '#EFF6FF',
      borderColor: '#0070D1',
    },
    platformPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    platformPillTextActive: {
      color: '#0070D1',
      fontWeight: '700',
    },
    footerRow: {
      marginTop: 10,
    },
    saveBtn: {
      backgroundColor: '#0070D1',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
};
