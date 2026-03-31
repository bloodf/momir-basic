import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import React, { useEffect, useRef } from "react";
import { NativeModules, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HistoryProvider } from "@/providers/HistoryProvider";
import { SettingsProvider, useSettings } from "@/providers/SettingsProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { I18nProvider } from "@/i18n";
import { ToastProvider, showToast } from "@/components/Toast";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * PrinterAutoConnect — attempts to reconnect to the preferred printer on app startup.
 * Runs once in background, shows toast on result. Does not block app startup.
 */
function PrinterAutoConnect() {
  const { settings } = useSettings();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (Platform.OS === 'web') return;

    const prefId = settings.printer?.preferredPrinterId;
    if (!prefId) return;

    attemptedRef.current = true;
    const nativePrinter = NativeModules.ThermalPrinterDriver;
    if (!nativePrinter) return;

    const btAddress = prefId.startsWith('bt:') ? prefId : `bt:${prefId}`;

    (async () => {
      try {
        await nativePrinter.connect(btAddress, 10000);
        const result = await nativePrinter.testConnection(btAddress);
        if (result?.success) {
          showToast({ type: 'success', title: 'Printer Connected', message: 'Ready to print.' });
        }
      } catch {
        showToast({ type: 'warning', title: 'Printer Not Found', message: 'Could not auto-connect. Reconnect in Settings.' });
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
      <GestureHandlerRootView>
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
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
