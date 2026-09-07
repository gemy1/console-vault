import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gamepad2, ShieldCheck, Plus, Sparkles } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../../context/ThemeContext';

export interface QuickActionItem {
  id?: string;
  label: string;
  sublabel?: string;
  icon: 'game' | 'seller';
  onPress: () => void;
  primary?: boolean;
}

export interface QuickAddWidgetProps {
  actions: QuickActionItem[];
  tag?: string;
}

export function QuickAddWidget({ actions, tag }: QuickAddWidgetProps) {
  const styles = useThemedStyles(createStyles);

  const handlePress = (action: QuickActionItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    action.onPress();
  };

  // DUAL ACTIONS MODE (e.g. Dashboard: + Add Game & + Add Seller side-by-side)
  if (actions.length > 1) {
    return (
      <View style={styles.container}>
        {tag && (
          <View style={styles.tagRow}>
            <Sparkles size={11} color={styles.accentIcon.color} strokeWidth={2.2} />
            <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.dualRow}>
          {actions.map((item, index) => {
            const isGame = item.icon === 'game';
            return (
              <Pressable
                key={item.id || index}
                onPress={() => handlePress(item)}
                style={({ pressed }) => [
                  styles.dualCard,
                  isGame ? styles.dualCardGame : styles.dualCardSeller,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.dualCardTop}>
                  <View
                    style={[
                      styles.iconCircleSmall,
                      isGame ? styles.iconCircleGame : styles.iconCircleSeller,
                    ]}
                  >
                    {isGame ? (
                      <Gamepad2 size={16} color="#00D2FF" strokeWidth={2.2} />
                    ) : (
                      <ShieldCheck size={16} color="#38BDF8" strokeWidth={2.2} />
                    )}
                  </View>

                  <View
                    style={[
                      styles.plusPill,
                      isGame ? styles.plusPillGame : styles.plusPillSeller,
                    ]}
                  >
                    <Plus size={12} color="#FFFFFF" strokeWidth={2.6} />
                  </View>
                </View>

                <View style={styles.dualCardBody}>
                  <Text style={styles.dualCardLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.sublabel && (
                    <Text style={styles.dualCardSublabel} numberOfLines={1}>
                      {item.sublabel}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // SINGLE ACTION MODE (e.g. Vault or Sellers: prominent, sleek wide banner)
  const single = actions[0];
  if (!single) return null;
  const isGame = single.icon === 'game';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => handlePress(single)}
        style={({ pressed }) => [
          styles.singleCard,
          isGame ? styles.singleCardGame : styles.singleCardSeller,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.singleLeft}>
          <View
            style={[
              styles.iconCircleLarge,
              isGame ? styles.iconCircleGame : styles.iconCircleSeller,
            ]}
          >
            {isGame ? (
              <Gamepad2 size={20} color="#00D2FF" strokeWidth={2.2} />
            ) : (
              <ShieldCheck size={20} color="#38BDF8" strokeWidth={2.2} />
            )}
          </View>

          <View style={styles.singleTextCol}>
            <View style={styles.singleTitleRow}>
              <Text style={styles.singleLabel}>{single.label}</Text>
              {tag && (
                <View style={styles.microBadge}>
                  <Text style={styles.microBadgeText}>{tag}</Text>
                </View>
              )}
            </View>
            {single.sublabel && (
              <Text style={styles.singleSublabel} numberOfLines={1}>
                {single.sublabel}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.actionPillButton,
            isGame ? styles.actionPillGame : styles.actionPillSeller,
          ]}
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.actionPillText}>Add</Text>
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      marginBottom: 14,
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    tagText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.985 }],
    },
    accentIcon: {
      color: colors.accent,
    },

    /* DUAL CARDS LAYOUT */
    dualRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dualCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 3px 8px rgba(0, 0, 0, 0.35)' : '0px 3px 8px rgba(0, 0, 0, 0.08)',
      elevation: 3,
    },
    dualCardGame: {
      borderLeftWidth: 3,
      borderLeftColor: '#00D2FF',
    },
    dualCardSeller: {
      borderLeftWidth: 3,
      borderLeftColor: '#0070D1',
    },
    dualCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconCircleSmall: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleGame: {
      backgroundColor: 'rgba(0, 210, 255, 0.12)',
    },
    iconCircleSeller: {
      backgroundColor: 'rgba(0, 112, 209, 0.12)',
    },
    plusPill: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusPillGame: {
      backgroundColor: '#0070D1',
    },
    plusPillSeller: {
      backgroundColor: '#0F56B3',
    },
    dualCardBody: {
      gap: 2,
    },
    dualCardLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    dualCardSublabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },

    /* SINGLE CARD LAYOUT */
    singleCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: theme === 'dark' ? '0px 3px 8px rgba(0, 0, 0, 0.3)' : '0px 3px 8px rgba(0, 0, 0, 0.06)',
      elevation: 3,
    },
    singleCardGame: {
      borderLeftWidth: 3,
      borderLeftColor: '#00D2FF',
    },
    singleCardSeller: {
      borderLeftWidth: 3,
      borderLeftColor: '#0070D1',
    },
    singleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconCircleLarge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    singleTextCol: {
      flex: 1,
      gap: 2,
    },
    singleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    singleLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    singleSublabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },
    microBadge: {
      backgroundColor: 'rgba(0, 112, 209, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 5,
    },
    microBadgeText: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '800',
    },
    actionPillButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 12,
      boxShadow: '0px 2px 4px rgba(0, 112, 209, 0.3)',
      elevation: 2,
    },
    actionPillGame: {
      backgroundColor: '#0070D1',
    },
    actionPillSeller: {
      backgroundColor: '#0070D1',
    },
    actionPillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
  });
