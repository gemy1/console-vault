import React, { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import * as Haptics from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Upload,
  Key,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Database,
  Lock,
  HardDrive,
  Share2,
} from 'lucide-react-native';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { MasterBackupService } from '../../services/backup/masterBackupService';
import { useVaultSync } from '../../context/VaultSyncContext';

interface MasterBackupModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'export' | 'restore' | 'csv';
type LoadingAction = 'device' | 'share' | 'restore' | 'csv_device' | 'csv_share' | null;

export function MasterBackupModal({ visible, onClose }: MasterBackupModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useVaultTheme();
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const vaultSync = useVaultSync();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16);

  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Export state
  const [exportPassword, setExportPassword] = useState('');
  const [exportConfirm, setExportConfirm] = useState('');

  // Restore state
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  const handlePickFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const picked = await MasterBackupService.pickBackupFile();
      if (picked) {
        setSelectedFileUri(picked.uri);
        setSelectedFileName(picked.name);
      }
    } catch (err) {
      console.warn('Pick file error:', err);
    }
  };

  const validateExportPassword = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!exportPassword.trim()) {
      const msg = isRTL
        ? 'يرجى إدخال كلمة مرور لحماية وتشفير ملف النسخة الاحتياطية.'
        : 'Please enter a password to encrypt and protect your backup file.';
      setErrorMessage(msg);
      Alert.alert(isRTL ? 'كلمة المرور مطلوبة' : 'Password Required', msg);
      return false;
    }

    if (exportPassword !== exportConfirm) {
      const msg = isRTL
        ? 'يرجى التأكد من تطابق كلمتي المرور المدخلتين.'
        : 'Please make sure both entered passwords match.';
      setErrorMessage(msg);
      Alert.alert(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords Do Not Match', msg);
      return false;
    }

    return true;
  };

  // 1. Save directly to phone storage (Downloads / Documents via SAF)
  const handleSaveToDevice = async () => {
    if (!validateExportPassword()) return;

    setLoadingAction('device');
    setTimeout(async () => {
      try {
        const result = await MasterBackupService.saveMasterBackupToDevice(exportPassword);
        setLoadingAction(null);

        if (result.cancelled) {
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const successMsg = isRTL
          ? 'تم حفظ النسخة الاحتياطية المشفرة (.vault) بنجاح في مجلد الجهاز!'
          : 'Encrypted backup (.vault) saved directly to your device storage!';

        setSuccessMessage(successMsg);
        Alert.alert(isRTL ? 'تم الحفظ بنجاح!' : 'Saved to Device!', successMsg);
        setExportPassword('');
        setExportConfirm('');
      } catch (err: any) {
        setLoadingAction(null);
        const msg = err.message || (isRTL ? 'تعذر حفظ الملف في الجهاز.' : 'Failed to save to device.');
        setErrorMessage(msg);
        Alert.alert(isRTL ? 'خطأ أثناء الحفظ' : 'Save Error', msg);
      }
    }, 80);
  };

  // 2. Open Share Sheet (Google Drive, WhatsApp, etc.)
  const handleShareExport = async () => {
    if (!validateExportPassword()) return;

    setLoadingAction('share');
    setTimeout(async () => {
      try {
        await MasterBackupService.exportMasterBackupShare(exportPassword);
        setLoadingAction(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMessage(
          isRTL
            ? 'تم تجهيز النسخة الاحتياطية! يمكنك الآن حفظها في Google Drive أو الواتساب.'
            : 'Backup ready! Choose Google Drive or your preferred app in the share sheet.'
        );
        setExportPassword('');
        setExportConfirm('');
      } catch (err: any) {
        setLoadingAction(null);
        const msg = err.message || (isRTL ? 'تعذر تصدير النسخة الاحتياطية.' : 'Failed to share backup.');
        setErrorMessage(msg);
        Alert.alert(isRTL ? 'خطأ في التصدير' : 'Export Error', msg);
      }
    }, 80);
  };

  const handleRestore = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedFileUri) {
      const msg = isRTL
        ? 'يرجى اختيار ملف النسخة الاحتياطية (.vault) أولاً.'
        : 'Please pick a (.vault) backup file first.';
      setErrorMessage(msg);
      Alert.alert(isRTL ? 'يرجى اختيار ملف' : 'File Required', msg);
      return;
    }

    if (!restorePassword.trim()) {
      const msg = isRTL
        ? 'يرجى إدخال كلمة المرور التي تم استخدامها عند إنشاء النسخة الاحتياطية.'
        : 'Please enter the password used when creating the backup.';
      setErrorMessage(msg);
      Alert.alert(isRTL ? 'كلمة المرور مطلوبة' : 'Password Required', msg);
      return;
    }

    setLoadingAction('restore');
    // Yield to JS event loop so loading spinner renders immediately
    setTimeout(async () => {
      try {
        const result = await MasterBackupService.restoreMasterBackup(
          selectedFileUri,
          restorePassword,
          restoreMode
        );
        setLoadingAction(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Trigger sync context to refresh UI
        if (vaultSync) {
          vaultSync.refreshData();
        }

        const successText = isRTL
          ? `تمت استعادة ${result.gamesCount} لعبة و ${result.clientsCount} عميل بنجاح.`
          : `Successfully restored ${result.gamesCount} games and ${result.clientsCount} clients.`;

        setSuccessMessage(successText);

        Alert.alert(
          isRTL ? 'تمت الاستعادة بنجاح!' : 'Restore Successful!',
          successText,
          [
            {
              text: isRTL ? 'حسناً' : 'Done',
              onPress: () => {
                setSelectedFileUri(null);
                setRestorePassword('');
                onClose();
              },
            },
          ]
        );
      } catch (err: any) {
        setLoadingAction(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        let msg = isRTL
          ? 'تعذر استعادة الملف. يرجى التحقق من صحة الملف وكلمة المرور.'
          : 'Failed to restore. Please check the file and password.';

        if (err.message === 'COULD_NOT_READ_FILE') {
          msg = isRTL
            ? 'تعذر قراءة ملف النسخة المختار. يرجى التأكد من اختيار الملف من مجلد Downloads أو إعطاء صلاحية الوصول.'
            : 'Could not access or read the selected file. Please pick it directly from Downloads or local files.';
        } else if (err.message === 'INVALID_FORMAT') {
          msg = isRTL
            ? 'الملف المحدد ليس ملف نسخة احتياطية صالح لـ Console Vault (يجب أن يبدأ بـ cvault:v1).'
            : 'The selected file is not a valid Console Vault backup (must begin with cvault:v1).';
        } else if (err.message === 'INVALID_PASSWORD_OR_CORRUPT') {
          msg = isRTL
            ? 'كلمة المرور غير صحيحة أو تم تعديل محتوى الملف.'
            : 'Incorrect password or file has been corrupted/tampered with.';
        } else if (err.message === 'INVALID_SCHEMA') {
          msg = isRTL
            ? 'هيكل بيانات النسخة الاحتياطية غير متوافق.'
            : 'Backup data structure is corrupted or incompatible.';
        } else if (err.message) {
          msg = `${err.message}`;
        }

        setErrorMessage(msg);
        Alert.alert(
          isRTL ? 'فشل التحقق من النسخة' : 'Validation Failed',
          msg + (isRTL ? '\n\nلم يتم إجراء أي تغيير على بياناتك الحالية.' : '\n\nYour existing vault data was not modified.')
        );
      }
    }, 80);
  };

  const handleSaveCSVToDevice = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingAction('csv_device');

    setTimeout(async () => {
      try {
        const result = await MasterBackupService.saveBookkeepingCSVToDevice();
        setLoadingAction(null);

        if (result.cancelled) {
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg = isRTL
          ? 'تم حفظ ملف الإكسيل (CSV) بنجاح في مجلد الجهاز!'
          : 'Sales spreadsheet (CSV) saved to device storage!';
        setSuccessMessage(msg);
        Alert.alert(isRTL ? 'تم الحفظ بنجاح!' : 'Saved to Device!', msg);
      } catch (err: any) {
        setLoadingAction(null);
        const msg = err.message || (isRTL ? 'تعذر حفظ ملف الإكسيل.' : 'Failed to save CSV to device.');
        setErrorMessage(msg);
        Alert.alert(isRTL ? 'خطأ أثناء الحفظ' : 'Save Error', msg);
      }
    }, 80);
  };

  const handleShareCSV = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingAction('csv_share');

    setTimeout(async () => {
      try {
        await MasterBackupService.exportBookkeepingCSVShare();
        setLoadingAction(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMessage(
          isRTL
            ? 'تم إنشاء ومشاركة كشف الحساب (CSV) بنجاح!'
            : 'Bookkeeping CSV exported and shared successfully!'
        );
      } catch (err: any) {
        setLoadingAction(null);
        const msg = err.message || (isRTL ? 'تعذر إنشاء ملف الإكسيل.' : 'Failed to create CSV.');
        setErrorMessage(msg);
        Alert.alert(isRTL ? 'خطأ في التصدير' : 'Export Error', msg);
      }
    }, 80);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={[styles.modalContent, { paddingBottom: bottomInset + 16 }]}>
            {/* Header */}
          <View style={[styles.header, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerTitleRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.iconCircle}>
                <Database size={22} color={colors.accent} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isRTL ? 'إدارة النسخ الاحتياطي والبيانات' : 'Master Backup & Data'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isRTL ? 'نسخ واستعادة مشفرة تعمل بدون إنترنت' : 'Encrypted offline data portability'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={() => setActiveTab('export')}
              style={[styles.tabBtn, activeTab === 'export' && styles.tabBtnActive]}
            >
              <Download
                size={16}
                color={activeTab === 'export' ? colors.pillActiveText : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>
                {isRTL ? 'تصدير نسخة' : 'Export Vault'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('restore')}
              style={[styles.tabBtn, activeTab === 'restore' && styles.tabBtnActive]}
            >
              <Upload
                size={16}
                color={activeTab === 'restore' ? colors.pillActiveText : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'restore' && styles.tabTextActive]}>
                {isRTL ? 'استعادة نسخة' : 'Restore Vault'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('csv')}
              style={[styles.tabBtn, activeTab === 'csv' && styles.tabBtnActive]}
            >
              <FileSpreadsheet
                size={16}
                color={activeTab === 'csv' ? colors.pillActiveText : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'csv' && styles.tabTextActive]}>
                {isRTL ? 'شيت إكسيل' : 'Excel CSV'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, { paddingBottom: bottomInset + 32 }]}
          >
            {/* Inline Notifications */}
            {errorMessage ? (
              <View style={[styles.errorBox, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={[styles.successBox, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* TAB 1: EXPORT */}
            {activeTab === 'export' && (
              <View style={styles.tabSection}>
                <View style={styles.infoBox}>
                  <ShieldCheck size={20} color={colors.accent} />
                  <Text style={styles.infoText}>
                    {isRTL
                      ? 'يتم تجميع كافة الألعاب، العملاء، المبيعات، والإعدادات في ملف واحد (.vault) مشفر بـ AES-256-GCM. يمكنك حفظه في Google Drive أو إرساله لنفسك عبر الواتساب.'
                      : 'All games, sellers, clients, sales, and preferences are packaged into a single (.vault) file encrypted with AES-256-GCM. You can save it to Google Drive or WhatsApp.'}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{isRTL ? 'كلمة مرور النسخة الاحتياطية' : 'Backup Password'}</Text>
                  <View style={styles.inputWrap}>
                    <Lock size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder={isRTL ? 'أدخل كلمة مرور قوية...' : 'Enter a strong password...'}
                      placeholderTextColor={colors.textMuted}
                      value={exportPassword}
                      onChangeText={setExportPassword}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Text>
                  <View style={styles.inputWrap}>
                    <Lock size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder={isRTL ? 'أعد إدخال كلمة المرور...' : 'Re-enter password...'}
                      placeholderTextColor={colors.textMuted}
                      value={exportConfirm}
                      onChangeText={setExportConfirm}
                    />
                  </View>
                </View>

                <View style={{ gap: 10, marginTop: 6 }}>
                  <Pressable
                    onPress={handleSaveToDevice}
                    disabled={loadingAction !== null}
                    style={[styles.primaryActionBtn, loadingAction !== null && { opacity: 0.7 }]}
                  >
                    {loadingAction === 'device' ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>
                          {isRTL ? 'جاري الحفظ في مجلد الجهاز...' : 'Saving to Device Storage...'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <HardDrive size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>
                          {isRTL ? 'حفظ في ملفات الجهاز / الهاتف' : 'Save to Device Storage'}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleShareExport}
                    disabled={loadingAction !== null}
                    style={[styles.secondaryActionBtn, loadingAction !== null && { opacity: 0.7 }]}
                  >
                    {loadingAction === 'share' ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={styles.secondaryActionText}>
                          {isRTL ? 'جاري تجهيز المشاركة...' : 'Preparing Share Sheet...'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Share2 size={18} color={colors.accent} />
                        <Text style={styles.secondaryActionText}>
                          {isRTL ? 'مشاركة أو حفظ في Google Drive' : 'Share / Save to Google Drive'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* TAB 2: RESTORE */}
            {activeTab === 'restore' && (
              <View style={styles.tabSection}>
                <View style={styles.infoBox}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <Text style={styles.infoText}>
                    {isRTL
                      ? 'اختر ملف النسخة الاحتياطية (.vault) من جهازك أو من Google Drive، ثم أدخل كلمة المرور لاستعادة بياناتك بالكامل.'
                      : 'Select a (.vault) file from your device or Google Drive, then enter your password to completely restore your vault.'}
                  </Text>
                </View>

                {/* File Picker */}
                <Pressable onPress={handlePickFile} style={styles.pickFileBtn}>
                  <FolderOpen size={22} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickFileTitle}>
                      {selectedFileName ? selectedFileName : selectedFileUri ? (isRTL ? 'تم اختيار الملف بنجاح' : 'File Selected') : (isRTL ? 'اختر ملف النسخة (.vault)' : 'Pick .vault File')}
                    </Text>
                    <Text style={styles.pickFileSubtitle} numberOfLines={1}>
                      {selectedFileUri || (isRTL ? 'اضغط للتصفح في Google Drive أو الملفات' : 'Browse Google Drive or local storage')}
                    </Text>
                  </View>
                  <CheckCircle2 size={18} color={selectedFileUri ? '#10B981' : colors.textMuted} />
                </Pressable>

                {/* Password Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{isRTL ? 'كلمة مرور فك التشفير' : 'Decryption Password'}</Text>
                  <View style={styles.inputWrap}>
                    <Key size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder={isRTL ? 'كلمة المرور الخاصة بالملف...' : 'Backup password...'}
                      placeholderTextColor={colors.textMuted}
                      value={restorePassword}
                      onChangeText={setRestorePassword}
                    />
                  </View>
                </View>

                {/* Restore Mode */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{isRTL ? 'طريقة الاستعادة' : 'Restore Mode'}</Text>
                  <View style={[styles.modeRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                    <Pressable
                      onPress={() => setRestoreMode('replace')}
                      style={[styles.modeBtn, restoreMode === 'replace' && styles.modeBtnActive]}
                    >
                      <Text style={[styles.modeBtnText, restoreMode === 'replace' && styles.modeBtnTextActive]}>
                        {isRTL ? 'استبدال كامل (موصى به)' : 'Replace All (Recommended)'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRestoreMode('merge')}
                      style={[styles.modeBtn, restoreMode === 'merge' && styles.modeBtnActive]}
                    >
                      <Text style={[styles.modeBtnText, restoreMode === 'merge' && styles.modeBtnTextActive]}>
                        {isRTL ? 'دمج مع الحالي' : 'Merge Records'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleRestore}
                  disabled={loadingAction !== null}
                  style={[styles.restoreActionBtn, loadingAction !== null && { opacity: 0.7 }]}
                >
                  {loadingAction === 'restore' ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>
                        {isRTL ? 'جاري فك التشفير والتحقق...' : 'Verifying & Restoring...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Upload size={18} color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>
                        {isRTL ? 'بدء استعادة البيانات' : 'Restore Vault Data'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* TAB 3: CSV EXCEL */}
            {activeTab === 'csv' && (
              <View style={styles.tabSection}>
                <View style={styles.infoBox}>
                  <FileSpreadsheet size={20} color="#10B981" />
                  <Text style={styles.infoText}>
                    {isRTL
                      ? 'تصدير كشف حساب كامل لكافة المبيعات والعملاء بصيغة CSV المتوافقة تماماً مع Microsoft Excel و Google Sheets باللغة العربية والإنجليزية.'
                      : 'Export a complete sales ledger and clients report in CSV format compatible with Microsoft Excel and Google Sheets with full UTF-8 Arabic support.'}
                  </Text>
                </View>

                <View style={{ gap: 10, marginTop: 6 }}>
                  <Pressable
                    onPress={handleSaveCSVToDevice}
                    disabled={loadingAction !== null}
                    style={[styles.csvActionBtn, loadingAction !== null && { opacity: 0.7 }]}
                  >
                    {loadingAction === 'csv_device' ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>
                          {isRTL ? 'جاري حفظ ملف الإكسيل في الجهاز...' : 'Saving CSV to Device...'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <HardDrive size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>
                          {isRTL ? 'حفظ ملف الإكسيل في الهاتف' : 'Save CSV to Device Storage'}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleShareCSV}
                    disabled={loadingAction !== null}
                    style={[styles.secondaryActionBtn, loadingAction !== null && { opacity: 0.7 }]}
                  >
                    {loadingAction === 'csv_share' ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={styles.secondaryActionText}>
                          {isRTL ? 'جاري تجهيز المشاركة...' : 'Preparing Share Sheet...'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Share2 size={18} color={colors.accent} />
                        <Text style={styles.secondaryActionText}>
                          {isRTL ? 'مشاركة شيت الإكسيل (Drive / واتساب)' : 'Share Excel CSV'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    keyboardAvoid: {
      width: '100%',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: 'Cairo_700Bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      fontFamily: 'Cairo_400Regular',
      color: colors.textMuted,
    },
    closeBtn: {
      padding: 6,
    },
    tabsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    tabBtnActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    tabText: {
      fontSize: 13,
      fontFamily: 'Cairo_600SemiBold',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.pillActiveText,
      fontFamily: 'Cairo_700Bold',
    },
    body: {
      paddingHorizontal: 20,
    },
    bodyContent: {
      paddingTop: 14,
      paddingBottom: 20,
    },
    tabSection: {
      gap: 16,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    infoText: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: 'Cairo_400Regular',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: 'Cairo_600SemiBold',
      color: '#EF4444',
      lineHeight: 18,
    },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 12,
    },
    successText: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: 'Cairo_600SemiBold',
      color: '#10B981',
      lineHeight: 18,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: 'Cairo_600SemiBold',
      color: colors.text,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 48,
    },
    input: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Cairo_400Regular',
      color: colors.text,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      height: 50,
      marginTop: 6,
    },
    restoreActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#10B981',
      borderRadius: 14,
      height: 50,
      marginTop: 6,
    },
    csvActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#059669',
      borderRadius: 14,
      height: 50,
      marginTop: 6,
    },
    primaryActionText: {
      fontSize: 15,
      fontFamily: 'Cairo_700Bold',
      color: '#FFFFFF',
    },
    secondaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderRadius: 14,
      height: 48,
    },
    secondaryActionText: {
      fontSize: 14,
      fontFamily: 'Cairo_700Bold',
      color: colors.accent,
    },
    pickFileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.accent,
      borderRadius: 14,
      padding: 14,
    },
    pickFileTitle: {
      fontSize: 14,
      fontFamily: 'Cairo_700Bold',
      color: colors.text,
    },
    pickFileSubtitle: {
      fontSize: 12,
      fontFamily: 'Cairo_400Regular',
      color: colors.textMuted,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    modeBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    modeBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    modeBtnText: {
      fontSize: 12,
      fontFamily: 'Cairo_600SemiBold',
      color: colors.textSecondary,
    },
    modeBtnTextActive: {
      color: colors.accent,
      fontFamily: 'Cairo_700Bold',
    },
  });
