import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OfflineVault } from '../../services/storage';
import { Game } from '../../types/vault';
import { GameFormModal, GameFormData } from '../../components/games/GameFormModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export default function AddGameScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const handleSave = (gameData: GameFormData) => {
    const newGame: Game = {
      id: `game-${Date.now()}`,
      user_id: 'user-current',
      status: 'Active',
      purchase_date: new Date().toISOString().split('T')[0],
      ...gameData,
    };

    OfflineVault.addGame(newGame);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.replace(`/game/${newGame.id}`);
  };

  return (
    <View style={styles.container}>
      <GameFormModal
        visible={true}
        onClose={() => router.back()}
        onSave={handleSave}
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
  });
