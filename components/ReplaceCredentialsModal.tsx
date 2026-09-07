import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../context/ThemeContext';

interface ReplaceCredentialsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newEmail: string, newPassword: string) => void;
}

export function ReplaceCredentialsModal({
  visible,
  onClose,
  onSave,
}: ReplaceCredentialsModalProps) {
  const styles = useThemedStyles(createStyles);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSave = () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      Alert.alert('Missing Fields', 'Please provide both the new PSN email and password.');
      return;
    }
    onSave(newEmail.trim(), newPassword.trim());
    setNewEmail('');
    setNewPassword('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Replace PSN Credentials</Text>
          <Text style={styles.sheetSubtitle}>
            The existing email and password will be archived into your credential history log.
          </Text>

          <Text style={styles.fieldLabel}>NEW PSN EMAIL</Text>
          <TextInput
            placeholder="new.psn.account@gmail.com"
            placeholderTextColor={styles.placeholder.color}
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.textInput}
          />

          <Text style={styles.fieldLabel}>NEW PSN PASSWORD</Text>
          <TextInput
            placeholder="NewPassword#2024"
            placeholderTextColor={styles.placeholder.color}
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
            secureTextEntry
            style={[styles.textInput, styles.passwordInput]}
          />

          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save & Archive</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, _theme: ThemeMode) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    sheetSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 16,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    placeholder: {
      color: colors.textMuted,
    },
    textInput: {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    passwordInput: {
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.surfaceSubtle,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.text,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.bg,
      fontWeight: '800',
    },
  });
