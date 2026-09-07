import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ThemeColors, ThemeMode } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function NotFoundScreen() {
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ title: t('notFoundTitle') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFoundScreenText')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFoundGoHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors, theme: ThemeMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.bg,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
    },
    linkText: {
      fontSize: 14,
      color: colors.accent,
    },
  });

