import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from '../services/supabase';
import { Gamepad2, ShieldAlert, KeyRound, RefreshCw } from 'lucide-react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../context/ThemeContext';

export default function AboutModal() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Console Vault Architecture</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* APP BADGE */}
        <View style={styles.badgeCard}>
          <Gamepad2 size={40} color={styles.accentIcon.color} strokeWidth={1.8} style={styles.badgeIconMargin} />
          <Text style={styles.appName}>Console Vault</Text>
          <Text style={styles.appTagline}>PS5 Account & Warranty Management</Text>
          <Text style={styles.appVersion}>Version 1.0.0 (Production Build)</Text>
        </View>

        {/* SECURITY STATUS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SECURITY & CLOUD STATUS</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Biometric Guard</Text>
            <Text style={styles.statusValueSuccess}>Active (FaceID / TouchID)</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Offline Storage</Text>
            <Text style={styles.statusValueSuccess}>Encrypted Cache Ready</Text>
          </View>

          <View style={styles.statusRowLast}>
            <Text style={styles.statusLabel}>Supabase Cloud</Text>
            <Text style={isSupabaseConfigured ? styles.statusValueSuccess : styles.statusValueWarning}>
              {isSupabaseConfigured ? 'Connected' : 'Offline / Local Demo'}
            </Text>
          </View>
        </View>

        {/* CORE WORKFLOWS SUMMARY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>INTEGRATED PROTOCOLS</Text>

          <View style={styles.protocolItem}>
            <View style={styles.protocolTitleRow}>
              <ShieldAlert size={14} color={styles.dangerColor.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>The Padlock Protocol</Text>
            </View>
            <Text style={styles.protocolDescription}>
              Instant license revocation claim dispatch via WhatsApp and Telegram with live warranty calculations.
            </Text>
          </View>

          <View style={styles.protocolItem}>
            <View style={styles.protocolTitleRow}>
              <KeyRound size={14} color={styles.warningColor.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>Tap-to-Reveal Credentials</Text>
            </View>
            <Text style={styles.protocolDescription}>
              Protected PSN emails, passwords, and 2FA backup codes behind on-device biometric security.
            </Text>
          </View>

          <View>
            <View style={styles.protocolTitleRow}>
              <RefreshCw size={14} color={styles.accentIcon.color} strokeWidth={2.2} />
              <Text style={styles.protocolTitle}>Automatic Credential Archival</Text>
            </View>
            <Text style={styles.protocolDescription}>
              Whenever credentials are replaced by a seller, the old credentials are saved to your audit log.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
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
