import { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  Linking,
  Platform,
  StyleSheet,
  Share,
  Animated,
} from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '@/utils/haptics';
import { useSwipeDownModal } from '../../hooks/useSwipeDownModal';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Gamepad2,
  ExternalLink,
} from 'lucide-react-native';
import { Game, Client, ClientAllocation } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';

interface WhatsAppDispatchModalProps {
  visible: boolean;
  game: Game;
  allocation: ClientAllocation;
  client?: Client;
  onClose: () => void;
}

export function WhatsAppDispatchModal({
  visible,
  game,
  allocation,
  client,
  onClose,
}: WhatsAppDispatchModalProps) {
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { formatCurrency } = usePersona();
  const [copied, setCopied] = useState(false);
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  // Format the slot label
  const slotName = useMemo(() => {
    switch (allocation.slot_type) {
      case 'Primary_PS5':
        return t('slotPrimaryPS5');
      case 'Primary_PS4':
        return t('slotPrimaryPS4');
      case 'Secondary_PS5':
        return t('slotSecondaryPS5');
      case 'Secondary_PS4':
        return t('slotSecondaryPS4');
      case 'Secondary':
        return t('slotSecondary');
      case 'Full':
        return t('slotFull');
      default:
        return allocation.slot_type;
    }
  }, [allocation.slot_type, t]);

  // Compute expiry date
  const expiryDate = useMemo(() => {
    try {
      const d = new Date(allocation.sale_date || new Date());
      d.setMonth(d.getMonth() + (allocation.warranty_months || 6));
      return d.toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  }, [allocation.sale_date, allocation.warranty_months]);

  // Activation steps based on slot type
  const activationGuide = useMemo(() => {
    if (isRTL) {
      if (allocation.slot_type === 'Primary_PS5') {
        return [
          '1. أضف مستخدماً جديداً على جهاز PS5 الخاص بك.',
          '2. سجّل الدخول باستخدام البريد وكلمة المرور ورمز 2FA أدناه.',
          '3. اذهب إلى: الإعدادات > المستخدمون والحسابات > أخرى > مشاركة الجهاز واللعب دون اتصال.',
          '4. اختر "تمكين / تفعيل" (Enable).',
          '5. ابدأ تحميل اللعبة، ثم ارجع لحسابك الشخصي والعب بحرية واجمع التروفيز!',
        ].join('\n');
      }
      if (allocation.slot_type === 'Primary_PS4') {
        return [
          '1. أضف مستخدماً جديداً على جهاز PS4 الخاص بك.',
          '2. سجّل الدخول بالبريد وكلمة المرور ورمز 2FA.',
          '3. اذهب إلى: الإعدادات > إدارة الحساب > تفعيل كجهازك الأساسي (Activate as Primary).',
          '4. اختر "تفعيل" (Activate).',
          '5. ابدأ تحميل اللعبة، ثم ارجع لحسابك الشخصي واستمتع باللعب!',
        ].join('\n');
      }
      if (allocation.slot_type.startsWith('Secondary')) {
        return [
          '1. أضف مستخدماً جديداً على جهاز الكونسول وسجّل الدخول بالبيانات.',
          '2. احرص على تعطيل (Disable) مشاركة الجهاز أو الحساب الأساسي.',
          '3. ابدأ تحميل اللعبة.',
          '4. للعب: شغّل اللعبة من هذا الحساب مباشرة وتأكد من اتصالك بالإنترنت.',
        ].join('\n');
      }
      return [
        '1. هذا الحساب ملكك بالكامل (حساب رئيسي كامل).',
        '2. سجّل الدخول وقم بتغيير كلمة المرور وربط بريدك الإلكتروني الشخصي وتأكيد التحقق بخطوتين.',
      ].join('\n');
    }

    // English instructions
    if (allocation.slot_type === 'Primary_PS5') {
      return [
        '1. Add New User on your PS5 console.',
        '2. Sign in using the email, password, and 2FA code below.',
        '3. Go to Settings > Users & Accounts > Other > Console Sharing and Offline Play.',
        '4. Select "Enable".',
        '5. Start the download, then switch back to your own personal profile to play & earn trophies!',
      ].join('\n');
    }
    if (allocation.slot_type === 'Primary_PS4') {
      return [
        '1. Add New User on your PS4 console.',
        '2. Sign in using the credentials below.',
        '3. Go to Settings > Account Management > Activate as Your Primary PS4.',
        '4. Select "Activate".',
        '5. Download the game, then switch back to your personal profile to play!',
      ].join('\n');
    }
    if (allocation.slot_type.startsWith('Secondary')) {
      return [
        '1. Add New User on your console and sign in.',
        '2. Ensure Console Sharing / Primary is DISABLED for this account.',
        '3. Download the game.',
        '4. To play: Launch and play directly on this account profile with an active internet connection.',
      ].join('\n');
    }
    return [
      '1. This is a Full Ownership Account.',
      '2. Sign in, update the password to your own, and bind your personal email & 2FA.',
    ].join('\n');
  }, [allocation.slot_type, isRTL]);

  const backupCode = game.backup_codes && game.backup_codes.length > 0 ? game.backup_codes[0] : 'N/A';

  // The generated text
  const messageBody = useMemo(() => {
    const divider = '───────────────────────────────';
    const clientGreeting = client?.name ? (isRTL ? `مرحباً ${client.name}،` : `Hello ${client.name},`) : '';

    if (isRTL) {
      return [
        `🎮 خزينة الكونسول - فاتورة وتفاصيل الطلب`,
        divider,
        clientGreeting,
        `اللعبة: ${game.title}`,
        `المنصة: ${game.platform === 'BOTH' ? 'PS4 و PS5' : game.platform || 'PS5'}`,
        `نوع السلوت: ${slotName}`,
        `سعر البيع: ${formatCurrency(allocation.sale_price, allocation.currency)}`,
        `مدة الضمان: ${allocation.warranty_months} شهور (سارٍ حتى ${expiryDate})`,
        divider,
        `🔑 بيانات الحساب:`,
        `البريد: ${game.psn_email}`,
        `كلمة المرور: ${game.psn_password || '••••••••'}`,
        `رمز 2FA الاحتياطي: ${backupCode}`,
        divider,
        `📌 خطوات التفعيل والاستخدام:`,
        activationGuide,
        divider,
        `شكراً لثقتك بنا! لأي استفسار لا تتردد في مراسلتنا.`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `🎮 CONSOLE VAULT - ORDER CONFIRMATION`,
      divider,
      clientGreeting,
      `Game: ${game.title}`,
      `Platform: ${game.platform === 'BOTH' ? 'PS4 • PS5 Cross-Gen' : game.platform || 'PS5'}`,
      `Slot: ${slotName}`,
      `Price Paid: ${formatCurrency(allocation.sale_price, allocation.currency)}`,
      `Warranty: ${allocation.warranty_months} Months (Valid until ${expiryDate})`,
      divider,
      `🔑 PSN ACCOUNT CREDENTIALS:`,
      `Email: ${game.psn_email}`,
      `Password: ${game.psn_password || '••••••••'}`,
      `2FA Backup Code: ${backupCode}`,
      divider,
      `📌 ACTIVATION & SETUP INSTRUCTIONS:`,
      activationGuide,
      divider,
      `Thank you for your purchase! Enjoy the game.`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [game, allocation, client, slotName, expiryDate, backupCode, activationGuide, isRTL, formatCurrency]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(messageBody);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const rawPhone = client?.contact_link?.replace(/[^0-9]/g, '') || '';
    const encodedText = encodeURIComponent(messageBody);

    let url = `whatsapp://send?text=${encodedText}`;
    if (rawPhone) {
      url = `whatsapp://send?phone=${rawPhone}&text=${encodedText}`;
    }

    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to web WhatsApp
      const webUrl = rawPhone
        ? `https://wa.me/${rawPhone}?text=${encodedText}`
        : `https://api.whatsapp.com/send?text=${encodedText}`;
      await Linking.openURL(webUrl).catch(() => {
        handleCopy();
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: messageBody });
    } catch {}
  };

  const { panY, panHandlers, closeWithSlide } = useSwipeDownModal({ visible, onClose });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeWithSlide}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithSlide} />

        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: panY }] }]}>
          <View {...panHandlers} style={styles.handleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.headerLeft, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.iconCircle}>
                <MessageCircle size={20} color="#30D158" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                  {t('dispatchWhatsApp')}
                </Text>
                <Text style={[styles.headerSub, isRTL && styles.rtlText]}>
                  {game.title} • {slotName}
                </Text>
              </View>
            </View>

            <Pressable onPress={closeWithSlide} style={styles.closeBtn}>
              <X size={18} color={styles.closeIcon.color} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* MESSAGE PREVIEW CARD */}
          <ScrollView style={styles.previewContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.previewText}>{messageBody}</Text>
          </ScrollView>

          {/* ACTIONS ROW */}
          <View style={[styles.actionsRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={handleCopy}
              style={[styles.actionBtn, styles.copyBtn]}
            >
              {copied ? (
                <Check size={18} color="#30D158" strokeWidth={2.4} />
              ) : (
                <Copy size={18} color={styles.actionBtnText.color} strokeWidth={2.2} />
              )}
              <Text style={[styles.actionBtnText, copied && { color: '#30D158' }]}>
                {copied ? t('btnCopied') : t('copyReceipt')}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleOpenWhatsApp}
              style={[styles.actionBtn, styles.whatsAppBtn]}
            >
              <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.whatsAppBtnText}>{t('openWhatsApp')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      maxHeight: '85%',
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: 'rgba(48, 209, 88, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(48, 209, 88, 0.3)',
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    headerSub: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    closeBtn: {
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
    rtlText: {
      textAlign: 'right',
    },
    previewContainer: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginVertical: 16,
      maxHeight: 280,
    },
    previewText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 19,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    copyBtn: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    whatsAppBtn: {
      backgroundColor: '#25D366',
      boxShadow: '0px 4px 16px rgba(37, 211, 102, 0.35)',
      elevation: 4,
    },
    whatsAppBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
