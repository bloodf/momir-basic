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
} from 'react-native';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import type { PrinterRecord } from '@/types';
import { useI18n } from '@/i18n';
import { registryService } from '@/services/printer/registry/service';
import { createAdapter } from '@/services/printer/adapters/factory';
import { createJob, getJobById } from '@/services/printer/storage/repositories';
import { getQueueSummary, processQueueForPrinter, retryJob } from '@/services/printer/queue/engine';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function PrinterSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, savePreferredPrinter } = useSettings();
  const { t } = useI18n();

  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState<PrinterRecord[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueSummary, setQueueSummary] = useState<{ pending: number; completed: number; failed: number; failedJobs: import('@/types').PrintJob[] } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const usesFakeAdapter = useMemo(() => {
    const adapter = createAdapter() as { setFailureMode?: () => void };
    return typeof adapter.setFailureMode === 'function';
  }, []);
  const preferredPrinter = useMemo(
    () => printers.find((printer) => printer.id === settings.printer.preferredPrinterId) ?? null,
    [printers, settings.printer.preferredPrinterId]
  );

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  useEffect(() => {
    if (!settings.printer.preferredPrinterId) {
      setQueueSummary(null);
      return;
    }
    void getQueueSummary(settings.printer.preferredPrinterId).then(setQueueSummary).catch(() => setQueueSummary(null));
  }, [settings.printer.preferredPrinterId, settings.printerConnected]);

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
      Alert.alert(t.printer.bluetoothSettings, t.printer.bluetoothSettingsMsg);
    }
  }, [isIOS, t]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setErrorMessage(null);

    try {
      const discovered = await registryService.discoverPrinters();
      const merged = await registryService.mergeDiscoveredWithRegistry(
        discovered.map((printer) => ({
          ...printer,
          lastSeenAt: new Date().toISOString(),
        }))
      );
      setPrinters(merged);
      setStatusMessage(
        merged.length > 0
          ? `Found ${merged.length} printer${merged.length === 1 ? '' : 's'}.`
          : null
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to scan for printers.'));
      setStatusMessage(null);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void handleScan();
  }, [handleScan]);

  const handleConnect = useCallback(async (printer: PrinterRecord) => {
    setConnecting(printer.id);
    setErrorMessage(null);

    try {
      await registryService.connectPrinter(printer.id);
      await savePreferredPrinter(printer.id);
      updateSettings({ printerConnected: true });
      setStatusMessage(`Connected to ${printer.name}.`);
      Alert.alert(t.printer.connected, t.printer.connectedTo(printer.name));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, `Unable to connect to ${printer.name}.`));
      setStatusMessage(null);
    } finally {
      setConnecting(null);
    }
  }, [savePreferredPrinter, t, updateSettings]);

  const handleDisconnect = useCallback(async () => {
    if (!settings.printer.preferredPrinterId) {
      updateSettings({ printerConnected: false });
      return;
    }

    try {
      await registryService.disconnectPrinter(settings.printer.preferredPrinterId);
      setStatusMessage('Printer disconnected.');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to disconnect printer.'));
      setStatusMessage(null);
    } finally {
      updateSettings({ printerConnected: false });
    }
  }, [settings.printer.preferredPrinterId, updateSettings]);

  const handleTestPrint = useCallback(async (printer: PrinterRecord) => {
    setTesting(printer.id);
    setErrorMessage(null);

    try {
      const jobId = `diag-${Date.now()}`;
      await createJob({
        id: jobId,
        printerId: printer.id,
        documentType: 'diagnostics',
        payload: JSON.stringify({
          appName: 'Rork',
          platform: Platform.OS,
          transport: printer.transport,
          paperWidth: settings.printer.paperWidth,
          timestamp: new Date().toISOString(),
        }),
      });

      await processQueueForPrinter(printer.id);

      const [job, summary] = await Promise.all([
        getJobById(jobId),
        getQueueSummary(printer.id),
      ]);
      setQueueSummary(summary);

      if (job?.state === 'completed') {
        const message = `Completed diagnostics print for ${printer.name}.`;
        setStatusMessage(message);
        Alert.alert(t.printer.testPrint, message);
        return;
      }

      if (job?.state === 'failed_manual' || job?.state === 'retry_wait') {
        const message = job.lastError ?? `Unable to complete diagnostics print for ${printer.name}.`;
        setErrorMessage(message);
        setStatusMessage(null);
        Alert.alert(t.printer.testPrint, message);
        return;
      }

      const message = `Queued diagnostics print for ${printer.name}.`;
      setStatusMessage(message);
      Alert.alert(t.printer.testPrint, message);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to queue diagnostics print.'));
      setStatusMessage(null);
    } finally {
      setTesting(null);
    }
  }, [settings.printer.paperWidth, t]);

  const handleRetryJob = useCallback(async (jobId: string) => {
    try {
      await retryJob(jobId);
      if (settings.printer.preferredPrinterId) {
        const summary = await getQueueSummary(settings.printer.preferredPrinterId);
        setQueueSummary(summary);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to retry job.'));
    }
  }, [settings.printer.preferredPrinterId]);

  const hasPrinters = printers.length > 0;

  const renderDevice = (printer: PrinterRecord) => {
    const isConnected = settings.printer.preferredPrinterId === printer.id && settings.printerConnected;
    const isConnecting = connecting === printer.id;
    const isTesting = testing === printer.id;
    const isPreferred = settings.printer.preferredPrinterId === printer.id;
    const isBle = printer.transport === 'ble';
    const isTcp = printer.transport === 'tcp';
    const transportLabel = isBle ? 'BLE' : isTcp ? 'TCP' : 'Classic';

    return (
      <View
        key={printer.id}
        style={[
          styles.deviceItem,
          isPreferred && styles.deviceItemConnected,
        ]}
        testID={`device-${printer.id}`}
      >
        <View style={[styles.deviceIcon, isBle ? styles.deviceIconBle : styles.deviceIconClassic]}>
          {isBle ? (
            <Radio size={16} color={isConnected ? Colors.success : '#5B9BD5'} />
          ) : isTcp ? (
            <Wifi size={16} color={isConnected ? Colors.success : Colors.gold} />
          ) : (
            <Bluetooth size={16} color={isConnected ? Colors.success : '#C084FC'} />
          )}
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
          <View style={styles.deviceMeta}>
            <View style={[styles.typeBadge, isBle ? styles.typeBadgeBle : styles.typeBadgeClassic]}>
              <Text style={[styles.typeBadgeText, isBle ? styles.typeBadgeTextBle : styles.typeBadgeTextClassic]}>
                {transportLabel}
              </Text>
            </View>
            <Text style={styles.deviceAddress}>{printer.address}</Text>
          </View>
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
          {isConnected && (
            <View style={styles.connectedCheck}>
              <Check size={14} color="#fff" />
            </View>
          )}
        </View>
      </View>
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
        <View style={styles.preferredCard}>
          <View style={styles.preferredHeader}>
            <View style={styles.preferredIconWrap}>
              <Printer size={18} color="#fff" />
            </View>
            <View style={styles.preferredInfo}>
              <Text style={styles.preferredLabel}>Preferred Printer</Text>
              <Text style={styles.preferredName} numberOfLines={1}>
                {preferredPrinter?.name ?? 'No preferred printer selected'}
              </Text>
              <Text style={styles.preferredMeta} numberOfLines={1}>
                {preferredPrinter?.address ?? 'Connect a printer to save it for quick access'}
              </Text>
            </View>
            <View style={[
              styles.preferredStatusBadge,
              settings.printerConnected ? styles.preferredStatusConnected : styles.preferredStatusIdle,
            ]}>
              <Text style={styles.preferredStatusText} testID="preferred-printer-status">
                {settings.printerConnected ? t.printer.connected : t.printer.notConnected}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>{errorMessage}</Text>
          </View>
        )}

        {!errorMessage && statusMessage && (
          <View style={styles.successCard}>
            <Text style={styles.successCardText}>{statusMessage}</Text>
          </View>
        )}

        {preferredPrinter && settings.printerConnected && (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View style={styles.connectedIconWrap}>
                <Printer size={18} color="#fff" />
              </View>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedName}>{preferredPrinter.name}</Text>
                <View style={styles.connectedMeta}>
                  <View style={[
                    styles.connectedTypeBadge,
                    preferredPrinter.transport === 'ble' ? styles.typeBadgeBle : styles.typeBadgeClassic,
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      preferredPrinter.transport === 'ble' ? styles.typeBadgeTextBle : styles.typeBadgeTextClassic,
                    ]}>
                      {preferredPrinter.transport === 'ble' ? 'BLE' : preferredPrinter.transport === 'tcp' ? 'TCP' : 'Classic BT'}
                    </Text>
                  </View>
                  <Text style={styles.connectedAddress}>{preferredPrinter.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.connectedDivider} />

            <View style={styles.connectedActions}>
              <Pressable onPress={() => { void handleTestPrint(preferredPrinter); }} style={styles.testButton}>
                <Printer size={14} color={Colors.gold} />
                <Text style={styles.testButtonText}>{t.printer.test}</Text>
              </Pressable>
              <Pressable onPress={() => { void handleDisconnect(); }} style={styles.disconnectButton}>
                <Text style={styles.disconnectText}>{t.printer.disconnect}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {preferredPrinter && queueSummary && (
          <View style={styles.queueStatusCard}>
            <View style={styles.queueStatusHeader}>
              <Text style={styles.queueStatusTitle}>Print Queue</Text>
              <View style={styles.queueStatusCounts}>
                <View style={[styles.queueBadge, styles.queueBadgePending]}>
                  <Text style={styles.queueBadgeText} testID="queue-pending-count">{queueSummary.pending}</Text>
                </View>
                <Text style={styles.queueStatusLabel}>pending</Text>
                <View style={[styles.queueBadge, styles.queueBadgeCompleted]}>
                  <Text style={styles.queueBadgeText} testID="queue-completed-count">{queueSummary.completed}</Text>
                </View>
                <Text style={styles.queueStatusLabel}>done</Text>
                <View style={[styles.queueBadge, styles.queueBadgeFailed]}>
                  <Text style={styles.queueBadgeText} testID="queue-failed-count">{queueSummary.failed}</Text>
                </View>
                <Text style={styles.queueStatusLabel}>failed</Text>
              </View>
            </View>
            {queueSummary.failedJobs.length > 0 && (
              <View style={styles.queueFailedList}>
                {queueSummary.failedJobs.map((job) => (
                  <View key={job.id} style={styles.queueFailedItem}>
                    <View style={styles.queueFailedInfo}>
                      <Text style={styles.queueFailedType}>{job.documentType === 'card_receipt' ? 'Card Receipt' : 'Diagnostics'}</Text>
                      <Text style={styles.queueFailedError} numberOfLines={1}>{job.lastError ?? 'Unknown error'}</Text>
                    </View>
                    <Pressable
                      onPress={() => { void handleRetryJob(job.id); }}
                      style={styles.retryButton}
                      testID={`retry-print-job-${job.id}`}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
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

        {isIOS && (
          <View style={styles.infoCard}>
            <Info size={16} color="#5B9BD5" />
            <Text style={styles.infoText}>
              iOS only supports BLE thermal printers in this build. Classic Bluetooth devices are hidden from scan results.
            </Text>
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
            onPress={() => { void handleScan(); }}
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

          {usesFakeAdapter && (
            <View style={styles.webNotice}>
              <Wifi size={13} color={Colors.textSecondary} />
              <Text style={styles.webNoticeText}>
                {isWeb
                  ? t.printer.webSimulated
                  : 'Using the deterministic fake printer adapter in this environment.'}
              </Text>
            </View>
          )}
        </View>

        {hasPrinters && (
          <View style={styles.devicesSection}>
            <Text style={styles.sectionLabel}>
              {isIOS ? t.printer.pairedDevices : t.printer.nearbyDevices}
            </Text>
            {printers.map(renderDevice)}
          </View>
        )}

        {!scanning && !hasPrinters && !settings.printerConnected && (
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
                <Text style={styles.compatText}>{isIOS ? 'BLE only' : 'BLE + Classic BT'}</Text>
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
  preferredCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  preferredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferredIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferredInfo: {
    flex: 1,
    gap: 2,
  },
  preferredLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  preferredName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  preferredMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  preferredStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  preferredStatusConnected: {
    backgroundColor: 'rgba(34,204,102,0.14)',
  },
  preferredStatusIdle: {
    backgroundColor: Colors.inputBackground,
  },
  preferredStatusText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  errorCard: {
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
  },
  successCard: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    marginBottom: 12,
  },
  successCardText: {
    color: Colors.success,
    fontSize: 13,
    lineHeight: 18,
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
    gap: 8,
  },
  deviceActionButton: {
    minWidth: 90,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '700' as const,
  },
  deviceActionSecondaryText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700' as const,
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
  queueStatusCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  queueStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueStatusTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  queueStatusCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  queueBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  queueBadgeCompleted: {
    backgroundColor: '#E8F5E9',
  },
  queueBadgeFailed: {
    backgroundColor: '#FFEBEE',
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  queueStatusLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  queueFailedList: {
    marginTop: 12,
    gap: 8,
  },
  queueFailedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  queueFailedInfo: {
    flex: 1,
  },
  queueFailedType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  queueFailedError: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
