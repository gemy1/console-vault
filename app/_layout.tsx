import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { LanguageProvider } from "../context/LanguageContext";
import { VaultThemeProvider, useVaultTheme } from "../context/ThemeContext";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, colors } = useVaultTheme();

  return (
    <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="game/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="seller/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="game/add"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="game/padlock"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LanguageProvider>
        <VaultThemeProvider>
          <RootNavigator />
        </VaultThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
