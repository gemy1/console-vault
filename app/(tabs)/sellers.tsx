import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { VaultText as Text } from '../../components/common/VaultText';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ShieldCheck } from 'lucide-react-native';
import { OfflineVault } from '../../services/storage';
import { Seller, Game } from '../../types/vault';
import { ModernHeader, QuickAddWidget } from '../../components/common';
import { SellerCard, SellerFormModal } from '../../components/sellers';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

import { useVaultSync } from '../../context/VaultSyncContext';

export default function SellersScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();
  const { sellers, games, addSeller, updateSeller, refreshData } = useVaultSync();

  const [refreshing, setRefreshing] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    refreshData();
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    if (scrollY > 12 && !isSticky) {
      setIsSticky(true);
    } else if (scrollY <= 12 && isSticky) {
      setIsSticky(false);
    }
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
      updateSeller(editingSeller.id, sellerData);
    } else {
      const newSeller: Seller = {
        id: `seller-${Date.now()}`,
        user_id: 'user-demo',
        ...sellerData,
        created_at: new Date().toISOString(),
      };
      addSeller(newSeller);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title={t('headerSellersTitle')}
        subtitle={t('headerSellersSubtitle')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.accentIcon.color}
          />
        }
      >
        {/* STICKY QUICK REGISTER SELLER TOP WIDGET */}
        <View style={[styles.stickyContainer, isSticky && styles.stickyContainerActive]}>
          <QuickAddWidget
            actions={[
              {
                label: t('quickRegisterNewSeller'),
                sublabel: t('quickRegisterNewSellerSub'),
                icon: 'seller',
                onPress: handleOpenAdd,
              },
            ]}
          />
        </View>

        {/* SELLERS LIST */}
        <View style={styles.listContainer}>
          {sellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ShieldCheck
                size={48}
                color={styles.emptyIcon.color}
                strokeWidth={1.5}
                style={styles.emptyIconStyle}
              />
              <Text style={styles.emptyTitle}>{t('noSellersFound')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('noSellersFoundSub')}
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
        </View>
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

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 96,
    },
    stickyContainer: {
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 2,
      zIndex: 10,
    },
    stickyContainerActive: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 4px 12px rgba(0, 0, 0, 0.4)' : '0px 4px 12px rgba(0, 0, 0, 0.06)',
      elevation: 4,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    accentIcon: {
      color: colors.accent,
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
