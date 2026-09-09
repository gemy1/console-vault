import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
} from "react-native";
import { VaultText as Text } from "../../components/common/VaultText";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from '@/utils/haptics';
import { OfflineVault } from "../../services/storage";
import { Game, Seller, GameStatus } from "../../types/vault";
import { calculateWarranty } from "../../utils/padlock";
import { useBiometricGuard } from "../../hooks/useBiometricGuard";
import { MenuToggleButton } from "../../components/common";
import {
  PulsingPadlockBadge,
  ReplaceCredentialsModal,
  GameFormModal,
} from "../../components/games";
import { useVaultSync } from "../../context/VaultSyncContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useVaultTheme, ThemeColors, ThemeMode } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useCustomAlert } from "../../context/AlertContext";
import {
  ChevronLeft,
  Heart,
  Gamepad2,
  ShieldCheck,
  Star,
  ChevronRight,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react-native";

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useVaultTheme();
  const styles = useThemedStyles(createStyles);
  const { t, isRTL } = useLanguage();
  const isNativeRTL = Platform.OS !== 'web' && isRTL;

  const [game, setGame] = useState<Game | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const vaultSync = useVaultSync();
  const { showAlert } = useCustomAlert();

  const { isUnlocked, requestUnlock, lock } = useBiometricGuard(60);

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
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>{t('gameNotFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>{t('btnGoBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const isLocked = game.status === "Locked";

  const copyToClipboard = async (text: string, fieldKey: string) => {
    await Clipboard.setStringAsync(text);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleGameStatus = (newStatus: GameStatus) => {
    const updated = OfflineVault.updateGame(game.id, { status: newStatus });
    if (updated) {
      setGame(updated);
      try {
        Haptics.notificationAsync(
          newStatus === "Locked"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
    }
  };

  const handleSaveEditedGame = (gameData: any) => {
    if (!game) return;
    const updated = vaultSync
      ? vaultSync.updateGame(game.id, gameData)
      : OfflineVault.updateGame(game.id, gameData);

    if (updated) {
      setGame(updated);
      if (updated.seller_id) {
        const sellers = OfflineVault.getSellers();
        const foundSeller = sellers.find((s) => s.id === updated.seller_id);
        setSeller(foundSeller || null);
      } else {
        setSeller(null);
      }
      setEditModalVisible(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      showAlert({
        title: isRTL ? 'تم التعديل بنجاح' : 'Game Updated',
        message: isRTL ? 'تم حفظ تعديلات اللعبة بنجاح في خزينتك.' : 'Game details have been saved successfully to your vault.',
        type: 'success',
      });
    }
  };

  const handleCredentialReplacement = (
    newEmailVal: string,
    newPasswordVal: string,
  ) => {
    if (!game) return;
    const updated = OfflineVault.updateGame(game.id, {
      psn_email: newEmailVal,
      psn_password: newPasswordVal,
      status: "Active",
    });

    if (updated) {
      setGame(updated);
      showAlert({
        title: t('alertCredentialsUpdatedTitle'),
        message: t('alertCredentialsUpdatedDesc'),
        type: 'success',
        buttons: [{ text: isRTL ? 'حسناً' : 'OK', style: 'default' }],
      });
    }
  };

  const handleDeleteGame = () => {
    if (!game) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    showAlert({
      title: t('confirmDeleteGameTitle'),
      message: t('confirmDeleteGameDesc', { title: game.title }),
      type: 'danger',
      buttons: [
        {
          text: t('btnDelete'),
          style: 'destructive',
          onPress: () => {
            if (vaultSync) {
              vaultSync.deleteGame(game.id);
            } else {
              OfflineVault.deleteGame(game.id);
            }
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            router.replace('/(tabs)/vault');
          },
        },
        { text: t('btnCancel'), style: 'cancel' },
      ],
    });
  };

  const androidStatusBar =
    Platform.OS === "android" ? RNStatusBar.currentHeight || 36 : 0;
  const safeTop = Math.max(
    insets.top,
    Platform.OS === "android" ? androidStatusBar : 48,
  );
  const headerPaddingTop = safeTop + 12;

  return (
    <View style={styles.container}>
      {/* HERO COVER WITH FLOATING CIRCULAR HEADER BUTTONS */}
      <View style={styles.heroWrapper}>
        {game.cover_image_url ? (
          <Image
            source={{ uri: game.cover_image_url }}
            style={styles.heroCoverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroCoverPlaceholder}>
            <Gamepad2
              size={64}
              color={styles.placeholderIcon.color}
              strokeWidth={1.5}
            />
          </View>
        )}

        {/* CONTRAST VIGNETTE */}
        <View style={styles.vignette} />

        {/* FLOATING HEADER DIRECTLY BELOW NOTIFICATION BAR */}
        <View style={[styles.floatingHeader, { top: headerPaddingTop }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.headerCircleBtn,
              pressed && styles.headerCircleBtnPressed,
            ]}
          >
            {isRTL ? (
              <ChevronRight
                size={24}
                color={styles.headerIconColor.color}
                strokeWidth={2.4}
              />
            ) : (
              <ChevronLeft
                size={24}
                color={styles.headerIconColor.color}
                strokeWidth={2.4}
              />
            )}
          </Pressable>

          <View style={styles.headerRightActions}>
            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsFavorite(!isFavorite);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Heart
                size={20}
                color={isFavorite ? "#EF4444" : styles.headerIconColor.color}
                fill={isFavorite ? "#EF4444" : "transparent"}
                strokeWidth={2.2}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setEditModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Pencil
                size={18}
                color={styles.headerIconColor.color}
                strokeWidth={2.2}
              />
            </Pressable>

            <Pressable
              onPress={handleDeleteGame}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                styles.headerDeleteBtn,
                pressed && styles.headerCircleBtnPressed,
              ]}
            >
              <Trash2
                size={18}
                color="#EF4444"
                strokeWidth={2.2}
              />
            </Pressable>

            <MenuToggleButton size={48} />
          </View>
        </View>
      </View>

      {/* OVERLAY SHEET */}
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetContent}>
          {/* SHEET HANDLE BAR */}
          <View style={styles.sheetHandle} />

          {/* TITLE & REPUTATION / RATING ROW */}
          <View style={styles.titleRow}>
            <Text style={[styles.gameTitle, isRTL && styles.rtlText]}>{game.title}</Text>

            <View style={styles.ratingBadge}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {seller?.reputation_score
                  ? seller.reputation_score.toFixed(1)
                  : "5.0"}
              </Text>
            </View>
          </View>

          {/* BADGES & METADATA ROW */}
          <View style={styles.badgesRow}>
            <View style={styles.accountTypeRow}>
              <View
                style={[
                  styles.statusIndicatorDot,
                  isLocked ? styles.dotDanger : styles.dotSuccess,
                ]}
              />
              <Text style={styles.accountTypeText}>
                PS5 {game.account_type === 'Primary'
                  ? t('accountTypePrimary')
                  : game.account_type === 'Full'
                  ? t('accountTypeFull')
                  : t('accountTypeSecondary')}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isLocked
                  ? styles.statusBadgeLocked
                  : game.status === "Active"
                    ? styles.statusBadgeActive
                    : styles.statusBadgeWarning,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isLocked
                    ? styles.statusTextDanger
                    : game.status === "Active"
                      ? styles.statusTextSuccess
                      : styles.statusTextWarning,
                ]}
              >
                {game.status === 'Active' ? t('statusActive') : game.status === 'Locked' ? t('statusLocked') : game.status}
              </Text>
            </View>

            <Text style={styles.purchaseDateText}>
              {t('purchasedOn', { date: game.purchase_date })}
            </Text>
          </View>

          {/* CLICKABLE SELLER CARD */}
          {seller && (
            <Pressable
              onPress={() => router.push(`/seller/${seller.id}`)}
              style={({ pressed }) => [
                styles.sellerCard,
                pressed && styles.sellerCardPressed,
              ]}
            >
              <View style={styles.sellerCardLeft}>
                <View style={styles.sellerAvatar}>
                  <ShieldCheck
                    size={20}
                    color={styles.accentIcon.color}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text style={[styles.sellerCardName, isRTL && styles.rtlText]}>
                    {t('sellerCardPrefix')} {seller.name}
                  </Text>
                  <View style={styles.sellerSubtextRow}>
                    <Text style={styles.sellerSubtext}>
                      {t('sellerCardSubtext')}
                    </Text>
                    {isRTL ? (
                      <ChevronLeft
                        size={12}
                        color={styles.accentIcon.color}
                        strokeWidth={2.4}
                      />
                    ) : (
                      <ChevronRight
                        size={12}
                        color={styles.accentIcon.color}
                        strokeWidth={2.4}
                      />
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.sellerRatingPill}>
                <Star size={11} color="#FFD700" fill="#FFD700" />
                <Text style={styles.sellerRatingText}>
                  {seller.reputation_score.toFixed(1)}
                </Text>
              </View>
            </Pressable>
          )}

          {/* PADLOCK BANNER */}
          {isLocked && (
            <View style={styles.padlockBanner}>
              <View style={styles.padlockHeaderRow}>
                <PulsingPadlockBadge size="sm" showLabel={false} />
                <Text style={[styles.padlockTitle, isRTL && styles.rtlText]}>{t('licenseRevokedTitle')}</Text>
              </View>

              <Text style={[styles.padlockDescription, isRTL && styles.rtlText]}>
                {warranty.isWarrantyActive
                  ? t('warrantyActiveNotice', { days: warranty.daysRemaining, seller: seller?.name || t('sellerCardPrefix') })
                  : t('warrantyExpiredNotice', { date: warranty.expiryDate })}
              </Text>

              {seller && (
                <Pressable
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    router.push(`/game/padlock?id=${game.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.padlockDispatchBtn,
                    pressed && styles.padlockDispatchBtnPressed,
                  ]}
                >
                  <Text style={styles.padlockDispatchText}>
                    {t('dispatchClaimBtn')}
                  </Text>
                  {isRTL ? (
                    <ChevronLeft size={15} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </Pressable>
              )}
            </View>
          )}

          {/* WARRANTY COVERAGE */}
          <View style={styles.warrantyCard}>
            <Text style={[styles.sectionHeader, isRTL && styles.rtlText]}>{t('warrantyCoverageTitle')}</Text>

            <View style={styles.warrantyRow}>
              <Text
                style={[
                  styles.warrantyDaysText,
                  isRTL && styles.rtlText,
                  warranty.isWarrantyActive
                    ? styles.statusTextSuccess
                    : styles.statusTextDanger,
                ]}
              >
                {warranty.isWarrantyActive
                  ? t('daysLeft', { days: warranty.daysRemaining })
                  : t('warrantyExpired')}
              </Text>
              <Text style={[styles.warrantyMonthsTotal, isRTL && styles.rtlText]}>
                {t('monthsTotal', { months: game.warranty_months })}
              </Text>
            </View>

            <Text style={[styles.warrantyExpiresText, isRTL && styles.rtlText]}>
              {t('expiresOn', { date: warranty.expiryDate })}
            </Text>
          </View>

          {/* SENSITIVE CREDENTIALS (BIOMETRIC SHIELD) */}
          <View
            style={[
              styles.credentialsCard,
              isUnlocked && styles.credentialsCardUnlocked,
            ]}
          >
            <View style={styles.credentialsHeader}>
              <Text style={[styles.credentialsTitle, isRTL && styles.rtlText]}>
                {t('credentialSectionTitle')}
              </Text>
              {isUnlocked && (
                <Pressable onPress={lock}>
                  <Text style={styles.lockText}>{t('hideAndLock')}</Text>
                </Pressable>
              )}
            </View>

            {!isUnlocked ? (
              /* LOCKED VIEW */
              <View style={styles.biometricPromptBox}>
                <Lock
                  size={36}
                  color={styles.accentIcon.color}
                  strokeWidth={2}
                  style={styles.lockIconMargin}
                />
                <Text style={[styles.credentialsProtectedTitle, isRTL && styles.rtlText]}>
                  {t('credentialsProtectedTitle')}
                </Text>
                <Text style={[styles.credentialsProtectedSubtitle, isRTL && styles.rtlText]}>
                  {t('credentialsProtectedSubtitle')}
                </Text>

                <Pressable
                  onPress={() =>
                    requestUnlock({
                      promptMessage: t('biometricPromptMessage'),
                      fallbackLabel: t('biometricFallbackLabel'),
                      cancelLabel: t('biometricCancelLabel'),
                    })
                  }
                  style={({ pressed }) => [
                    styles.unlockBtn,
                    pressed && styles.unlockBtnPressed,
                  ]}
                >
                  <Text style={styles.unlockBtnText}>
                    {t('unlockBiometricBtn')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* UNLOCKED VIEW */
              <View style={styles.unlockedBox}>
                {/* PSN Email */}
                <View style={styles.fieldSection}>
                  <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldPsnEmail')}</Text>
                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialValue}>{game.psn_email}</Text>
                    <Pressable
                      onPress={() => copyToClipboard(game.psn_email, "email")}
                      style={styles.copyRow}
                    >
                      {copiedField === "email" ? (
                        <Check
                          size={12}
                          color={styles.successColor.color}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <Copy
                          size={12}
                          color={styles.accentIcon.color}
                          strokeWidth={2.2}
                        />
                      )}
                      <Text
                        style={[
                          styles.copyText,
                          copiedField === "email" && styles.copyTextSuccess,
                        ]}
                      >
                        {copiedField === "email" ? t('btnCopied') : t('btnCopy')}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* PSN Password */}
                <View style={styles.fieldSection}>
                  <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldPsnPassword')}</Text>
                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialValue}>
                      {game.psn_password || '—'}
                    </Text>
                    {game.psn_password ? (
                      <Pressable
                        onPress={() =>
                          copyToClipboard(game.psn_password || '', "password")
                        }
                        style={styles.copyRow}
                      >
                        {copiedField === "password" ? (
                          <Check
                            size={12}
                            color={styles.successColor.color}
                            strokeWidth={2.4}
                          />
                        ) : (
                          <Copy
                            size={12}
                            color={styles.accentIcon.color}
                            strokeWidth={2.2}
                          />
                        )}
                        <Text
                          style={[
                            styles.copyText,
                            copiedField === "password" && styles.copyTextSuccess,
                          ]}
                        >
                          {copiedField === "password" ? t('btnCopied') : t('btnCopy')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* 2FA Backup Codes */}
                {game.backup_codes && game.backup_codes.length > 0 && (
                  <View style={styles.fieldSection}>
                    <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>{t('fieldBackupCodes')}</Text>
                    <View style={styles.codesBox}>
                      {game.backup_codes.map((code, index) => (
                        <View
                          key={index}
                          style={[
                            styles.codeRow,
                            index < game.backup_codes!.length - 1 &&
                              styles.codeRowDivider,
                          ]}
                        >
                          <Text style={styles.monoCodeText}>{code}</Text>
                          <Pressable
                            onPress={() =>
                              copyToClipboard(code, `code-${index}`)
                            }
                            style={styles.copyRow}
                          >
                            {copiedField === `code-${index}` ? (
                              <Check
                                size={12}
                                color={styles.successColor.color}
                                strokeWidth={2.4}
                              />
                            ) : (
                              <Copy
                                size={12}
                                color={styles.accentIcon.color}
                                strokeWidth={2.2}
                              />
                            )}
                            <Text
                              style={[
                                styles.copyText,
                                copiedField === `code-${index}` &&
                                  styles.copyTextSuccess,
                              ]}
                            >
                              {copiedField === `code-${index}`
                                ? t('btnCopied')
                                : t('btnCopy')}
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Replace Credentials Action */}
                <Pressable
                  onPress={() => setReplaceModalVisible(true)}
                  style={({ pressed }) => [
                    styles.replaceCredentialsBtn,
                    pressed && styles.replaceCredentialsBtnPressed,
                  ]}
                >
                  <RefreshCw
                    size={14}
                    color={styles.accentIcon.color}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.replaceCredentialsText}>
                    {t('replaceCredentialsBtn')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* EDIT GAME DETAILS BUTTON */}
          <View style={styles.editSection}>
            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setEditModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.editGameBtn,
                pressed && styles.editGameBtnPressed,
                isNativeRTL && { flexDirection: 'row-reverse' },
              ]}
            >
              <Pencil size={15} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.editGameBtnText}>
                {isRTL ? 'تعديل بيانات اللعبة' : 'Edit Game Details'}
              </Text>
            </Pressable>
          </View>

          {/* STATUS ACTIONS */}
          <View style={styles.statusActionsSection}>
            <Text style={[styles.sectionHeader, isRTL && styles.rtlText]}>{t('changeStatusPrompt')}</Text>

            {!isLocked ? (
              <Pressable
                onPress={() => toggleGameStatus("Locked")}
                style={({ pressed }) => [
                  styles.markLockedBtn,
                  pressed && styles.markLockedBtnPressed,
                ]}
              >
                <Lock size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.statusActionText}>
                  {t('markAsLocked')}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => toggleGameStatus("Active")}
                style={({ pressed }) => [
                  styles.markActiveBtn,
                  pressed && styles.markActiveBtnPressed,
                ]}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.statusActionText}>
                  {t('markAsActive')}
                </Text>
              </Pressable>
            )}
          </View>

          {/* DANGER ZONE / DELETE GAME */}
          <View style={styles.dangerSection}>
            <Pressable
              onPress={handleDeleteGame}
              style={({ pressed }) => [
                styles.deleteGameBtn,
                pressed && styles.deleteGameBtnPressed,
                isNativeRTL && { flexDirection: 'row-reverse' },
              ]}
            >
              <Trash2 size={16} color="#EF4444" strokeWidth={2.2} />
              <Text style={styles.deleteGameBtnText}>{t('btnDeleteGame')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* CREDENTIAL REPLACEMENT MODAL */}
      <ReplaceCredentialsModal
        visible={replaceModalVisible}
        onClose={() => setReplaceModalVisible(false)}
        onSave={handleCredentialReplacement}
      />

      {/* EDIT GAME DETAILS MODAL */}
      <GameFormModal
        visible={editModalVisible}
        initialGame={game}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEditedGame}
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
    notFoundContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    notFoundText: {
      color: colors.text,
      fontSize: 16,
    },
    goBackBtn: {
      marginTop: 12,
    },
    goBackText: {
      color: colors.accent,
      fontWeight: "700",
    },
    heroWrapper: {
      width: "100%",
      height: 280,
      position: "relative",
    },
    heroCoverImage: {
      width: "100%",
      height: "100%",
    },
    heroCoverPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme === "dark" ? "#0B1120" : "#E2E8F0",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderIcon: {
      color: colors.textMuted,
    },
    vignette: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    floatingHeader: {
      position: "absolute",
      left: 20,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerCircleBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme === "dark" ? colors.surfaceElevated : "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor:
        theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)",
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.18)",
      elevation: 5,
    },
    headerCircleBtnPressed: {
      opacity: 0.8,
    },
    headerDeleteBtn: {
      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
    },
    headerIconColor: {
      color: colors.text,
    },
    headerRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sheetScroll: {
      flex: 1,
      marginTop: -32,
    },
    sheetScrollContent: {
      paddingBottom: 60,
    },
    sheetContent: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 20,
      paddingTop: 14,
      boxShadow: "0px -4px 10px rgba(0, 0, 0, 0.12)",
      elevation: 6,
    },
    sheetHandle: {
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8,
    },
    gameTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    ratingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme === "dark" ? "rgba(255, 215, 0, 0.12)" : "#FEF3C7",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#F59E0B",
    },
    ratingText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 18,
      flexWrap: "wrap",
    },
    accountTypeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statusIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotDanger: {
      backgroundColor: colors.danger,
    },
    dotSuccess: {
      backgroundColor: colors.success,
    },
    accountTypeText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 0.5,
    },
    statusBadgeActive: {
      backgroundColor: theme === "dark" ? "rgba(48, 209, 88, 0.2)" : "#ECFDF5",
      borderColor: colors.success,
    },
    statusBadgeLocked: {
      backgroundColor: theme === "dark" ? "rgba(255, 59, 48, 0.2)" : "#FEE2E2",
      borderColor: colors.danger,
    },
    statusBadgeWarning: {
      backgroundColor: "rgba(255, 159, 10, 0.2)",
      borderColor: colors.warning,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    statusTextSuccess: {
      color: colors.success,
    },
    statusTextDanger: {
      color: colors.danger,
    },
    statusTextWarning: {
      color: colors.warning,
    },
    purchaseDateText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    sellerCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow:
        theme === "dark"
          ? "0px 1px 4px rgba(0, 0, 0, 0.2)"
          : "0px 1px 4px rgba(0, 0, 0, 0.04)",
      elevation: 2,
    },
    sellerCardPressed: {
      backgroundColor: colors.surfaceElevated,
    },
    sellerCardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sellerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    accentIcon: {
      color: colors.accent,
    },
    successColor: {
      color: colors.success,
    },
    sellerCardName: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    sellerSubtextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginTop: 2,
    },
    sellerSubtext: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    sellerRatingPill: {
      backgroundColor: "rgba(255, 215, 0, 0.12)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    sellerRatingText: {
      color: "#FFD700",
      fontWeight: "800",
      fontSize: 12,
    },
    padlockBanner: {
      backgroundColor: theme === "dark" ? "#1E0E12" : "#FEF2F2",
      borderRadius: 20,
      padding: 16,
      marginTop: 14,
      borderWidth: 1.5,
      borderColor: colors.danger,
    },
    padlockHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    padlockTitle: {
      color: colors.danger,
      fontWeight: "800",
      fontSize: 14,
    },
    padlockDescription: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 6,
      lineHeight: 18,
    },
    padlockDispatchBtn: {
      backgroundColor: colors.danger,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    padlockDispatchBtnPressed: {
      backgroundColor: "#DC2626",
    },
    padlockDispatchText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 13,
    },
    warrantyCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow:
        theme === "dark"
          ? "0px 1px 4px rgba(0, 0, 0, 0.2)"
          : "0px 1px 4px rgba(0, 0, 0, 0.04)",
      elevation: 2,
    },
    sectionHeader: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    warrantyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 8,
    },
    warrantyDaysText: {
      fontSize: 20,
      fontWeight: "800",
    },
    warrantyMonthsTotal: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    warrantyExpiresText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    credentialsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow:
        theme === "dark"
          ? "0px 2px 6px rgba(0, 0, 0, 0.25)"
          : "0px 2px 6px rgba(0, 0, 0, 0.05)",
      elevation: 2,
    },
    credentialsCardUnlocked: {
      borderColor: colors.accent,
    },
    credentialsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    credentialsTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    lockText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "700",
    },
    biometricPromptBox: {
      alignItems: "center",
      paddingVertical: 20,
    },
    lockIconMargin: {
      marginBottom: 10,
    },
    credentialsProtectedTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15,
    },
    credentialsProtectedSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 16,
    },
    unlockBtn: {
      backgroundColor: colors.text,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 14,
    },
    unlockBtnPressed: {
      opacity: 0.8,
    },
    unlockBtnText: {
      color: colors.bg,
      fontWeight: "800",
      fontSize: 13,
    },
    unlockedBox: {
      marginTop: 14,
    },
    fieldSection: {
      marginBottom: 12,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
    },
    credentialRow: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    credentialValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    copyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    copyText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    copyTextSuccess: {
      color: colors.success,
    },
    codesBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    codeRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    monoCodeText: {
      color: colors.text,
      fontFamily: "monospace",
      fontSize: 13,
    },
    replaceCredentialsBtn: {
      backgroundColor: colors.surfaceSubtle,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 6,
    },
    replaceCredentialsBtnPressed: {
      opacity: 0.8,
    },
    replaceCredentialsText: {
      color: colors.accent,
      fontWeight: "800",
      fontSize: 13,
    },
    editSection: {
      marginTop: 18,
    },
    editGameBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: theme === "dark" ? "rgba(0, 210, 255, 0.08)" : "#E8F3FC",
      borderWidth: 1,
      borderColor: theme === "dark" ? "rgba(0, 210, 255, 0.25)" : "rgba(0, 112, 209, 0.2)",
    },
    editGameBtnPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    editGameBtnText: {
      color: theme === "dark" ? "#00D2FF" : "#0070D1",
      fontSize: 13,
      fontWeight: "800",
    },
    statusActionsSection: {
      marginTop: 14,
    },
    markLockedBtn: {
      backgroundColor: colors.danger,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    markLockedBtnPressed: {
      backgroundColor: "#DC2626",
    },
    markActiveBtn: {
      backgroundColor: colors.success,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    markActiveBtnPressed: {
      backgroundColor: "#059669",
    },
    statusActionText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 14,
    },
    rtlText: {
      textAlign: 'right',
    },
    dangerSection: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    deleteGameBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
      borderRadius: 14,
      paddingVertical: 14,
    },
    deleteGameBtnPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    deleteGameBtnText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '700',
    },
  });
