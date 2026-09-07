import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ShieldCheck, Plus, ChevronRight } from 'lucide-react-native';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { ModernHeader } from '../../components/ModernHeader';
import { SellerCard } from '../../components/SellerCard';
import { SellerFormModal } from '../../components/SellerFormModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export default function SellersScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const loadData = () => {
    setSellers(OfflineVault.getSellers());
    setGames(OfflineVault.getGames());
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const getSellerGamesCount = (sellerId: string) => {
    return games.filter((g) => g.seller_id === sellerId).length;
  };

  const handleOpenAdd = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingSeller(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (seller: Seller) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingSeller(seller);
    setModalVisible(true);
  };

  const handleSaveSeller = (sellerData: {
    name: string;
    contact_platform: any;
    contact_link: string;
    contact_methods: any[];
    reputation_score: number;
    notes?: string;
  }) => {
    if (editingSeller) {
      OfflineVault.updateSeller(editingSeller.id, sellerData);
    } else {
      const newSeller: Seller = {
        id: `seller-${Date.now()}`,
        user_id: 'user-demo',
        ...sellerData,
        created_at: new Date().toISOString(),
      };
      OfflineVault.addSeller(newSeller);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    loadData();
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Digital Vendors"
        subtitle="Reputation & Multi-Contacts"
        showAddButton={true}
        onAddPress={handleOpenAdd}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.accentIcon.color}
          />
        }
      >
        {/* ADD VENDOR QUICK BANNER */}
        <Pressable
          onPress={handleOpenAdd}
          style={({ pressed }) => [styles.addBanner, pressed && styles.addBannerPressed]}
        >
          <View style={styles.bannerLeftRow}>
            <View style={styles.bannerIconCircle}>
              <Plus size={20} color={styles.accentIcon.color} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.bannerTitle}>Register New Digital Vendor</Text>
              <Text style={styles.bannerSubtitle}>
                Add WhatsApp, Facebook, Telegram & custom notes
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={styles.accentIcon.color} strokeWidth={2.2} />
        </Pressable>

        {/* VENDORS LIST */}
        {sellers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShieldCheck size={48} color={styles.emptyIcon.color} strokeWidth={1.5} style={styles.emptyIconStyle} />
            <Text style={styles.emptyTitle}>No Digital Vendors Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap above to register your first seller with multiple contact methods and notes.
            </Text>
          </View>
        ) : (
          sellers.map((seller) => (
            <SellerCard
              key={seller.id}
              seller={seller}
              gamesCount={getSellerGamesCount(seller.id)}
              onPress={() => router.push(`/seller/${seller.id}`)}
              onEdit={() => handleOpenEdit(seller)}
            />
          ))
        )}
      </ScrollView>

      {/* REUSABLE SELLER FORM MODAL */}
      <SellerFormModal
        visible={modalVisible}
        initialSeller={editingSeller}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveSeller}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 60,
    },
    accentIcon: {
      color: colors.accent,
    },
    addBanner: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderStyle: 'dashed',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    addBannerPressed: {
      backgroundColor: colors.surfaceElevated,
    },
    bannerLeftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bannerIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    bannerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
    },
    emptyIcon: {
      color: colors.textMuted,
    },
    emptyIconStyle: {
      marginBottom: 12,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
      textAlign: 'center',
    },
  });
