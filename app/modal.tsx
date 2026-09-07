import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { VaultText as Text } from '../components/common/VaultText';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from '../services/supabase';
import { Gamepad2, ShieldAlert, KeyRound, RefreshCw } from 'lucide-react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function AboutModal() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('architectureTitle')}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.doneText}>{t('btnDone')}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* APP BADGE */}
        <View style={styles.badgeCard}>
          <Gamepad2 size={40} color={styles.accentIcon.color} strokeWidth={1.8} style={styles.badgeIconMargin} />
          <Text style={styles.appName}>Console Vault</Text>
          <Text style={[styles.appTagline, isRTL && styles.rtlText]}>{t('appTagline')}</Text>
          <Text style={styles.appVersion}>{t('appVersion')}</Text>
        </View>

        {/* SECURITY STATUS */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('securityCloudStatus')}</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('biometricGuardLabel')}</Text>
            <Text style={styles.statusValueSuccess}>{t('biometricStatusActive')}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('offlineStorageLabel')}</Text>
            <Text style={styles.statusValueSuccess}>{t('offlineStatusReady')}</Text>
          </View>

          <View style={styles.statusRowLast}>
            <Text style={styles.statusLabel}>{t('supabaseCloudLabel')}</Text>
            <Text style={isSupabaseConfigured ? styles.statusValueSuccess : styles.statusValueWarning}>
              {isSupabaseConfigured ? t('cloudConnected') : t('cloudOfflineLocal')}
            </Text>
          </View>
        </View>

        {/* CORE WORKFLOWS SUMMARY */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('integratedProtocols')}</Text>

          <View style={styles.protocolItem}>
            <View style={styles.protocolTitleRow}>
              <ShieldAlert size={14} color={styles.dangerColor.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>{t('protocolPadlockTitle')}</Text>
            </View>
            <Text style={[styles.protocolDescription, isRTL && styles.rtlText]}>
              {t('protocolPadlockDesc')}
            </Text>
          </View>

          <View style={styles.protocolItem}>
            <View style={styles.protocolTitleRow}>
              <KeyRound size={14} color={styles.warningColor.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>{t('protocolMultiChannelTitle')}</Text>
            </View>
            <Text style={[styles.protocolDescription, isRTL && styles.rtlText]}>
              {t('protocolMultiChannelDesc')}
            </Text>
          </View>

          <View>
            <View style={styles.protocolTitleRow}>
              <RefreshCw size={14} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>{t('protocolRevisionTitle')}</Text>
            </View>
            <Text style={[styles.protocolDescription, isRTL && styles.rtlText]}>
              {t('protocolRevisionDesc')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    rtlText: {
      textAlign: 'right',
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    doneText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    accentIcon: {
      color: colors.accent,
    },
    dangerColor: {
      color: colors.danger,
    },
    warningColor: {
      color: colors.warning,
    },
    badgeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    badgeIconMargin: {
      marginBottom: 8,
    },
    appName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    appTagline: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    appVersion: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    statusLabel: {
      color: colors.text,
      fontSize: 13,
    },
    statusValueSuccess: {
      color: colors.success,
      fontSize: 13,
      fontWeight: '700',
    },
    statusValueWarning: {
      color: colors.warning,
      fontSize: 13,
      fontWeight: '700',
    },
    protocolItem: {
      marginBottom: 14,
    },
    protocolTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    protocolTitle: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    protocolDescription: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
      lineHeight: 16,
    },
  });
