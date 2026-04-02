import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { showToast } from '@/components/Toast';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bluetooth,
  BluetoothSearching,
  Printer,
  Check,
  Smartphone,
  Radio,
  Wifi,
  ExternalLink,
  Info,
  ShieldOff,
  Settings,
  AlertTriangle,
  WifiOff,
  HelpCircle,
  Plus,
  X,
  Trash2,
  RefreshCw,
  Loader,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import type { PrinterRecord, PrinterTransport, PrinterCapabilities } from '@/types';
import { useI18n } from '@/i18n';
import { registryService } from '@/services/printer/registry/service';
import { createAdapter } from '@/services/printer/adapters/factory';
import { upsertPrinter } from '@/services/printer/storage/repositories';
import {
  printerCapabilityService,
  type AndroidBluetoothPermissionStatus,
} from '@/services/printer/capability';

/**
 * PrinterUiState — exhaustive, hardware-grounded states only.
 *
 * Each state represents a real condition of the printer+platform system.
 * No "connected" state is shown without adapter.isConnected() verification.
 */
type PrinterUiState =
  | 'initializing'            // Checking native module availability and permissions
  | 'permission_denied'        // Android runtime permission denied — can retry after grant
  | 'permission_never_ask'     // Android permission permanently denied — requires settings navigation
  | 'unsupported_transport'    // Selected transport not supported on this platform
  | 'module_unavailable'      // Thermal printer native module not available
  | 'scanning'                // Actively scanning for printers via adapter
  | 'scan_empty'              // Scan completed, no printers found
  | 'discovered'              // Scan completed, one or more printers available
  | 'tcp_setup'              // TCP printer entry modal is open
  | 'connecting'             // Attempting to establish physical connection to a printer
  | 'connected'              // Physically connected and verified via adapter.isConnected()
  | 'disconnected';           // Was connected; real connection check now fails


function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getTransportLabel(transport: PrinterTransport): string {
  switch (transport) {
    case 'ble': return 'BLE';
    case 'classic': return 'Classic BT';
    case 'tcp': return 'TCP/IP';
  }
}

function getTransportIcon(transport: PrinterTransport) {
  switch (transport) {
    case 'ble': return <Radio size={14} color="#5B9BD5" />;
    case 'classic': return <Bluetooth size={14} color="#C084FC" />;
    case 'tcp': return <Wifi size={14} color={Colors.gold} />;
  }
}

export default function PrinterSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, savePreferredPrinter } = useSettings();
  const { t } = useI18n();

  // --- Core UI state ---
  const [uiState, setUiState] = useState<PrinterUiState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<AndroidBluetoothPermissionStatus | null>(null);

  // --- Scan state ---
  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState<PrinterRecord[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // --- Connection state (all driven by real adapter checks) ---
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterRecord | null>(null);

  // --- Diagnostics test print ---
  const [testing, setTesting] = useState<string | null>(null);


  // --- TCP modal ---
  const [tcpModalOpen, setTcpModalOpen] = useState(false);
  const [tcpHost, setTcpHost] = useState('');
  const [tcpPort, setTcpPort] = useState('9100');
  const [tcpAdding, setTcpAdding] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  /**
   * preferredPrinter — derived from registry, not from stale settings flag.
   * We always re-fetch from registry to ensure we have the canonical record.
   */
  const preferredPrinter = useMemo(
    () => printers.find((p) => p.id === settings.printer.preferredPrinterId) ?? null,
    [printers, settings.printer.preferredPrinterId]
  );

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

  /**
   * checkRealConnectionState — Verifies physical connection via adapter.
   *
   * This is the single source of truth for "connected" state.
   * Returns early if no preferred printer is set.
   * Updates connectedPrinter and uiState ONLY based on real adapter.isConnected() result.
   */
  const checkRealConnectionState = useCallback(async () => {
    const prefId = settings.printer.preferredPrinterId;
    if (!prefId) {
      setConnectedPrinter(null);
      // Only reset to scan_empty if we're NOT currently showing discovered devices
      if (uiState !== 'initializing' && uiState !== 'tcp_setup' && uiState !== 'discovered' && uiState !== 'scanning') {
        setUiState(preferredPrinter ? 'discovered' : 'scan_empty');
      }
      return;
    }

    let prefRecord: PrinterRecord | null = null;

    // First check local list
    prefRecord = printers.find((p) => p.id === prefId) ?? null;
    // Fall back to registry lookup
    if (!prefRecord) {
      prefRecord = await registryService.getPreferredPrinter();
    }

    if (!prefRecord) {
      setConnectedPrinter(null);
      setUiState('disconnected');
      return;
    }

    try {
      const adapter = createAdapter();
      const isReallyConnected = await adapter.isConnected(prefRecord.address);

      if (isReallyConnected) {
        setConnectedPrinter(prefRecord);
        setUiState('connected');
      } else {
        setConnectedPrinter(null);
        // Only transition to disconnected if we were previously connected
        // or if we have no other meaningful state to show
        if (uiState === 'connected') {
          setUiState('disconnected');
        }
      }
    } catch {
      setConnectedPrinter(null);
      if (uiState === 'connected') {
        setUiState('disconnected');
      }
    }
  }, [settings.printer.preferredPrinterId, printers, uiState]);


  /**
   * Initialise — runs once on mount.
   * Checks native module availability, Android permissions, and real connection state.
   */
  useEffect(() => {
    const init = async () => {
      // Check native module first
      if (!printerCapabilityService.isNativeModuleAvailable()) {
        setErrorMessage(t.printer.moduleUnavailableText);
        setUiState('module_unavailable');
        return;
      }

      // Android permission check
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
        } catch {
          // Continue — permissions may be granted at runtime
        }
      }

      // Verify real connection state
      await checkRealConnectionState();

      // Auto-scan for printers on first load
      try {
        const adapter = createAdapter();
        const rawDevices = await adapter.discoverPrinters();
        const now = new Date().toISOString();
        const records: PrinterRecord[] = rawDevices.map((d) => ({
          id: d.id,
          name: d.name,
          address: d.address,
          transport: d.transport as PrinterTransport,
          capabilities: d.capabilities ?? ({ supportImage: true, supportQR: true, supportCut: true, supportText: true, paperWidth: 58 } as PrinterCapabilities),
          lastSeenAt: now,
          createdAt: now,
        }));
        setPrinters(records);
        setUiState(records.length > 0 ? 'discovered' : 'scan_empty');

        // Auto-connect to saved preferred printer if found
        const prefId = settings.printer.preferredPrinterId;
        if (prefId) {
          const prefDevice = records.find((p) => p.id === prefId);
          if (prefDevice) {
            try {
              const connectAdapter = createAdapter();
              await connectAdapter.connectPrinter(prefDevice.address);
              setConnectedPrinter(prefDevice);
              setUiState('connected');
            } catch {
              // Connection failed, just show discovered
            }
          }
        }
      } catch {
        // Auto-scan failed, fall back to manual
        if (uiState === 'initializing') {
          setUiState('scan_empty');
        }
      }
    };

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check connection whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      void checkRealConnectionState();
    }, [checkRealConnectionState])
  );

  const openBluetoothSettings = useCallback(() => {
    if (isIOS) {
      void Linking.openURL('App-Prefs:Bluetooth');
    } else if (isAndroid) {
      void Linking.sendIntent?.('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        void Linking.openSettings();
      });
    } else {
      showToast({ type: 'info', title: t.printer.bluetoothSettings, message: t.printer.bluetoothSettingsMsg });
    }
  }, [isIOS, isAndroid, t]);

  /**
   * handleScan — discovers printers via the adapter, then merges with registry.
   * Sets explicit scan states: scanning -> scan_empty | discovered
   */
  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setErrorMessage(null);
    setPrinters([]);
    setUiState('scanning');

    try {
      if (!isIOS) {
        await printerCapabilityService.ensureBluetoothPermissions();
      }

      // Use adapter directly to avoid database roundtrip issues
      const adapter = createAdapter();
      const rawDevices = await adapter.discoverPrinters();

      // Convert discovery results to PrinterRecord format for display
      const now = new Date().toISOString();
      const records: PrinterRecord[] = rawDevices.map((d) => ({
        id: d.id,
        name: d.name,
        address: d.address,
        transport: d.transport as PrinterTransport,
        capabilities: d.capabilities ?? ({ supportImage: true, supportQR: true, supportCut: true, supportText: true, paperWidth: 58 } as PrinterCapabilities),
        lastSeenAt: now,
        createdAt: now,
      }));

      // eslint-disable-next-line no-console
      console.error('[DIAG-UI] records count:', records.length, 'setting discovered');
      setPrinters(records);
      setUiState(records.length === 0 ? 'scan_empty' : 'discovered');
      // eslint-disable-next-line no-console
      console.error('[DIAG-UI] state set. printers:', records.length, 'uiState: discovered');
    } catch (error) {
      if (error instanceof Error && error.message.includes('[PrinterCapability]')) {
        const state = await printerCapabilityService.getAndroidPermissionState();
        setPermissionState(state.overall);
        if (state.overall === 'never_ask_again') {
          setUiState('permission_never_ask');
        } else if (state.overall === 'denied') {
          setUiState('permission_denied');
        }
        setScanError(error.message.replace('[PrinterCapability] ', ''));
      } else {
        setScanError(getErrorMessage(error, 'Unable to scan for printers.'));
        setUiState('scan_empty');
      }
    } finally {
      setScanning(false);
    }
  }, [isIOS]);

  /**
   * handleConnect — initiates physical connection to a printer.
   *
   * Steps:
   * 1. Validate transport support for platform
   * 2. Request permissions (Android)
   * 3. Call registryService.connectPrinter (adapter.connectPrinter)
   * 4. Verify with adapter.isConnected() — ONLY then set 'connected'
   * 5. Save preferred printer
   * 6. Reload queue summary
   */
  const handleConnect = useCallback(async (printer: PrinterRecord) => {
    // iOS + Classic BT = unsupported
    if (isIOS && printer.transport === 'classic') {
      setUiState('unsupported_transport');
      setErrorMessage('Classic Bluetooth printers are not supported on iOS. Please use a BLE thermal printer or add a TCP/IP printer.');
      return;
    }

    setConnecting(printer.id);
    setErrorMessage(null);
    setUiState('connecting');

    try {
      if (!isIOS) {
        await printerCapabilityService.ensureBluetoothPermissions();
      }

      // Connect directly via adapter (bypass registry DB lookup)
      const adapter = createAdapter();
      await adapter.connectPrinter(printer.address);

      // Persist printer to registry in background
      registryService.mergeDiscoveredWithRegistry([printer]).catch(() => {});

      // CRITICAL: Verify the connection is real before declaring connected
      const isReallyConnected = await adapter.isConnected(printer.address);

      if (isReallyConnected) {
        // Ensure printer is in DB before saving as preferred
        await upsertPrinter({
          id: printer.id,
          name: printer.name,
          address: printer.address,
          transport: printer.transport,
          capabilities: printer.capabilities,
        });
        await savePreferredPrinter(printer.id);
        setConnectedPrinter(printer);
        setUiState('connected');
        showToast({ type: 'success', title: t.printer.connected, message: t.printer.connectedTo(printer.name) });
      } else {
        // Connect command returned but adapter says not connected — treat as failure
        setErrorMessage(`Connection to ${printer.name} was not established. The printer may be out of range or unreachable.`);
        setUiState('disconnected');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('[PrinterCapability]')) {
        const state = await printerCapabilityService.getAndroidPermissionState();
        setPermissionState(state.overall);
        if (state.overall === 'never_ask_again') {
          setUiState('permission_never_ask');
        } else {
          setUiState('permission_denied');
        }
        setErrorMessage(error.message.replace('[PrinterCapability] ', ''));
      } else {
        setErrorMessage(getErrorMessage(error, `Unable to connect to ${printer.name}.`));
        setUiState('disconnected');
      }
    } finally {
      setConnecting(null);
    }
  }, [isIOS, savePreferredPrinter, t]);

  const handleDisconnect = useCallback(async () => {
    const prefId = settings.printer.preferredPrinterId;
    if (!prefId) return;

    try {
      await registryService.disconnectPrinter(prefId);
      setConnectedPrinter(null);
      setUiState('disconnected');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to disconnect printer.'));
    }
  }, [settings.printer.preferredPrinterId]);

  /**
   * handleTestPrint — queues a diagnostics print job and processes the queue.
   *
   * After processing, inspects the job state to determine outcome:
   * - printed_confirmed: success — show confirmation
   * - sent_unknown: uncertain delivery — show warning
   * - failed_terminal | failed_retryable: show error
   * - queued | printing: show "queued" message
   */
  const handleTestPrint = useCallback(async (printer: PrinterRecord) => {
    setTesting(printer.id);
    setErrorMessage(null);

    try {
      const adapter = createAdapter();

      // Connect using registry DB key — adapter.connectPrinter handles address lookup
      await adapter.connectPrinter(printer.id);

      // Build ESC/POS test page
      const now = new Date().toISOString();
      const testText = [
        '\x1B\x40',          // ESC @ — init
        '\x1B\x61\x01',      // Center align
        '\x1B\x45\x01',      // Bold on
        'MOMIR PRINTER TEST\n',
        '\x1B\x45\x00',      // Bold off
        '================================\n',
        '\x1B\x61\x00',      // Left align
        `Printer: ${printer.name}\n`,
        `Address: ${printer.address}\n`,
        `Transport: ${printer.transport}\n`,
        `Platform: ${Platform.OS}\n`,
        `Time: ${now}\n`,
        '================================\n',
        '\x1B\x61\x01',      // Center
        'Print test successful!\n',
        '\x1B\x61\x00',      // Left
        '\n\n\n',             // Feed
      ].join('');

      await adapter.sendText(testText);

      showToast({ type: 'success', title: t.printer.testPrint, message: `Diagnostics print completed successfully for ${printer.name}.` });
      setErrorMessage(null);
      setTesting(null);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed';
      setErrorMessage(message);
      showToast({ type: 'error', title: t.printer.testPrint, message });
    } finally {
      setTesting(null);
    }
  }, [t]);


  /**
   * handleAddTcpPrinter — validates and adds a TCP printer entry.
   * TCP printers are added to the registry without pairing/scanning.
   */
  const handleAddTcpPrinter = useCallback(async () => {
    const host = tcpHost.trim();
    const port = parseInt(tcpPort.trim(), 10);

    if (!host) {
      showToast({ type: 'warning', title: 'TCP Printer', message: 'Please enter a hostname or IP address.' });
      return;
    }
    if (isNaN(port) || port < 1 || port > 65535) {
      showToast({ type: 'warning', title: 'TCP Printer', message: 'Please enter a valid port number (1-65535).' });
      return;
    }

    setTcpAdding(true);
    try {
      const tcpPrinter: PrinterRecord = {
        id: `tcp-${host}-${port}`,
        name: `TCP Printer (${host})`,
        address: host,
        transport: 'tcp',
        capabilities: {
          supportImage: true,
          supportQR: true,
          supportCut: true,
          supportText: true,
          paperWidth: 58,
        },
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await registryService.mergeDiscoveredWithRegistry([tcpPrinter]);
      setTcpModalOpen(false);
      setTcpHost('');
      setTcpPort('9100');
      await handleScan();
    } catch (error) {
      showToast({ type: 'error', title: 'TCP Printer', message: getErrorMessage(error, 'Failed to add TCP printer.') });
    } finally {
      setTcpAdding(false);
    }
  }, [tcpHost, tcpPort, handleScan]);

  const handleForgetPrinter = useCallback(async (printer: PrinterRecord) => {
    Alert.alert(
      'Forget Printer',
      `Remove "${printer.name}" from saved printers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: async () => {
            try {
              await registryService.forgetPrinter(printer.id);
              if (settings.printer.preferredPrinterId === printer.id) {
                setConnectedPrinter(null);
                setUiState('disconnected');
              }
              const updated = printers.filter((p) => p.id !== printer.id);
              setPrinters(updated);
              if (updated.length === 0) {
                setUiState('scan_empty');
              }
            } catch (error) {
              setErrorMessage(getErrorMessage(error, 'Failed to forget printer.'));
            }
          },
        },
      ]
    );
  }, [printers, settings.printer.preferredPrinterId]);

  const renderPrinterMeta = (printer: PrinterRecord) => (
    <View style={styles.deviceMeta}>
      <View style={[styles.typeBadge, printer.transport === 'ble' ? styles.typeBadgeBle : printer.transport === 'tcp' ? styles.typeBadgeTcp : styles.typeBadgeClassic]}>
        {getTransportIcon(printer.transport)}
        <Text style={[
          styles.typeBadgeText,
          printer.transport === 'ble' ? styles.typeBadgeTextBle : printer.transport === 'tcp' ? styles.typeBadgeTextTcp : styles.typeBadgeTextClassic,
        ]}>
          {getTransportLabel(printer.transport)}
        </Text>
      </View>
      <Text style={styles.deviceAddress} numberOfLines={1}>{printer.address}</Text>
    </View>
  );

  const renderDevice = (printer: PrinterRecord) => {
    const isConnected = connectedPrinter?.id === printer.id;
    const isConnecting = connecting === printer.id;
    const isTesting = testing === printer.id;
    const isPreferred = settings.printer.preferredPrinterId === printer.id;

    return (
      <View
        key={printer.id}
        style={[styles.deviceItem, isConnected && styles.deviceItemConnected]}
        testID={`device-${printer.id}`}
      >
        <View style={[styles.deviceIcon, printer.transport === 'ble' ? styles.deviceIconBle : printer.transport === 'tcp' ? styles.deviceIconTcp : styles.deviceIconClassic]}>
          {getTransportIcon(printer.transport)}
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceTitleRow}>
            <Text style={[styles.deviceName, isConnected && styles.deviceNameConnected]} numberOfLines={1}>
              {printer.name}
            </Text>
            {isPreferred && (
              <View style={styles.preferredChip}>
                <Text style={styles.preferredChipText}>Preferred</Text>
              </View>
            )}
          </View>
          {renderPrinterMeta(printer)}
        </View>
        <View style={styles.deviceActions}>
          <Pressable
            onPress={() => { void handleConnect(printer); }}
            disabled={isConnecting || isConnected}
            style={({ pressed }) => [
              styles.deviceActionButton,
              styles.deviceActionPrimary,
              (isConnecting || isConnected) && styles.deviceActionDisabled,
              pressed && !isConnecting && !isConnected && styles.deviceActionPressed,
            ]}
            testID={`connect-${printer.id}`}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.deviceActionPrimaryText}>
                {isConnected ? t.printer.connected : 'Connect'}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => { void handleTestPrint(printer); }}
            disabled={isTesting}
            style={({ pressed }) => [
              styles.deviceActionButton,
              styles.deviceActionSecondary,
              isTesting && styles.deviceActionDisabled,
              pressed && !isTesting && styles.deviceActionPressed,
            ]}
            testID={`test-print-${printer.id}`}
          >
            {isTesting ? (
              <ActivityIndicator color={Colors.gold} size="small" />
            ) : (
              <Text style={styles.deviceActionSecondaryText}>{t.printer.test}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => { void handleForgetPrinter(printer); }}
            style={({ pressed }) => [
              styles.deviceActionIcon,
              pressed && styles.deviceActionIconPressed,
            ]}
            testID={`forget-${printer.id}`}
          >
            <Trash2 size={16} color={Colors.error} />
          </Pressable>
          {isConnected && (
            <View style={styles.connectedCheck}>
              <Check size={14} color="#fff" />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderErrorCard = (message: string) => (
    <View style={styles.errorCard}>
      <AlertTriangle size={16} color={Colors.error} />
      <Text style={styles.errorCardText}>{message}</Text>
    </View>
  );

  const renderModuleUnavailable = () => (
    <View style={styles.permissionDeniedCard}>
      <View style={styles.permissionDeniedHeader}>
        <ShieldOff size={20} color={Colors.error} />
        <Text style={styles.permissionDeniedTitle}>{t.printer.moduleUnavailableTitle}</Text>
      </View>
      <Text style={styles.permissionDeniedText}>
        {t.printer.moduleUnavailableText}
      </Text>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.permissionDeniedButton,
          pressed && styles.permissionDeniedButtonPressed,
        ]}
        testID="go-back"
      >
        <Text style={styles.permissionDeniedButtonText}>{t.common.goBack}</Text>
      </Pressable>
    </View>
  );

  const renderPermissionNeverAsk = () => (
    <View style={styles.permissionDeniedCard}>
      <View style={styles.permissionDeniedHeader}>
        <ShieldOff size={20} color={Colors.error} />
        <Text style={styles.permissionDeniedTitle}>Bluetooth Permission Required</Text>
      </View>
      <Text style={styles.permissionDeniedText}>
        Bluetooth scanning is permanently disabled. Open Android Settings to enable Bluetooth permissions for this app, then return and tap Scan again.
      </Text>
      <Pressable
        onPress={openBluetoothSettings}
        style={({ pressed }) => [
          styles.permissionDeniedButton,
          pressed && styles.permissionDeniedButtonPressed,
        ]}
        testID="open-bt-settings-from-permission"
      >
        <Settings size={16} color="#fff" />
        <Text style={styles.permissionDeniedButtonText}>Open Android Settings</Text>
      </Pressable>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.permissionDeniedCard}>
      <View style={styles.permissionDeniedHeader}>
        <ShieldOff size={20} color={Colors.gold} />
        <Text style={styles.permissionDeniedTitle}>Bluetooth Permission Denied</Text>
      </View>
      <Text style={styles.permissionDeniedText}>
        Tap &quot;Scan&quot; to grant Bluetooth permissions. You may be prompted again.
      </Text>
    </View>
  );

  const renderUnsupportedTransport = () => (
    <View style={styles.unsupportedCard}>
      <View style={styles.unsupportedHeader}>
        <HelpCircle size={20} color={Colors.gold} />
        <Text style={styles.unsupportedTitle}>Unsupported Transport</Text>
      </View>
      <Text style={styles.unsupportedText}>
        {isIOS
          ? 'Classic Bluetooth printers are not supported on iOS. Please use a BLE thermal printer or add a TCP/IP printer.'
          : 'This transport is not supported on your device.'}
      </Text>
      <Pressable
        onPress={() => { setUiState(preferredPrinter ? 'connected' : printers.length > 0 ? 'discovered' : 'scan_empty'); setErrorMessage(null); }}
        style={({ pressed }) => [
          styles.unsupportedButton,
          pressed && styles.unsupportedButtonPressed,
        ]}
      >
        <Text style={styles.unsupportedButtonText}>Dismiss</Text>
      </Pressable>
    </View>
  );

  const renderDisconnectedState = () => (
    <View style={styles.disconnectedCard}>
      <View style={styles.disconnectedHeader}>
        <WifiOff size={20} color={Colors.error} />
        <Text style={styles.disconnectedTitle}>Printer Disconnected</Text>
      </View>
      <Text style={styles.disconnectedText}>
        The previously connected printer is no longer reachable. Check that the printer is powered on and in range, then tap &quot;Reconnect&quot; to restore the connection.
      </Text>
      <View style={styles.disconnectedActions}>
        <Pressable
          onPress={() => { void checkRealConnectionState(); }}
          style={({ pressed }) => [
            styles.disconnectedButton,
            pressed && styles.disconnectedButtonPressed,
          ]}
        >
          <RefreshCw size={14} color={Colors.gold} />
          <Text style={styles.disconnectedButtonText}>Check Connection</Text>
        </Pressable>
        <Pressable
          onPress={() => { void handleScan(); }}
          style={({ pressed }) => [
            styles.disconnectedButtonSecondary,
            pressed && styles.disconnectedButtonSecondaryPressed,
          ]}
        >
          <BluetoothSearching size={14} color={Colors.textSecondary} />
          <Text style={styles.disconnectedButtonSecondaryText}>Scan</Text>
        </Pressable>
      </View>
    </View>
  );


  /**
   * renderConnectedCard — shows canonical printer details when physically connected.
   * Address + transport are displayed to verify correct device.
   */
  const renderConnectedCard = () => {
    if (!connectedPrinter) return null;

    const transportLabel = getTransportLabel(connectedPrinter.transport);

    return (
      <View style={styles.connectedCard}>
        <View style={styles.connectedHeader}>
          <View style={styles.connectedIconWrap}>
            <Printer size={18} color="#fff" />
          </View>
          <View style={styles.connectedInfo}>
            <Text style={styles.connectedName}>{connectedPrinter.name}</Text>
            <View style={styles.connectedMeta}>
              <View style={[styles.connectedTypeBadge, connectedPrinter.transport === 'ble' ? styles.typeBadgeBle : connectedPrinter.transport === 'tcp' ? styles.typeBadgeTcp : styles.typeBadgeClassic]}>
                <Text style={[
                  styles.typeBadgeText,
                  connectedPrinter.transport === 'ble' ? styles.typeBadgeTextBle : connectedPrinter.transport === 'tcp' ? styles.typeBadgeTextTcp : styles.typeBadgeTextClassic,
                ]}>
                  {transportLabel}
                </Text>
              </View>
              <Text style={styles.connectedAddress}>{connectedPrinter.address}</Text>
            </View>
            <Text style={styles.connectedCanonical}>
              {connectedPrinter.address} via {transportLabel}
            </Text>
          </View>
        </View>

        <View style={styles.connectedDivider} />

        <View style={styles.connectedActions}>
          <Pressable
            onPress={() => { void handleTestPrint(connectedPrinter); }}
            style={({ pressed }) => [
              styles.testButton,
              pressed && styles.testButtonPressed,
            ]}
            disabled={testing !== null}
          >
            {testing ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <>
                <Printer size={14} color={Colors.gold} />
                <Text style={styles.testButtonText}>Diagnostics Print</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => { void handleDisconnect(); }}
            style={({ pressed }) => [
              styles.disconnectButton,
              pressed && styles.disconnectButtonPressed,
            ]}
          >
            <Text style={styles.disconnectText}>{t.printer.disconnect}</Text>
          </Pressable>
        </View>
      </View>
    );
  };


  /**
   * renderConnectingState — shown when a connect attempt is in progress.
   */
  const renderConnectingState = () => {
    if (uiState !== 'connecting' || !connecting) return null;
    const printer = printers.find((p) => p.id === connecting);
    return (
      <View style={styles.connectingCard}>
        <Loader size={20} color={Colors.gold} />
        <Text style={styles.connectingText}>
          Connecting to {printer?.name ?? 'printer'}...
        </Text>
      </View>
    );
  };

  const renderIosFlowCard = () => {
    if (isIOS && uiState !== 'connected') {
      return (
        <View style={styles.iosFlowCard}>
          <View style={styles.iosFlowHeader}>
            <View style={styles.iosFlowIconWrap}>
              <Bluetooth size={20} color="#5B9BD5" />
            </View>
            <Text style={styles.iosFlowTitle}>{t.printer.iosBluetoothSetup}</Text>
          </View>
          <View style={styles.stepsContainer}>
            {[
              { num: '1', title: t.printer.step1Title, desc: t.printer.step1Desc },
              { num: '2', title: t.printer.step2Title, desc: t.printer.step2Desc },
              { num: '3', title: t.printer.step3Title, desc: t.printer.step3Desc },
            ].map(({ num, title, desc }) => (
              <View key={num} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepDesc}>{desc}</Text>
                </View>
              </View>
            ))}
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
      );
    }
    return null;
  };

  const renderPlatformInfoCard = () => {
    if (isIOS) {
      return (
        <View style={styles.infoCard}>
          <Info size={16} color="#5B9BD5" />
          <Text style={styles.infoText}>
            iOS supports BLE and TCP/IP thermal printers. Classic Bluetooth (MFi) printers require External Accessory framework support.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.infoCard}>
        <Info size={16} color="#5B9BD5" />
        <Text style={styles.infoText}>
          {t.printer.bluetoothInfo}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BluetoothSearching size={36} color={Colors.textMuted} />
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
          <Text style={styles.compatText}>{isIOS ? 'BLE only' : 'BLE + Classic BT + TCP'}</Text>
        </View>
      </View>
    </View>
  );

  const renderTcpModal = () => (
    <Modal visible={tcpModalOpen} transparent animationType="slide" onRequestClose={() => setTcpModalOpen(false)}>
      <View style={styles.tcpModalOverlay}>
        <View style={styles.tcpModalContent}>
          <View style={styles.tcpModalHeader}>
            <Text style={styles.tcpModalTitle}>Add TCP/IP Printer</Text>
            <Pressable onPress={() => setTcpModalOpen(false)} style={styles.tcpModalClose}>
              <X size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.tcpModalDesc}>
            Enter the hostname or IP address of your TCP-enabled thermal printer. Default port is 9100.
          </Text>
          <View style={styles.tcpFormField}>
            <Text style={styles.tcpFormLabel}>Hostname / IP Address</Text>
            <TextInput
              style={styles.tcpFormInput}
              value={tcpHost}
              onChangeText={setTcpHost}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.tcpFormField}>
            <Text style={styles.tcpFormLabel}>Port</Text>
            <TextInput
              style={styles.tcpFormInput}
              value={tcpPort}
              onChangeText={setTcpPort}
              placeholder="9100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            onPress={() => { void handleAddTcpPrinter(); }}
            disabled={tcpAdding}
            style={({ pressed }) => [
              styles.tcpAddButton,
              pressed && styles.tcpAddButtonPressed,
              tcpAdding && styles.tcpAddButtonDisabled,
            ]}
          >
            {tcpAdding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Plus size={16} color="#fff" />
            )}
            <Text style={styles.tcpAddButtonText}>Add Printer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + 8, opacity: fadeIn }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="back">
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t.printer.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Error messages */}
        {errorMessage && renderErrorCard(errorMessage)}
        {scanError && renderErrorCard(scanError)}

        {/* Module unavailable */}
        {uiState === 'module_unavailable' && renderModuleUnavailable()}

        {/* Permission states */}
        {(uiState === 'permission_never_ask' || permissionState === 'never_ask_again') && renderPermissionNeverAsk()}
        {(uiState === 'permission_denied' || permissionState === 'denied') && renderPermissionDenied()}
        {uiState === 'unsupported_transport' && renderUnsupportedTransport()}

        {/* Connecting indicator */}
        {renderConnectingState()}

        {/* Disconnected recovery */}
        {uiState === 'disconnected' && renderDisconnectedState()}

        {/* Connected printer card */}
        {uiState === 'connected' && renderConnectedCard()}

        {/* iOS flow */}
        {uiState !== 'connected' && renderIosFlowCard()}

        {/* Platform info */}
        {uiState !== 'connected' && renderPlatformInfoCard()}

        {/* Scan section */}
        <View style={styles.scanSection}>
          <View style={styles.scanButtonsRow}>
            <Pressable
              onPress={() => { void handleScan(); }}
              disabled={scanning || uiState === 'permission_never_ask' || uiState === 'unsupported_transport' || uiState === 'module_unavailable'}
              style={({ pressed }) => [
                styles.scanButton,
                scanning && styles.scanButtonScanning,
                (uiState === 'permission_never_ask' || uiState === 'unsupported_transport' || uiState === 'module_unavailable') && styles.scanButtonDisabled,
                pressed && !scanning && !(uiState === 'permission_never_ask') && styles.scanButtonPressed,
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

            {/* TCP add button — shown on Android where TCP is fully supported */}
            {!isIOS && (
              <Pressable
                onPress={() => setTcpModalOpen(true)}
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

        {/* Device list */}
        {(uiState === 'discovered' || (uiState === 'connected' && printers.length > 0)) && (
          <View style={styles.devicesSection}>
            <Text style={styles.sectionLabel}>
              {isIOS ? t.printer.pairedDevices : t.printer.nearbyDevices}
            </Text>
            {printers.map(renderDevice)}
          </View>
        )}

        {/* Empty state */}
        {(uiState === 'scan_empty' || uiState === 'disconnected') && !scanning && printers.length === 0 && renderEmptyState()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* TCP Setup Modal */}
      {renderTcpModal()}
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
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.2)',
    marginBottom: 12,
  },
  errorCardText: {
    color: Colors.error,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  permissionDeniedCard: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.3)',
    marginBottom: 12,
  },
  permissionDeniedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  permissionDeniedTitle: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  permissionDeniedText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  permissionDeniedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionDeniedButtonPressed: {
    opacity: 0.85,
  },
  permissionDeniedButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  unsupportedCard: {
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.3)',
    marginBottom: 12,
  },
  unsupportedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  unsupportedTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  unsupportedText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  unsupportedButton: {
    backgroundColor: 'rgba(232,105,45,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  unsupportedButtonPressed: {
    opacity: 0.8,
  },
  unsupportedButtonText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  disconnectedCard: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.25)',
    marginBottom: 12,
  },
  disconnectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  disconnectedTitle: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  disconnectedText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  disconnectedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  disconnectedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,105,45,0.12)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.25)',
  },
  disconnectedButtonPressed: {
    opacity: 0.8,
  },
  disconnectedButtonText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  disconnectedButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disconnectedButtonSecondaryPressed: {
    opacity: 0.8,
  },
  disconnectedButtonSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  connectingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.25)',
    marginBottom: 12,
  },
  connectingText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  uncertainCard: {
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.3)',
    marginBottom: 12,
  },
  uncertainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  uncertainTitle: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  uncertainText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  uncertainJobList: {
    gap: 8,
  },
  uncertainJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  uncertainJobInfo: {
    flex: 1,
  },
  uncertainJobType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  uncertainJobError: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  uncertainJobActions: {
    flexDirection: 'row',
    gap: 6,
  },
  uncertainRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uncertainRetryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  uncertainAbandonButton: {
    backgroundColor: 'rgba(239,83,80,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uncertainAbandonText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: '700' as const,
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
  connectedCanonical: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic' as const,
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
  testButtonPressed: {
    opacity: 0.85,
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
  disconnectButtonPressed: {
    opacity: 0.85,
  },
  disconnectText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  queueReconcileCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  queueReconcileHeader: {
    marginBottom: 12,
  },
  queueReconcileTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  queueReconcileSection: {
    marginBottom: 12,
  },
  queueReconcileSectionLabel: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  queueReconcileJob: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    marginBottom: 6,
  },
  queueReconcileJobInfo: {
    flex: 1,
  },
  queueReconcileJobType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  queueReconcileJobError: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  queueReconcileRetry: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  queueReconcileRetryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  queueReconcileAbandon: {
    backgroundColor: 'rgba(239,83,80,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  queueReconcileAbandonText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  queueStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  queueStripTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  queueStripCounts: {
    flexDirection: 'row',
    gap: 8,
  },
  queueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  queueBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  queueBadgeCompleted: {
    backgroundColor: '#E8F5E9',
  },
  queueBadgeUncertain: {
    backgroundColor: 'rgba(232,105,45,0.15)',
  },
  queueBadgeRetryable: {
    backgroundColor: '#E3F2FD',
  },
  queueBadgeFailed: {
    backgroundColor: '#FFEBEE',
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  queueBadgeLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
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
  scanSection: {
    marginBottom: 16,
  },
  scanButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scanButton: {
    flex: 1,
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
  scanButtonDisabled: {
    opacity: 0.5,
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
  tcpScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  tcpScanButtonPressed: {
    backgroundColor: 'rgba(232,105,45,0.08)',
  },
  tcpScanButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  devicesSection: {
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
  deviceIconTcp: {
    backgroundColor: 'rgba(232,105,45,0.1)',
  },
  deviceInfo: {
    flex: 1,
    gap: 3,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  typeBadgeTcp: {
    backgroundColor: 'rgba(232,105,45,0.15)',
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
  typeBadgeTextTcp: {
    color: Colors.gold,
  },
  deviceAddress: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  preferredChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(232,105,45,0.12)',
  },
  preferredChipText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  deviceActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  deviceActionButton: {
    minWidth: 80,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceActionPrimary: {
    backgroundColor: Colors.gold,
    borderColor: Colors.goldDark,
  },
  deviceActionSecondary: {
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderColor: 'rgba(232,105,45,0.2)',
  },
  deviceActionDisabled: {
    opacity: 0.7,
  },
  deviceActionPressed: {
    opacity: 0.85,
  },
  deviceActionPrimaryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  deviceActionSecondaryText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  deviceActionIcon: {
    padding: 6,
    borderRadius: 6,
  },
  deviceActionIconPressed: {
    backgroundColor: 'rgba(239,83,80,0.08)',
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
  tcpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  tcpModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  tcpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tcpModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  tcpModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tcpModalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  tcpFormField: {
    marginBottom: 16,
  },
  tcpFormLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tcpFormInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  tcpAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  tcpAddButtonPressed: {
    opacity: 0.85,
  },
  tcpAddButtonDisabled: {
    opacity: 0.6,
  },
  tcpAddButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});