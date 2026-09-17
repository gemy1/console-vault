import { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { VaultText as Text } from '../common/VaultText';
import * as Haptics from '@/utils/haptics';
import { useSwipeDownModal } from '../../hooks/useSwipeDownModal';
import {
  X,
  Plus,
  Check,
  User,
  Phone,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
} from 'lucide-react-native';
import { Game, Client, ClientAllocation, SlotType } from '../../types/vault';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode, useVaultTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePersona } from '../../context/PersonaContext';
import { useVaultSync } from '../../context/VaultSyncContext';
import { useCustomAlert } from '../../context/AlertContext';
import { generateUUID } from '../../utils/uuid';
import { getGamePotentialSlots, getGameAvailableSlots, getGameDisplaySlots } from '../../utils/slots';

const WARRANTY_PRESETS = ['3', '6', '12', '24', '999'];

interface SlotAllocationModalProps {
  visible: boolean;
  game: Game;
  preselectedSlot?: SlotType;
  existingAllocation?: ClientAllocation | null;
  onClose: () => void;
  onAllocated: (allocation: ClientAllocation, client?: Client) => void;
}

export function SlotAllocationModal({
  visible,
  game,
  preselectedSlot,
  existingAllocation,
  onClose,
  onAllocated,
}: SlotAllocationModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useVaultTheme();
  const { t, isRTL } = useLanguage();
  const { currency } = usePersona();
  const { clients, allocations, addClient, addAllocation, updateAllocation, deleteAllocation } = useVaultSync();
  const { showAlert } = useCustomAlert();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const [selectedSlot, setSelectedSlot] = useState<SlotType>('Primary_PS5');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [salePrice, setSalePrice] = useState('40.00');
  const [warrantyMonths, setWarrantyMonths] = useState('6');
  const [notes, setNotes] = useState('');

  // Quick Client Creation State
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Compute display slots — if any slot sold, Full disappears; if Full sold, others disappear
  const allPlatformSlots = useMemo<SlotType[]>(() => {
    return getGameDisplaySlots(game, allocations, existingAllocation?.id);
  }, [game, allocations, existingAllocation]);

  // Split slots into pairs of 2 so React Native mobile avoids flexWrap + flexDirection: row-reverse layout bugs
  const slotRows = useMemo(() => {
    const rows: SlotType[][] = [];
    for (let i = 0; i < allPlatformSlots.length; i += 2) {
      rows.push(allPlatformSlots.slice(i, i + 2));
    }
    return rows;
  }, [allPlatformSlots]);

  // Compute available slots (filtering already taken)
  const availableSlots = useMemo(() => {
    return getGameAvailableSlots(game, allocations, existingAllocation?.id);
  }, [game, allocations, existingAllocation]);

  useEffect(() => {
    if (visible) {
      if (existingAllocation) {
        setSelectedSlot(existingAllocation.slot_type);
        setSelectedClientId(existingAllocation.client_id);
        setSalePrice(String(existingAllocation.sale_price || '0.00'));
        setWarrantyMonths(String(existingAllocation.warranty_months || 6));
        setNotes(existingAllocation.notes || '');
        setIsCreatingClient(false);
        setNewClientName('');
        setNewClientPhone('');
      } else {
        const initial = preselectedSlot && availableSlots.includes(preselectedSlot)
          ? preselectedSlot
          : availableSlots[0] || 'Primary_PS5';
        setSelectedSlot(initial);
        setSalePrice(initial.startsWith('Primary') ? '40.00' : initial === 'Full' ? '90.00' : '25.00');
        setWarrantyMonths('6');
        setNotes('');
        setSelectedClientId('');
        setNewClientName('');
        setNewClientPhone('');
        setIsCreatingClient(clients.length === 0);
      }
      setClientDropdownOpen(false);
      setClientSearch('');
    } else {
      // Clean up when modal closes so next game modal is completely fresh
      setNewClientName('');
      setNewClientPhone('');
      setSelectedClientId('');
      setIsCreatingClient(false);
      setClientDropdownOpen(false);
      setClientSearch('');
    }
  }, [visible, existingAllocation, preselectedSlot, game.id]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase().trim())
    );
  }, [clients, clientSearch]);

  const handleCreateClient = () => {
    if (!newClientName.trim()) {
      showAlert({
        title: t('alertRequiredField'),
        message: isRTL ? 'يرجى إدخال اسم العميل.' : 'Please enter client name.',
        type: 'warning',
      });
      return;
    }

    const created = addClient({
      id: generateUUID(),
      user_id: 'user-demo',
      name: newClientName.trim(),
      contact_platform: 'WhatsApp',
      contact_link: newClientPhone.trim(),
      notes: '',
      created_at: new Date().toISOString(),
    });

    setSelectedClientId(created.id);
    setIsCreatingClient(false);
    setNewClientName('');
    setNewClientPhone('');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleSubmit = () => {
    let finalClientId = selectedClientId;

    if (isCreatingClient) {
      if (!newClientName.trim()) {
        showAlert({
          title: t('alertRequiredField'),
          message: isRTL ? 'يرجى إدخال اسم العميل.' : 'Please enter client name.',
          type: 'warning',
        });
        return;
      }
      const created = addClient({
        id: generateUUID(),
        user_id: 'user-demo',
        name: newClientName.trim(),
        contact_platform: 'WhatsApp',
        contact_link: newClientPhone.trim(),
        notes: '',
        created_at: new Date().toISOString(),
      });
      finalClientId = created.id;
    }

    if (!finalClientId) {
      showAlert({
        title: t('alertRequiredField'),
        message: isRTL ? 'يرجى اختيار أو إضافة عميل.' : 'Please select or add a client.',
        type: 'warning',
      });
      return;
    }

    const priceNum = parseFloat(salePrice) || 0;
    const warrantyNum = parseInt(warrantyMonths, 10) || 6;

    if (existingAllocation) {
      const updated = updateAllocation(existingAllocation.id, {
        slot_type: selectedSlot,
        client_id: finalClientId,
        sale_price: priceNum,
        currency: currency || 'USD',
        warranty_months: warrantyNum,
        notes: notes.trim() || undefined,
      });
      if (updated) {
        onAllocated(updated, selectedClient);
      }
    } else {
      const created = addAllocation({
        id: generateUUID(),
        user_id: 'user-demo',
        game_id: game.id,
        client_id: finalClientId,
        slot_type: selectedSlot,
        sale_price: priceNum,
        currency: currency || 'USD',
        sale_date: new Date().toISOString().split('T')[0],
        warranty_months: warrantyNum,
        status: 'Active',
        notes: notes.trim() || undefined,
        created_at: new Date().toISOString(),
      });
      const allocatedClient = clients.find((c) => c.id === finalClientId);
      onAllocated(created, allocatedClient);
    }

    // Clear client fields so opening another game modal starts completely clean
    setNewClientName('');
    setNewClientPhone('');
    setSelectedClientId('');
    setIsCreatingClient(false);
    setClientSearch('');
    setClientDropdownOpen(false);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleReleaseSlot = () => {
    if (!existingAllocation) return;

    showAlert({
      title: t('confirmUnsellTitle'),
      message: t('confirmUnsellMessage'),
      type: 'danger',
      icon: Trash2,
      buttons: [
        {
          text: t('btnCancel'),
          style: 'cancel',
        },
        {
          text: t('btnUnsellSlot'),
          style: 'destructive',
          icon: Trash2,
          onPress: () => {
            deleteAllocation(existingAllocation.id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            closeWithSlide();
            showAlert({
              title: t('alertSuccessGameAdded'),
              message: t('alertSlotReleased'),
              type: 'success',
            });
          },
        },
      ],
    });
  };

  const formatSlotTitle = (slot: SlotType) => {
    switch (slot) {
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
    }
  };

  const { panY, panHandlers, closeWithSlide } = useSwipeDownModal({ visible, onClose });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeWithSlide}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithSlide} />

        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: panY }] }]}>
          <View {...panHandlers} style={styles.handleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* HEADER */}
          <View style={[styles.headerRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
            <View>
              <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
                {existingAllocation ? t('manageSlot') : t('allocateSlotTitle')}
              </Text>
              <Text style={[styles.headerSub, isRTL && styles.rtlText]}>
                {game.title}
              </Text>
            </View>

            <Pressable onPress={closeWithSlide} style={styles.closeBtn}>
              <X size={18} color={styles.closeIcon.color} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. SELECT SLOT TYPE */}
            <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('availableSlots')}</Text>
            <View style={styles.slotsContainer}>
              {slotRows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[styles.slotRow, isNativeRTL && { flexDirection: 'row-reverse' }]}
                >
                  {row.map((slot) => {
                    const isAvail = availableSlots.includes(slot) || (existingAllocation && existingAllocation.slot_type === slot);
                    const isSelected = selectedSlot === slot;

                    return (
                      <Pressable
                        key={slot}
                        disabled={!isAvail}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setSelectedSlot(slot);
                        }}
                        style={[
                          styles.slotBtn,
                          isSelected && styles.slotBtnSelected,
                          !isAvail && styles.slotBtnDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotBtnText,
                            isSelected && styles.slotBtnTextSelected,
                            !isAvail && styles.slotBtnTextDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {formatSlotTitle(slot)}
                        </Text>
                        {!isAvail && (
                          <View style={styles.slotTakenBadge}>
                            <Text style={styles.slotTakenLabel}>{t('slotSold')}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* 2. CLIENT SELECTION OR CREATION */}
            <View style={[styles.clientSectionHeader, isNativeRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.fieldLabel, styles.fieldLabelInHeader, isRTL && styles.rtlText]}>
                {isCreatingClient ? t('addNewClient') : t('selectClient')}
              </Text>
              <Pressable
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setIsCreatingClient(!isCreatingClient);
                }}
                style={styles.toggleClientModeBtn}
              >
                <Text style={styles.toggleClientModeText}>
                  {isCreatingClient ? t('selectClient') : t('addNewClient')}
                </Text>
              </Pressable>
            </View>

            {isCreatingClient ? (
              <View style={styles.newClientBox}>
                <View style={[styles.inputRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <User size={16} color={styles.inputIcon.color} />
                  <TextInput
                    style={[styles.textInput, isRTL && styles.rtlTextInput]}
                    value={newClientName}
                    onChangeText={setNewClientName}
                    placeholder={t('clientName')}
                    placeholderTextColor={styles.placeholder.color}
                  />
                </View>
                <View style={[styles.inputRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <Phone size={16} color={styles.inputIcon.color} />
                  <TextInput
                    style={[styles.textInput, isRTL && styles.rtlTextInput]}
                    value={newClientPhone}
                    onChangeText={setNewClientPhone}
                    placeholder={t('clientContact')}
                    placeholderTextColor={styles.placeholder.color}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.clientDropdownContainer}>
                <Pressable
                  onPress={() => setClientDropdownOpen(!clientDropdownOpen)}
                  style={[styles.clientSelectedBtn, isNativeRTL && { flexDirection: 'row-reverse' }]}
                >
                  <View style={styles.clientSelectedLeft}>
                    <User size={16} color="#00D2FF" />
                    <Text style={styles.clientSelectedName}>
                      {selectedClient ? selectedClient.name : t('selectClient')}
                    </Text>
                  </View>
                  {clientDropdownOpen ? (
                    <ChevronUp size={16} color={styles.inputIcon.color} />
                  ) : (
                    <ChevronDown size={16} color={styles.inputIcon.color} />
                  )}
                </Pressable>

                {clientDropdownOpen && (
                  <View style={styles.clientDropdownList}>
                    <View style={[styles.searchRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                      <Search size={14} color={styles.inputIcon.color} />
                      <TextInput
                        style={[styles.searchInput, isRTL && styles.rtlTextInput]}
                        value={clientSearch}
                        onChangeText={setClientSearch}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor={styles.placeholder.color}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                      {filteredClients.map((cl) => {
                        const isChosen = cl.id === selectedClientId;
                        return (
                          <Pressable
                            key={cl.id}
                            onPress={() => {
                              setSelectedClientId(cl.id);
                              setClientDropdownOpen(false);
                            }}
                            style={[
                              styles.clientListItem,
                              isChosen && styles.clientListItemChosen,
                              isNativeRTL && { flexDirection: 'row-reverse' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.clientListItemText,
                                isChosen && styles.clientListItemTextChosen,
                              ]}
                            >
                              {cl.name}
                            </Text>
                            {isChosen && <Check size={14} color="#00D2FF" />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* 3. SALE PRICE & WARRANTY */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                  {t('salePrice')} ({currency})
                </Text>
                <View style={[styles.inputRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  <Coins size={16} color={styles.inputIcon.color} />
                  <TextInput
                    style={[styles.textInput, isRTL && styles.rtlTextInput]}
                    value={salePrice}
                    onChangeText={setSalePrice}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={styles.placeholder.color}
                  />
                </View>
              </View>

              <View style={{ flex: 1.35, marginLeft: 10 }}>
                <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                  {t('fieldWarrantyDuration')}
                </Text>
                <View style={[styles.presetsMiniRow, isNativeRTL && { flexDirection: 'row-reverse' }]}>
                  {WARRANTY_PRESETS.map((p) => {
                    const isPActive = warrantyMonths === p;
                    const label = p === '999' ? (isRTL ? 'دائم' : 'Life') : `${p}m`;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setWarrantyMonths(p)}
                        style={[
                          styles.presetMiniBtn,
                          isPActive && styles.presetMiniBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetMiniText,
                            isPActive && styles.presetMiniTextActive,
                            p === '999' && styles.presetMiniTextLife,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 4. OPTIONAL NOTES */}
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {t('fieldNotes')}
              </Text>
              <TextInput
                style={[styles.notesInput, isRTL && styles.rtlTextInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('fieldNotesPlaceholder')}
                placeholderTextColor={styles.placeholder.color}
                multiline
              />
            </View>

            {/* SUBMIT BUTTON */}
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.submitBtnText}>
                {existingAllocation ? t('btnSave') : t('btnSellSlot')}
              </Text>
            </Pressable>

            {/* RELEASE / UNSELL BUTTON (When managing an existing allocation) */}
            {existingAllocation && (
              <Pressable
                onPress={handleReleaseSlot}
                style={({ pressed }) => [
                  styles.releaseBtn,
                  isNativeRTL && { flexDirection: 'row-reverse' },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                <Text style={styles.releaseBtnText}>{t('btnUnsellSlot')}</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    keyboardContainer: {
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
      maxHeight: '92%',
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
      marginBottom: 14,
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
    rtlTextInput: {
      textAlign: 'right',
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    fieldLabelInHeader: {
      marginBottom: 0,
    },
    slotsContainer: {
      marginBottom: 16,
      gap: 8,
    },
    slotRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'stretch',
    },
    slotBtn: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
    },
    slotBtnSelected: {
      borderColor: theme === 'dark' ? '#00D2FF' : '#0070D1',
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.12)' : 'rgba(0, 112, 209, 0.08)',
    },
    slotBtnDisabled: {
      opacity: 0.45,
      backgroundColor: colors.surfaceSubtle,
    },
    slotBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    slotBtnTextSelected: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontWeight: '800',
    },
    slotBtnTextDisabled: {
      color: colors.textMuted,
    },
    slotTakenBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    slotTakenLabel: {
      color: colors.danger,
      fontSize: 8.5,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    clientSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      marginTop: 4,
    },
    toggleClientModeBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    toggleClientModeText: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontSize: 11,
      fontWeight: '700',
    },
    newClientBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
      marginBottom: 16,
    },
    clientDropdownContainer: {
      marginBottom: 16,
    },
    clientSelectedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    clientSelectedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    clientSelectedName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    clientDropdownList: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 6,
      padding: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 6,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      padding: 0,
    },
    clientListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    clientListItemChosen: {
      backgroundColor: 'rgba(0, 210, 255, 0.1)',
    },
    clientListItemText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    clientListItemTextChosen: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontWeight: '800',
    },
    twoColumnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    inputIcon: {
      color: colors.textMuted,
    },
    textInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      padding: 0,
    },
    placeholder: {
      color: colors.textMuted,
    },
    presetsMiniRow: {
      flexDirection: 'row',
      gap: 4,
      height: 44,
      alignItems: 'center',
    },
    presetMiniBtn: {
      flex: 1,
      height: 42,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    presetMiniBtnActive: {
      borderColor: theme === 'dark' ? '#00D2FF' : '#0070D1',
      backgroundColor: theme === 'dark' ? 'rgba(0, 210, 255, 0.15)' : 'rgba(0, 112, 209, 0.12)',
    },
    presetMiniText: {
      color: colors.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    presetMiniTextActive: {
      color: theme === 'dark' ? '#00D2FF' : '#0070D1',
      fontWeight: '800',
    },
    presetMiniTextLife: {
      fontSize: 9.5,
      fontWeight: '800',
    },
    notesInput: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 12,
      padding: 12,
      minHeight: 70,
      textAlignVertical: 'top',
    },
    submitBtn: {
      backgroundColor: theme === 'dark' ? '#0070D1' : '#0058A8',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
      boxShadow: '0px 4px 16px rgba(0, 112, 209, 0.35)',
      elevation: 4,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    releaseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      paddingVertical: 13,
      marginTop: 10,
    },
    releaseBtnText: {
      color: colors.danger,
      fontSize: 13.5,
      fontWeight: '800',
    },
  });
