import { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { VaultText as Text } from '../../components/common/VaultText';
import { useRouter } from 'expo-router';
import * as Haptics from '@/utils/haptics';
import { ShieldCheck, Users } from 'lucide-react-native';
import { Seller, Client, ClientAllocation, Game } from '../../types/vault';
import { ModernHeader, QuickAddWidget } from '../../components/common';
import { SellerCard, SellerFormModal } from '../../components/sellers';
import { ClientCard, ClientFormModal, WhatsAppDispatchModal } from '../../components/seller';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { useVaultSync } from '../../context/VaultSyncContext';
import { useCustomAlert } from '../../context/AlertContext';
import { generateUUID } from '../../utils/uuid';

export default function SellersScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const { isSeller } = usePersona();
  const { showAlert } = useCustomAlert();
  const {
    sellers,
    games,
    clients,
    allocations,
    addSeller,
    updateSeller,
    addClient,
    updateClient,
    deleteClient,
    refreshData,
  } = useVaultSync();

  const [refreshing, setRefreshing] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Gamer Mode Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  // Seller Mode Client Modal State
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // WhatsApp Dispatch State
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchAllocation, setDispatchAllocation] = useState<ClientAllocation | null>(null);

  const gamesMap = useMemo(() => {
    const map: Record<string, Game> = {};
    games.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [games]);

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
    if (isSeller) {
      setEditingClient(null);
      setClientModalVisible(true);
    } else {
      setEditingSeller(null);
      setModalVisible(true);
    }
  };

  const handleOpenEdit = (seller: Seller) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingSeller(seller);
    setModalVisible(true);
  };

  const handleOpenEditClient = (client: Client) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingClient(client);
    setClientModalVisible(true);
  };

  const handleDeleteClient = (client: Client) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const clientAllocations = allocations.filter((a) => a.client_id === client.id);

    showAlert({
      title: isRTL ? 'حذف العميل' : 'Delete Client',
      message: isRTL
        ? `هل أنت متأكد من حذف العميل "${client.name}"؟ سيتم الاحتفاظ بالسلوتات المسجلة له.`
        : `Are you sure you want to delete "${client.name}" from your client CRM?`,
      type: 'danger',
      buttons: [
        {
          text: t('btnDelete'),
          style: 'destructive',
          onPress: async () => {
            await deleteClient(client.id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          },
        },
        { text: t('btnCancel'), style: 'cancel' },
      ],
    });
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
        id: generateUUID(),
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

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingClient) {
      await updateClient(editingClient.id, clientData);
    } else {
      const newClient: Client = {
        id: generateUUID(),
        user_id: 'user-demo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...clientData,
      };
      await addClient(newClient);
    }
    setClientModalVisible(false);
  };

  const handleDispatchReceipt = (allocation: ClientAllocation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setDispatchAllocation(allocation);
    setDispatchModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        title={isSeller ? t('clientsTitle') : t('headerSellersTitle')}
        subtitle={isSeller ? t('clientsSubtitle') : t('headerSellersSubtitle')}
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
        {/* STICKY QUICK REGISTER TOP WIDGET */}
        <View style={[styles.stickyContainer, isSticky && styles.stickyContainerActive]}>
          <QuickAddWidget
            actions={[
              {
                label: isSeller ? t('quickAddClient') : t('quickRegisterNewSeller'),
                sublabel: isSeller
                  ? (isRTL ? 'تسجيل مشترٍ جديد ورقم الواتساب' : 'Add new customer & WhatsApp details')
                  : t('quickRegisterNewSellerSub'),
                icon: 'seller',
                onPress: handleOpenAdd,
              },
            ]}
          />
        </View>

        {/* LIST SECTION */}
        <View style={styles.listContainer}>
          {isSeller ? (
            // SELLER MODE: CLIENT DIRECTORY
            clients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users
                  size={48}
                  color={styles.emptyIcon.color}
                  strokeWidth={1.5}
                  style={styles.emptyIconStyle}
                />
                <Text style={styles.emptyTitle}>{t('clientNotFound')}</Text>
                <Text style={styles.emptySubtitle}>{t('noClientsSub')}</Text>
              </View>
            ) : (
              clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  allocations={allocations}
                  gamesMap={gamesMap}
                  onPress={() => router.push(`/client/${client.id}`)}
                  onEdit={() => handleOpenEditClient(client)}
                  onDelete={() => handleDeleteClient(client)}
                  onDispatchWhatsApp={handleDispatchReceipt}
                />
              ))
            )
          ) : (
            // GAMER MODE: DIGITAL SELLERS DIRECTORY
            sellers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ShieldCheck
                  size={48}
                  color={styles.emptyIcon.color}
                  strokeWidth={1.5}
                  style={styles.emptyIconStyle}
                />
                <Text style={styles.emptyTitle}>{t('noSellersFound')}</Text>
                <Text style={styles.emptySubtitle}>{t('noSellersFoundSub')}</Text>
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
            )
          )}
        </View>
      </ScrollView>

      {/* GAMER: SELLER FORM MODAL */}
      <SellerFormModal
        visible={modalVisible}
        initialSeller={editingSeller}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveSeller}
      />

      {/* SELLER: CLIENT FORM MODAL */}
      <ClientFormModal
        visible={clientModalVisible}
        initialClient={editingClient}
        onClose={() => setClientModalVisible(false)}
        onSave={handleSaveClient}
      />

      {/* 1-TAP WHATSAPP DISPATCH MODAL */}
      {dispatchAllocation && gamesMap[dispatchAllocation.game_id] && (
        <WhatsAppDispatchModal
          visible={dispatchModalVisible}
          game={gamesMap[dispatchAllocation.game_id]}
          allocation={dispatchAllocation}
          client={clients.find((c) => c.id === dispatchAllocation.client_id)}
          onClose={() => {
            setDispatchModalVisible(false);
            setDispatchAllocation(null);
          }}
        />
      )}
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
