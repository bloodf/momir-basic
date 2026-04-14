import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BluetoothSearching, Wifi } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { showToast } from '@/components/Toast';
import type { PrinterUiState } from '@/features/printer/types';
import { printerCapabilityService } from '@/services/printer/capability';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';
import type { PrinterRecord } from '@/types';
import { ErrorCategory, logger } from '@/utils/logger';
import { usePrinterConnection } from '@/features/printer/usePrinterConnection';
import { usePrinterDiscovery } from '@/features/printer/usePrinterDiscovery';
import { usePrinterTestPrint } from '@/features/printer/usePrinterTestPrint';
import { useTcpPrinterSetup } from '@/features/printer/useTcpPrinterSetup';

import { styles } from './printerSetup.styles';
import { PrinterDeviceList } from './printer-setup/PrinterDeviceList';
import { PrinterSettingsSections } from './printer-setup/PrinterSettingsSections';
import { PrinterStatusCards } from './printer-setup/PrinterStatusCards';
import { TcpPrinterModal } from './printer-setup/TcpPrinterModal';

export default function PrinterSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updatePrinter, savePreferredPrinter } = useSettingsStore();
  const { t } = useI18n();

  const [uiState, setUiState] = useState<PrinterUiState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  const {
    isScanning: scanning,
    discoveredPrinters: printers,
    scanError,
    permissionState,
    startScan,
    setDiscoveredPrinters: setPrinters,
    setPermissionState,
    setScanError,
  } = usePrinterDiscovery();

  const {
    connectedPrinter,
    isConnecting: connecting,
    connectToPrinter,
    disconnectPrinter,
    verifyConnection,
    forgetPrinter,
  } = usePrinterConnection(
    setUiState,
    setErrorMessage,
    setPermissionState,
    savePreferredPrinter,
    printer => {
      showToast({
        type: 'success',
        title: t.printer.connected,
        message: t.printer.connectedTo(printer.name),
      });
    }
  );

  const { testPrintStatus: testing, sendTestPrint } = usePrinterTestPrint();
  const {
    tcpModalVisible: tcpModalOpen,
    tcpHost,
    tcpPort,
    isAdding: tcpAdding,
    openTcpModal,
    closeTcpModal,
    setTcpHost,
    setTcpPort,
    addTcpPrinter,
  } = useTcpPrinterSetup();

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, pulseAnim]);

  const checkRealConnectionState = useCallback(async () => {
    const preferredPrinterId = settings.printer.preferredPrinterId;

    if (!preferredPrinterId) {
      if (!['initializing', 'tcp_setup', 'discovered', 'scanning'].includes(uiState)) {
        setUiState(printers.length > 0 ? 'discovered' : 'scan_empty');
      }
      return;
    }

    const result = await verifyConnection(preferredPrinterId, printers);
    if (result) {
      setUiState('connected');
    } else if (uiState === 'connected') {
      setUiState('disconnected');
    }
  }, [settings.printer.preferredPrinterId, uiState, printers, verifyConnection]);

  useEffect(() => {
    const init = async () => {
      if (!printerCapabilityService.isNativeModuleAvailable()) {
        setErrorMessage(t.printer.moduleUnavailableText);
        setUiState('module_unavailable');
        return;
      }

      if (!isIOS) {
        try {
          const state = await printerCapabilityService.getAndroidPermissionState();
          setPermissionState(state.overall);
          if (state.overall === 'never_ask_again') {
            setUiState('permission_never_ask');
            return;
          }
          if (state.overall === 'denied') {
            setUiState('permission_denied');
            return;
          }
        } catch (error) {
          logger.debug(ErrorCategory.Printer, 'Permission check failed, continuing', error);
        }
      }

      await checkRealConnectionState();

      try {
        const scannedPrinters = await startScan();
        setUiState(scannedPrinters.length > 0 ? 'discovered' : 'scan_empty');

        const preferredPrinterId = settings.printer.preferredPrinterId;
        if (preferredPrinterId) {
          const preferredDevice = scannedPrinters.find(
            printer => printer.id === preferredPrinterId
          );
          if (preferredDevice) {
            await connectToPrinter(preferredDevice);
          }
        }
      } catch (error) {
        logger.warn(ErrorCategory.Printer, 'Auto-scan failed on init', error);
        if (uiState === 'initializing') {
          setUiState('scan_empty');
        }
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkRealConnectionState();
    }, [checkRealConnectionState])
  );

  const openBluetoothSettings = useCallback(() => {
    if (isIOS) {
      void Linking.openURL('App-Prefs:Bluetooth');
      return;
    }

    if (isAndroid) {
      void Linking.sendIntent?.('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        void Linking.openSettings();
      });
      return;
    }

    showToast({
      type: 'info',
      title: t.printer.bluetoothSettings,
      message: t.printer.bluetoothSettingsMsg,
    });
  }, [isAndroid, isIOS, t]);

  const handleScan = useCallback(async () => {
    setScanError(null);
    setErrorMessage(null);
    setUiState('scanning');
    const scannedPrinters = await startScan();
    setUiState(scannedPrinters.length === 0 ? 'scan_empty' : 'discovered');
  }, [setScanError, startScan]);

  const handleConnect = useCallback(
    async (printer: PrinterRecord) => {
      await connectToPrinter(printer);
    },
    [connectToPrinter]
  );

  const handleDisconnect = useCallback(async () => {
    await disconnectPrinter(settings.printer.preferredPrinterId);
  }, [disconnectPrinter, settings.printer.preferredPrinterId]);

  const handleTestPrint = useCallback(
    async (printer: PrinterRecord) => {
      await sendTestPrint(
        printer,
        t.printer.testPrint,
        name => `Diagnostics print completed successfully for ${name}.`
      );
    },
    [sendTestPrint, t.printer.testPrint]
  );

  const handleAddTcpPrinter = useCallback(async () => {
    const result = await addTcpPrinter();
    if (result) {
      await handleScan();
    }
  }, [addTcpPrinter, handleScan]);

  const handleForgetPrinter = useCallback(
    async (printer: PrinterRecord) => {
      Alert.alert('Forget Printer', `Remove "${printer.name}" from saved printers?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await forgetPrinter(
                printer,
                settings.printer.preferredPrinterId,
                printers
              );
              setPrinters(updated);
              if (updated.length === 0) setUiState('scan_empty');
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'Failed to forget printer.');
            }
          },
        },
      ]);
    },
    [forgetPrinter, printers, settings.printer.preferredPrinterId, setPrinters]
  );

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + 8, opacity: fadeIn }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="back">
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t.printer.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PrinterStatusCards
          errorMessage={errorMessage}
          scanError={scanError}
          uiState={uiState}
          permissionState={permissionState}
          isIOS={isIOS}
          scanning={scanning}
          printers={printers}
          connectedPrinter={connectedPrinter}
          connecting={connecting}
          testing={testing}
          texts={t}
          onGoBack={() => router.back()}
          onOpenBluetoothSettings={openBluetoothSettings}
          onDismissUnsupported={() => {
            setUiState(
              connectedPrinter ? 'connected' : printers.length > 0 ? 'discovered' : 'scan_empty'
            );
            setErrorMessage(null);
          }}
          onCheckConnection={() => void checkRealConnectionState()}
          onScan={() => void handleScan()}
          onTestPrint={printer => void handleTestPrint(printer)}
          onDisconnect={() => void handleDisconnect()}
        />

        <PrinterSettingsSections printer={settings.printer} updatePrinter={updatePrinter} />

        <View style={styles.scanSection}>
          <View style={styles.scanButtonsRow}>
            <Pressable
              onPress={() => void handleScan()}
              disabled={
                scanning ||
                uiState === 'permission_never_ask' ||
                uiState === 'unsupported_transport' ||
                uiState === 'module_unavailable'
              }
              style={({ pressed }) => [
                styles.scanButton,
                scanning && styles.scanButtonScanning,
                (uiState === 'permission_never_ask' ||
                  uiState === 'unsupported_transport' ||
                  uiState === 'module_unavailable') &&
                  styles.scanButtonDisabled,
                pressed &&
                  !scanning &&
                  uiState !== 'permission_never_ask' &&
                  styles.scanButtonPressed,
              ]}
              testID="scan-printers"
            >
              <View style={styles.scanButtonContent}>
                {scanning ? (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <BluetoothSearching size={18} color={Colors.gold} />
                  </Animated.View>
                ) : (
                  <BluetoothSearching size={18} color={Colors.gold} />
                )}
                <Text style={styles.scanButtonText}>
                  {scanning
                    ? isIOS
                      ? t.printer.lookingForPaired
                      : t.printer.scanning
                    : isIOS
                      ? t.printer.scanForPairedPrinters
                      : t.printer.scanForPrinters}
                </Text>
              </View>
            </Pressable>

            {!isIOS && (
              <Pressable
                onPress={openTcpModal}
                style={({ pressed }) => [
                  styles.tcpScanButton,
                  pressed && styles.tcpScanButtonPressed,
                ]}
                testID="add-tcp-printer"
              >
                <Wifi size={18} color={Colors.gold} />
                <Text style={styles.tcpScanButtonText}>TCP</Text>
              </Pressable>
            )}
          </View>
        </View>

        {(uiState === 'discovered' || (uiState === 'connected' && printers.length > 0)) && (
          <PrinterDeviceList
            printers={printers}
            connectedPrinter={connectedPrinter}
            connecting={connecting}
            testing={testing}
            preferredPrinterId={settings.printer.preferredPrinterId}
            sectionLabel={isIOS ? t.printer.pairedDevices : t.printer.nearbyDevices}
            connectedLabel={t.printer.connected}
            testLabel={t.printer.test}
            onConnect={printer => void handleConnect(printer)}
            onTestPrint={printer => void handleTestPrint(printer)}
            onForgetPrinter={printer => void handleForgetPrinter(printer)}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TcpPrinterModal
        visible={tcpModalOpen}
        tcpHost={tcpHost}
        tcpPort={tcpPort}
        tcpAdding={tcpAdding}
        onClose={closeTcpModal}
        onAddPrinter={() => void handleAddTcpPrinter()}
        onChangeHost={setTcpHost}
        onChangePort={setTcpPort}
      />
    </Animated.View>
  );
}
