import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { Game, Seller } from '../../types/vault';
import {
  calculateWarranty,
  generateWarrantyClaimMessage,
} from '../../utils/padlock';
import { PlatformIcon } from '../../components/common';
import { PulsingPadlockBadge } from '../../components/games';
import { Copy, Check, ChevronRight } from 'lucide-react-native';
import { getSellerContactList, openSellerContact } from '../../utils/contacts';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export default function PadlockProtocolModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const [game, setGame] = useState<Game | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const games = OfflineVault.getGames();
    const found = games.find((g) => g.id === id);
    if (found) {
      setGame(found);
      if (found.seller_id) {
        const sellers = OfflineVault.getSellers();
        const foundSeller = sellers.find((s) => s.id === found.seller_id);
        if (foundSeller) setSeller(foundSeller);
      }
    }
  }, [id]);

  if (!game) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>No game selected.</Text>
      </SafeAreaView>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const claimMessage = generateWarrantyClaimMessage(game, seller || undefined);
  const contacts = seller ? getSellerContactList(seller) : [];

  const handleCopy = async () => {
    await Clipboard.setStringAsync(claimMessage);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkInResolution = () => {
    OfflineVault.updateGame(game.id, { status: 'In Resolution' });
    Alert.alert('Status Updated', 'Game marked as In Resolution.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Text style={styles.headerTitle}>PADLOCK PROTOCOL</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ALERT HEADER */}
        <View style={styles.alertCard}>
          <PulsingPadlockBadge size="lg" showLabel={false} />
          <Text style={styles.alertTitle}>License Revocation Protocol</Text>
          <Text style={styles.alertSubtitle}>
            Generate and dispatch your automated warranty replacement claim.
          </Text>
        </View>

        {/* STATUS CARD */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>WARRANTY VERIFICATION</Text>
          <View style={styles.warrantyRow}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text
              style={[
                styles.warrantyStatus,
                warranty.isWarrantyActive ? styles.warrantyActive : styles.warrantyExpired,
              ]}
            >
              {warranty.isWarrantyActive ? `ACTIVE (${warranty.daysRemaining}d left)` : 'EXPIRED'}
            </Text>
          </View>
          <Text style={styles.sellerInfo}>
            Seller: {seller?.name || 'Unknown'} • Available Channels:{' '}
            {contacts.length > 0 ? contacts.map((c) => c.platform).join(', ') : 'None'}
          </Text>
        </View>

        {/* GENERATED CLAIM STRING */}
        <View style={styles.card}>
          <View style={styles.claimHeaderRow}>
            <Text style={styles.sectionHeader}>PRE-FILLED CLAIM MESSAGE</Text>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              {copied ? (
                <Check size={13} color={styles.successColor.color} strokeWidth={2.5} />
              ) : (
                <Copy size={13} color={styles.accentColor.color} strokeWidth={2.2} />
              )}
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                {copied ? 'Copied' : 'Copy Text'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{claimMessage}</Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {seller && contacts.length > 0 && (
            <View style={styles.channelsList}>
              {contacts.map((contact, idx) => (
                <Pressable
                  key={contact.id || idx}
                  onPress={() => openSellerContact(contact.platform, contact.value, claimMessage)}
                  style={({ pressed }) => [
                    styles.dispatchBtn,
                    pressed && styles.dispatchBtnPressed,
                  ]}
                >
                  <View style={styles.dispatchContent}>
                    <PlatformIcon platform={contact.platform} size={18} color="#FFFFFF" />
                    <Text style={styles.dispatchText}>
                      Dispatch via {contact.platform}
                      {contact.label ? ` (${contact.label})` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={handleMarkInResolution}
            style={({ pressed }) => [styles.resolutionBtn, pressed && styles.resolutionBtnPressed]}
          >
            <Text style={styles.resolutionText}>Mark as "In Resolution"</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    notFoundContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notFoundText: {
      color: colors.text,
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
    closeText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '700',
    },
    headerTitle: {
      color: colors.danger,
      fontSize: 16,
      fontWeight: '800',
    },
    headerPlaceholder: {
      width: 40,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    alertCard: {
      backgroundColor: theme === 'dark' ? '#261014' : '#FEF2F2',
      borderRadius: 22,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.danger,
      alignItems: 'center',
    },
    alertTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 10,
    },
    alertSubtitle: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 1px 4px rgba(0, 0, 0, 0.2)' : '0px 1px 4px rgba(0, 0, 0, 0.04)',
      elevation: 2,
    },
    sectionHeader: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    warrantyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    gameTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    warrantyStatus: {
      fontWeight: '800',
      fontSize: 13,
    },
    warrantyActive: {
      color: colors.success,
    },
    warrantyExpired: {
      color: colors.danger,
    },
    sellerInfo: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    claimHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    successColor: {
      color: colors.success,
    },
    accentColor: {
      color: colors.accent,
    },
    copyBtnText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    copyBtnTextSuccess: {
      color: colors.success,
    },
    codeBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    actionsContainer: {
      marginTop: 20,
      gap: 10,
    },
    channelsList: {
      gap: 8,
    },
    dispatchBtn: {
      backgroundColor: colors.danger,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dispatchBtnPressed: {
      backgroundColor: '#DC2626',
    },
    dispatchContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dispatchText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    resolutionBtn: {
      backgroundColor: colors.surfaceSubtle,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    resolutionBtnPressed: {
      backgroundColor: colors.surfaceElevated,
    },
    resolutionText: {
      color: colors.accent,
      fontWeight: '800',
      fontSize: 14,
    },
  });
