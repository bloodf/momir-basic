import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Switch,
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
  AlertTriangle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import { PrinterDevice } from '@/types';
import { useI18n } from '@/i18n';

const MOCK_BLE_DEVICES: PrinterDevice[] = [
  { id: 'ble-1', name: 'POS-58 BLE', address: 'AA:BB:CC:DD:EE:01', rssi: -42, type: 'ble' },
  { id: 'ble-2', name: 'Thermal Mini BLE', address: 'AA:BB:CC:DD:EE:04', rssi: -55, type: 'ble' },
];

const MOCK_CLASSIC_DEVICES: PrinterDevice[] = [
  { id: 'classic-1', name: 'Thermal-80mm BT', address: 'AA:BB:CC:DD:EE:02', rssi: -62, type: 'classic' },
  { id: 'classic-2', name: 'BT Printer Pro', address: 'AA:BB:CC:DD:EE:03', rssi: -71, type: 'classic' },
];

type ScanMode = 'all' | 'ble' | 'classic';

export default function PrinterSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updatePrinter, updateSettings } = useSettings();
  const { t: _t } = useI18n();

  const [scanning, setScanning] = useState(false);
  const [bleDevices, setBleDevices] = useState<PrinterDevice[]>([]);
  const [classicDevices, setClassicDevices] = useState<PrinterDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('all');
  const [scanBle, setScanBle] = useState(true);
  const [scanClassic, setScanClassic] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

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

  const handleScan = useCallback(() => {
    setScanning(true);
    setBleDevices([]);
    setClassicDevices([]);

    const shouldScanBle = scanMode === 'all' || scanMode === 'ble';
    const shouldScanClassic = scanMode === 'all' || scanMode === 'classic';

    console.log('[Printer] Starting scan — BLE:', shouldScanBle, 'Classic:', shouldScanClassic);

    if (shouldScanBle) {
      setTimeout(() => {
        console.log('[Printer] BLE devices found:', MOCK_BLE_DEVICES.length);
        setBleDevices(MOCK_BLE_DEVICES);
      }, 1500);
    }

    if (shouldScanClassic) {
      setTimeout(() => {
        console.log('[Printer] Classic devices found:', MOCK_CLASSIC_DEVICES.length);
        setClassicDevices(MOCK_CLASSIC_DEVICES);
      }, 2500);
    }

    setTimeout(() => {
      setScanning(false);
      console.log('[Printer] Scan complete');
    }, 3500);
  }, [scanMode]);

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
      Alert.alert('Connected', `Connected to ${device.name} via ${device.type === 'ble' ? 'BLE' : 'Classic Bluetooth'}`);
    }, 1500);
  }, [updatePrinter, updateSettings]);

  const handleDisconnect = useCallback(() => {
    console.log('[Printer] Disconnecting from', settings.printer.name);
    updatePrinter({ name: '', address: '' });
    updateSettings({ printerConnected: false });
  }, [updatePrinter, updateSettings, settings.printer.name]);

  const handleTestPrint = useCallback(() => {
    Alert.alert(
      'Test Print',
      `Sending test page to ${settings.printer.name} via ${settings.printer.type === 'ble' ? 'BLE' : 'Classic BT'}...\n\n(Bluetooth printing requires a development build)`
    );
  }, [settings.printer]);

  const getSignalBars = (rssi?: number): number => {
    if (!rssi) return 0;
    if (rssi > -50) return 3;
    if (rssi > -70) return 2;
    return 1;
  };

  const allDevices = [
    ...(scanMode === 'classic' ? [] : bleDevices),
    ...(scanMode === 'ble' ? [] : classicDevices),
  ];
  const hasDevices = allDevices.length > 0;

  const isIOS = Platform.OS === 'ios';

  const updateScanMode = useCallback((ble: boolean, classic: boolean) => {
    setScanBle(ble);
    setScanClassic(classic);
    if (ble && classic) setScanMode('all');
    else if (ble) setScanMode('ble');
    else if (classic) setScanMode('classic');
    else {
      setScanBle(true);
      setScanClassic(true);
      setScanMode('all');
    }
  }, []);

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
        <Text style={styles.title}>Printer Setup</Text>
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
                <Text style={styles.testButtonText}>Test</Text>
              </Pressable>
              <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
                <Text style={styles.disconnectText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.protocolSection}>
          <Text style={styles.sectionLabel}>SCAN PROTOCOLS</Text>
          <View style={styles.protocolCard}>
            <View style={styles.protocolRow}>
              <View style={styles.protocolLeft}>
                <View style={[styles.protocolIcon, styles.protocolIconBle]}>
                  <Radio size={14} color="#5B9BD5" />
                </View>
                <View>
                  <Text style={styles.protocolName}>Bluetooth LE</Text>
                  <Text style={styles.protocolDesc}>Low energy, iOS & Android</Text>
                </View>
              </View>
              <Switch
                value={scanBle}
                onValueChange={(val) => updateScanMode(val, scanClassic)}
                trackColor={{ false: Colors.border, true: 'rgba(91,155,213,0.4)' }}
                thumbColor={scanBle ? '#5B9BD5' : Colors.textMuted}
              />
            </View>

            <View style={styles.protocolDivider} />

            <View style={styles.protocolRow}>
              <View style={styles.protocolLeft}>
                <View style={[styles.protocolIcon, styles.protocolIconClassic]}>
                  <Bluetooth size={14} color="#C084FC" />
                </View>
                <View>
                  <Text style={styles.protocolName}>Classic Bluetooth</Text>
                  <Text style={styles.protocolDesc}>
                    {isIOS ? 'iOS (MFi printers)' : 'Android supported'}
                  </Text>
                </View>
              </View>
              <Switch
                value={scanClassic}
                onValueChange={(val) => updateScanMode(scanBle, val)}
                trackColor={{ false: Colors.border, true: 'rgba(192,132,252,0.4)' }}
                thumbColor={scanClassic ? '#C084FC' : Colors.textMuted}
              />
            </View>
          </View>

          {isIOS && scanClassic && (
            <View style={styles.iosNotice}>
              <AlertTriangle size={13} color="#F59E0B" />
              <Text style={styles.iosNoticeText}>
                Classic BT on iOS requires MFi-certified printers. Most thermal printers use BLE.
              </Text>
            </View>
          )}
        </View>

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
                <Text style={styles.scanButtonText}>Scanning...</Text>
              </View>
            ) : (
              <View style={styles.scanButtonContent}>
                <BluetoothSearching size={18} color={Colors.gold} />
                <Text style={styles.scanButtonText}>Scan for Printers</Text>
              </View>
            )}
          </Pressable>

          {Platform.OS === 'web' && (
            <View style={styles.webNotice}>
              <Wifi size={13} color={Colors.textSecondary} />
              <Text style={styles.webNoticeText}>
                Bluetooth is simulated in web preview. Use a development build for real connectivity.
              </Text>
            </View>
          )}
        </View>

        {hasDevices && (
          <View style={styles.devicesSection}>
            {bleDevices.length > 0 && scanMode !== 'classic' && (
              <>
                <View style={styles.deviceSectionHeader}>
                  <Radio size={13} color="#5B9BD5" />
                  <Text style={[styles.deviceSectionTitle, { color: '#5B9BD5' }]}>
                    BLE Devices ({bleDevices.length})
                  </Text>
                </View>
                {bleDevices.map(renderDevice)}
              </>
            )}

            {classicDevices.length > 0 && scanMode !== 'ble' && (
              <>
                <View style={[styles.deviceSectionHeader, bleDevices.length > 0 && { marginTop: 14 }]}>
                  <Bluetooth size={13} color="#C084FC" />
                  <Text style={[styles.deviceSectionTitle, { color: '#C084FC' }]}>
                    Classic BT Devices ({classicDevices.length})
                  </Text>
                </View>
                {classicDevices.map(renderDevice)}
              </>
            )}
          </View>
        )}

        {!scanning && !hasDevices && !settings.printerConnected && (
          <View style={styles.emptyState}>
            <Signal size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Printers Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Scan for Printers" to search for nearby Bluetooth thermal printers.
            </Text>
            <View style={styles.compatRow}>
              <View style={styles.compatItem}>
                <Smartphone size={14} color={Colors.textMuted} />
                <Text style={styles.compatText}>Works on iOS & Android</Text>
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
  protocolSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  protocolCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  protocolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  protocolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolIconBle: {
    backgroundColor: 'rgba(91,155,213,0.12)',
  },
  protocolIconClassic: {
    backgroundColor: 'rgba(192,132,252,0.12)',
  },
  protocolName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  protocolDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  protocolDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  iosNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  iosNoticeText: {
    color: '#F59E0B',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
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
  deviceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 2,
  },
  deviceSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
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
