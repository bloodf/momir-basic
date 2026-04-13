import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HistoryProvider } from "@/providers/HistoryProvider";
import { SettingsProvider, useSettings } from "@/providers/SettingsProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { I18nProvider, useI18n } from "@/i18n";
import { ToastProvider, showToast } from "@/components/Toast";
import { registryService } from "../services/printer/registry/service";
import { ErrorCategory, logger } from "@/utils/logger";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * PrinterAutoConnect — attempts to reconnect to the preferred printer on app startup.
 * Runs once in background, shows toast on result. Does not block app startup.
 * Uses registryService to connect using a registry DB key (NOT raw Bluetooth address).
 */
function PrinterAutoConnect() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (Platform.OS === 'web') return;

    const prefId = settings.printer?.preferredPrinterId;
    if (!prefId) return;

    attemptedRef.current = true;

    (async () => {
      try {
        // preferredPrinterId is a registry DB key — registryService handles address lookup
        await registryService.connectPrinter(prefId);
        showToast({ type: 'success', title: t.toast.printerConnected, message: t.toast.printerReady });
      } catch (error) {
        logger.warn(ErrorCategory.Printer, 'Auto-connect failed on startup', error);
        showToast({ type: 'warning', title: t.toast.printerReconnectTitle, message: t.toast.printerReconnectMessage });
      }
    })();
  }, [settings.printer?.preferredPrinterId]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="card"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="print-preview"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="life-counter"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Mana: require('../assets/fonts/mana.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <I18nProvider>
            <SettingsProvider>
              <HistoryProvider>
                <NetworkProvider>
                  <ToastProvider>
                    <PrinterAutoConnect />
                    <RootLayoutNav />
                  </ToastProvider>
                </NetworkProvider>
              </HistoryProvider>
            </SettingsProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
