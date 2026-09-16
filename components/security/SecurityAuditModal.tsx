import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import * as Haptics from '@/utils/haptics';
import {
  X,
  ShieldCheck,
  Eye,
  Copy,
  Download,
  Upload,
  Lock,
  Trash2,
  Clock,
} from 'lucide-react-native';
import { useVaultTheme, ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useCustomAlert } from '../../context/AlertContext';
import { AuditLogService, AuditLogEntry, AuditAction } from '../../services/security/auditLogService';

interface SecurityAuditModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SecurityAuditModal({ visible, onClose }: SecurityAuditModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useVaultTheme();
  const { isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;
  const { showAlert } = useCustomAlert();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (visible) {
      setLogs(AuditLogService.getLogs());
    }
  }, [visible]);

  const handleClearLogs = () => {
    showAlert({
      title: isRTL ? 'مسح سجل الأمان' : 'Clear Security Log',
      message: isRTL
        ? 'هل أنت متأكد من رغبتك في مسح كافة سجلات الأمان المسجلة محلياً؟'
        : 'Are you sure you want to clear all locally recorded security audit logs?',
      type: 'danger',
      buttons: [
        {
          text: isRTL ? 'مسح' : 'Clear',
          style: 'destructive',
          onPress: () => {
            AuditLogService.clearLogs();
            setLogs([]);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          },
        },
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ],
    });
  };

  const getActionConfig = (action: AuditAction) => {
    switch (action) {
      case 'CREDENTIAL_VIEWED':
        return {
          icon: Eye,
          color: '#3B82F6',
          title: isRTL ? 'كشف كلمة مرور' : 'Credentials Revealed',
        };
      case 'CREDENTIAL_COPIED':
        return {
          icon: Copy,
          color: '#8B5CF6',
          title: isRTL ? 'نسخ بيانات الحساب' : 'Credentials Copied',
        };
      case 'MASTER_BACKUP_EXPORTED':
        return {
          icon: Download,
          color: '#10B981',
          title: isRTL ? 'تصدير نسخة احتياطية' : 'Backup Exported',
        };
      case 'MASTER_BACKUP_IMPORTED':
        return {
          icon: Upload,
          color: '#F59E0B',
          title: isRTL ? 'استعادة نسخة احتياطية' : 'Backup Restored',
        };
      case 'SECURITY_LOCK_TRIGGERED':
        return {
          icon: Lock,
          color: '#EC4899',
          title: isRTL ? 'قفل الأمان' : 'Security Lock',
        };
      default:
        return {
          icon: ShieldCheck,
          color: colors.accent,
          title: isRTL ? 'عملية أمنية' : 'Security Event',
        };
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={[styles.header, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerTitleRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={22} color={colors.accent} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isRTL ? 'سجل الأمان والعمليات الحساسة' : 'Security Audit Log'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isRTL ? 'سجل محلي للعمليات الحساسة على الحسابات' : 'Local record of sensitive actions'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {logs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Clock size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{isRTL ? 'لا توجد سجلات بعد' : 'No Audit Logs Yet'}</Text>
                <Text style={styles.emptySubtitle}>
                  {isRTL
                    ? 'سيتم تسجيل أي عملية كشف لكلمات المرور أو نسخها أو تصدير النسخ الاحتياطية هنا تلقائياً.'
                    : 'Any credential reveals, copies, and backup exports will be automatically recorded here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.listWrap}>
                {logs.map((item) => {
                  const cfg = getActionConfig(item.action);
                  const Icon = cfg.icon;
                  return (
                    <View
                      key={item.id}
                      style={[styles.logCard, isNativeRTL && { flexDirection: 'row-reverse' }]}
                    >
                      <View style={[styles.logIconCircle, { backgroundColor: `${cfg.color}18` }]}>
                        <Icon size={18} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.logHeaderRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                          <Text style={styles.logTitle}>{cfg.title}</Text>
                          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
                        </View>
                        <Text style={styles.logDetails} numberOfLines={2}>
                          {item.details}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer with Clear Button */}
          {logs.length > 0 && (
            <View style={styles.footer}>
              <Pressable
                onPress={handleClearLogs}
                style={[styles.clearBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.clearBtnText}>{isRTL ? 'مسح سجل العمليات' : 'Clear Log History'}</Text>
              </Pressable>
            </View>
          )}
        </View>
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
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
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
    body: {
      paddingHorizontal: 20,
    },
    bodyContent: {
      paddingVertical: 16,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: 'Cairo_700Bold',
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: 'Cairo_400Regular',
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 18,
    },
    listWrap: {
      gap: 10,
    },
    logCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    logIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    logHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    logTitle: {
      fontSize: 13.5,
      fontFamily: 'Cairo_700Bold',
      color: colors.text,
    },
    logTime: {
      fontSize: 11,
      fontFamily: 'Cairo_400Regular',
      color: colors.textMuted,
    },
    logDetails: {
      fontSize: 12,
      fontFamily: 'Cairo_400Regular',
      color: colors.textSecondary,
      lineHeight: 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    clearBtnText: {
      fontSize: 13,
      fontFamily: 'Cairo_600SemiBold',
      color: '#EF4444',
    },
  });
