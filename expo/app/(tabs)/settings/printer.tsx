import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bluetooth,
  BluetoothSearching,
  Signal,
  Printer,
  Check,
  Smartphone,
  Radio,
  Wifi,
  ExternalLink,
  Info,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import { PrinterDevice } from '@/types';
import { useI18n } from '@/i18n';
import { showToast } from '@/components/Toast';

const MOCK_BLE_DEVICES: PrinterDevice[] = [
  { id: 'ble-1', name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', rssi: -42, type: 'ble' },
  { id: 'ble-2', name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04', rssi: -55, type: 'ble' },
];

const MOCK_CLASSIC_DEVICES: PrinterDevice[] = [
  { id: 'classic-1', name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02', rssi: -62, type: 'classic' },
  { id: 'classic-2', name: 'BT Printer Pro', address: 'AA:BB:CC:DD:EE:03', rssi: -71, type: 'classic' },
];

export default function PrinterSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updatePrinter, updateSettings } = useSettings();
  const { t } = useI18n();

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
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

  const openBluetoothSettings = useCallback(() => {
    if (isIOS) {
      void Linking.openURL('App-Prefs:Bluetooth');
    } else if (Platform.OS === 'android') {
      void Linking.sendIntent?.('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        void Linking.openSettings();
      });
    } else {
      showToast({ type: 'info', title: t.printer.bluetoothSettings, message: t.printer.bluetoothSettingsMsg });
    }
  }, [isIOS, t]);

  const handleScan = useCallback(() => {
    setScanning(true);
    setDevices([]);

    console.log('[Printer] Starting scan for paired/nearby devices');

    setTimeout(() => {
      const mockDevices = [...MOCK_BLE_DEVICES, ...MOCK_CLASSIC_DEVICES];
      console.log('[Printer] Devices found:', mockDevices.length);
      setDevices(mockDevices);
    }, 2000);

    setTimeout(() => {
      setScanning(false);
      console.log('[Printer] Scan complete');
    }, 3000);
  }, []);

  const handleConnect = useCallback((device: PrinterDevice) => {
    setConnecting(device.id);
    console.log('[Printer] Connecting to', device.name, 'via', device.type);

    setTimeout(() => {
      updatePrinter({
        name: device.name,
        address: device.address,
        type: device.type,
      });
      updateSettings({ printerConnected: true });
      setConnecting(null);
      console.log('[Printer] Connected to', device.name);
      showToast({ type: 'success', title: t.toast.printerConnected, message: t.printer.connectedTo(device.name) });
    }, 1500);
  }, [updatePrinter, updateSettings, t]);

  const handleDisconnect = useCallback(() => {
    console.log('[Printer] Disconnecting from', settings.printer.name);
    updatePrinter({ name: '', address: '' });
    updateSettings({ printerConnected: false });
    showToast({ type: 'warning', title: t.toast.printerDisconnected, message: t.toast.printerDisconnectedMessage });
  }, [updatePrinter, updateSettings, settings.printer.name, t]);

  const handleTestPrint = useCallback(() => {
    showToast({ type: 'info', title: t.printer.testPrint, message: t.printer.testPrintMsg(settings.printer.name) });
  }, [settings.printer, t]);

  const getSignalBars = (rssi?: number): number => {
    if (!rssi) return 0;
    if (rssi > -50) return 3;
    if (rssi > -70) return 2;
    return 1;
  };

  const hasDevices = devices.length > 0;

  const renderDevice = (device: PrinterDevice) => {
    const isConnected = settings.printer.address === device.address && settings.printerConnected;
    const isConnecting = connecting === device.id;
    const bars = getSignalBars(device.rssi);
    const isBle = device.type === 'ble';

    return (
      <Pressable
        key={device.id}
        onPress={() => !isConnected && !isConnecting && handleConnect(device)}
        style={({ pressed }) => [
          styles.deviceItem,
          isConnected && styles.deviceItemConnected,
          pressed && !isConnected && styles.deviceItemPressed,
        ]}
        testID={`device-${device.id}`}
      >
        <View style={[styles.deviceIcon, isBle ? styles.deviceIconBle : styles.deviceIconClassic]}>
          {isBle ? (
            <Radio size={16} color={isConnected ? Colors.success : '#5B9BD5'} />
          ) : (
            <Bluetooth size={16} color={isConnected ? Colors.success : '#C084FC'} />
          )}
        </View>
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, isConnected && styles.deviceNameConnected]} numberOfLines={1}>
            {device.name}
          </Text>
          <View style={styles.deviceMeta}>
            <View style={[styles.typeBadge, isBle ? styles.typeBadgeBle : styles.typeBadgeClassic]}>
              <Text style={[styles.typeBadgeText, isBle ? styles.typeBadgeTextBle : styles.typeBadgeTextClassic]}>
                {isBle ? 'BLE' : 'Classic'}
              </Text>
            </View>
            <Text style={styles.deviceAddress}>{device.address}</Text>
          </View>
        </View>
        <View style={styles.deviceRight}>
          <View style={styles.deviceSignal}>
            {[1, 2, 3].map(bar => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  { height: 4 + bar * 4 },
                  bar <= bars && styles.signalBarActive,
                ]}
              />
            ))}
          </View>
          {isConnecting && <ActivityIndicator color={Colors.gold} size="small" />}
          {isConnected && (
            <View style={styles.connectedCheck}>
              <Check size={14} color="#fff" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

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
        {settings.printerConnected && (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View style={styles.connectedIconWrap}>
                <Printer size={18} color="#fff" />
              </View>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedName}>{settings.printer.name}</Text>
                <View style={styles.connectedMeta}>
                  <View style={[
                    styles.connectedTypeBadge,
                    settings.printer.type === 'ble' ? styles.typeBadgeBle : styles.typeBadgeClassic,
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      settings.printer.type === 'ble' ? styles.typeBadgeTextBle : styles.typeBadgeTextClassic,
                    ]}>
                      {settings.printer.type === 'ble' ? 'BLE' : 'Classic BT'}
                    </Text>
                  </View>
                  <Text style={styles.connectedAddress}>{settings.printer.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.connectedDivider} />

            <View style={styles.connectedActions}>
              <Pressable onPress={handleTestPrint} style={styles.testButton}>
                <Printer size={14} color={Colors.gold} />
                <Text style={styles.testButtonText}>{t.printer.test}</Text>
              </Pressable>
              <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
                <Text style={styles.disconnectText}>{t.printer.disconnect}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isIOS && !settings.printerConnected && (
          <View style={styles.iosFlowCard}>
            <View style={styles.iosFlowHeader}>
              <View style={styles.iosFlowIconWrap}>
                <Bluetooth size={20} color="#5B9BD5" />
              </View>
              <Text style={styles.iosFlowTitle}>{t.printer.iosBluetoothSetup}</Text>
            </View>

            <View style={styles.stepsContainer}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{t.printer.step1Title}</Text>
                  <Text style={styles.stepDesc}>{t.printer.step1Desc}</Text>
                </View>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{t.printer.step2Title}</Text>
                  <Text style={styles.stepDesc}>{t.printer.step2Desc}</Text>
                </View>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{t.printer.step3Title}</Text>
                  <Text style={styles.stepDesc}>{t.printer.step3Desc}</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={openBluetoothSettings}
              style={({ pressed }) => [
                styles.openSettingsButton,
                pressed && styles.openSettingsButtonPressed,
              ]}
              testID="open-bt-settings"
            >
              <ExternalLink size={16} color="#fff" />
              <Text style={styles.openSettingsText}>{t.printer.openBluetoothSettings}</Text>
            </Pressable>
          </View>
        )}

        {!isIOS && !settings.printerConnected && (
          <View style={styles.infoCard}>
            <Info size={16} color="#5B9BD5" />
            <Text style={styles.infoText}>
              {t.printer.bluetoothInfo}
            </Text>
          </View>
        )}

        <View style={styles.scanSection}>
          <Pressable
            onPress={handleScan}
            disabled={scanning}
            style={({ pressed }) => [
              styles.scanButton,
              scanning && styles.scanButtonScanning,
              pressed && !scanning && styles.scanButtonPressed,
            ]}
            testID="scan-printers"
          >
            {scanning ? (
              <View style={styles.scanButtonContent}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <BluetoothSearching size={18} color={Colors.gold} />
                </Animated.View>
                <Text style={styles.scanButtonText}>
                  {isIOS ? t.printer.lookingForPaired : t.printer.scanning}
                </Text>
              </View>
            ) : (
              <View style={styles.scanButtonContent}>
                <BluetoothSearching size={18} color={Colors.gold} />
                <Text style={styles.scanButtonText}>
                  {isIOS ? t.printer.scanForPairedPrinters : t.printer.scanForPrinters}
                </Text>
              </View>
            )}
          </Pressable>

          {isWeb && (
            <View style={styles.webNotice}>
              <Wifi size={13} color={Colors.textSecondary} />
              <Text style={styles.webNoticeText}>
                {t.printer.webSimulated}
              </Text>
            </View>
          )}
        </View>

        {hasDevices && (
          <View style={styles.devicesSection}>
            <Text style={styles.sectionLabel}>
              {isIOS ? t.printer.pairedDevices : t.printer.nearbyDevices}
            </Text>
            {devices.map(renderDevice)}
          </View>
        )}

        {!scanning && !hasDevices && !settings.printerConnected && (
          <View style={styles.emptyState}>
            <Signal size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t.printer.noPrintersFound}</Text>
            <Text style={styles.emptySubtitle}>
              {isIOS
                ? t.printer.iosEmptyHint
                : t.printer.androidEmptyHint}
            </Text>
            <View style={styles.compatRow}>
              <View style={styles.compatItem}>
                <Smartphone size={14} color={Colors.textMuted} />
                <Text style={styles.compatText}>{t.printer.worksOnBothPlatforms}</Text>
              </View>
              <View style={styles.compatItem}>
                <Radio size={14} color={Colors.textMuted} />
                <Text style={styles.compatText}>BLE + Classic BT</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 0.3,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  connectedCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,204,102,0.25)',
    marginBottom: 20,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedInfo: {
    flex: 1,
  },
  connectedName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  connectedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  connectedTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  connectedAddress: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  connectedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,105,45,0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.2)',
  },
  testButtonText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  disconnectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,68,68,0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.2)',
  },
  disconnectText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  iosFlowCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(91,155,213,0.2)',
    marginBottom: 20,
  },
  iosFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  iosFlowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(91,155,213,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosFlowTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stepsContainer: {
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(91,155,213,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#5B9BD5',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  stepDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  stepConnector: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(91,155,213,0.15)',
    marginLeft: 12,
    borderRadius: 1,
  },
  openSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5B9BD5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  openSettingsButtonPressed: {
    opacity: 0.8,
  },
  openSettingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(91,155,213,0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(91,155,213,0.12)',
    marginBottom: 20,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  scanSection: {
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.25)',
    paddingVertical: 14,
  },
  scanButtonScanning: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(232,105,45,0.05)',
  },
  scanButtonPressed: {
    backgroundColor: 'rgba(232,105,45,0.08)',
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,105,45,0.06)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.12)',
  },
  webNoticeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  devicesSection: {
    marginBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceItemConnected: {
    borderColor: 'rgba(34,204,102,0.3)',
    backgroundColor: 'rgba(34,204,102,0.04)',
  },
  deviceItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconBle: {
    backgroundColor: 'rgba(91,155,213,0.1)',
  },
  deviceIconClassic: {
    backgroundColor: 'rgba(192,132,252,0.1)',
  },
  deviceInfo: {
    flex: 1,
    gap: 3,
  },
  deviceName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deviceNameConnected: {
    color: Colors.success,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  typeBadgeBle: {
    backgroundColor: 'rgba(91,155,213,0.15)',
  },
  typeBadgeClassic: {
    backgroundColor: 'rgba(192,132,252,0.15)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  typeBadgeTextBle: {
    color: '#5B9BD5',
  },
  typeBadgeTextClassic: {
    color: '#C084FC',
  },
  deviceAddress: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  deviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceSignal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 3,
    backgroundColor: Colors.border,
    borderRadius: 1.5,
  },
  signalBarActive: {
    backgroundColor: Colors.success,
  },
  connectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
    paddingHorizontal: 24,
  },
  compatRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  compatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compatText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
