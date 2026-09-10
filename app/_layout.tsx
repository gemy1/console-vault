import "../global.css";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { LanguageProvider } from "../context/LanguageContext";
import { VaultThemeProvider, useVaultTheme } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SecurityProvider } from "../context/SecurityContext";
import { VaultSyncProvider } from "../context/VaultSyncContext";
import { AlertProvider } from "../context/AlertContext";
import { BiometricLockScreen } from "../components/auth/BiometricLockScreen";
import { BrandedSplashOverlay } from "../components/common/BrandedSplashOverlay";
import { VaultStorage } from "../services/storage";

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
          name="client/[id]"
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

import { PersonaProvider } from "../context/PersonaContext";
import { AuthModalProvider } from "../context/AuthModalContext";

function VaultAppProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SecurityProvider>
      <VaultSyncProvider userId={user?.id}>
        <LanguageProvider>
          <VaultThemeProvider>
            <PersonaProvider>
              <AlertProvider>
                <AuthModalProvider>
                  {children}
                  <BiometricLockScreen />
                </AuthModalProvider>
              </AlertProvider>
            </PersonaProvider>
          </VaultThemeProvider>
        </LanguageProvider>
      </VaultSyncProvider>
    </SecurityProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Cairo_400Regular: require("@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf"),
    Cairo_600SemiBold: require("@expo-google-fonts/cairo/600SemiBold/Cairo_600SemiBold.ttf"),
    Cairo_700Bold: require("@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf"),
    Cairo_800ExtraBold: require("@expo-google-fonts/cairo/800ExtraBold/Cairo_800ExtraBold.ttf"),
  });

  const [storageReady, setStorageReady] = useState(() => VaultStorage.isHydrated());

  useEffect(() => {
    if (storageReady) return;
    VaultStorage.waitForHydration().finally(() => {
      setStorageReady(true);
    });
  }, [storageReady]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && storageReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, storageReady]);

  if (!loaded || !storageReady) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <VaultAppProviders>
          <RootNavigator />
          <BrandedSplashOverlay />
        </VaultAppProviders>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
