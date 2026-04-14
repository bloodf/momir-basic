import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import {
  Bluetooth,
  BluetoothSearching,
  ExternalLink,
  HelpCircle,
  Info,
  Loader,
  Printer,
  RefreshCw,
  Settings,
  ShieldOff,
  Smartphone,
  Radio,
  WifiOff,
  AlertTriangle,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import type { PrinterUiState } from '@/features/printer/types';
import { getTransportLabel } from '@/features/printer/types';
import type { PrinterRecord } from '@/types';
import type { AndroidBluetoothPermissionStatus } from '@/services/printer/capability';

import { styles } from '../printerSetup.styles';

interface PrinterStatusTexts {
  common: { goBack: string };
  printer: {
    disconnect: string;
    noPrintersFound: string;
    iosEmptyHint: string;
    androidEmptyHint: string;
    worksOnBothPlatforms: string;
    bluetoothInfo: string;
    iosBluetoothSetup: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    openBluetoothSettings: string;
    moduleUnavailableTitle: string;
    moduleUnavailableText: string;
  };
}

interface PrinterStatusCardsProps {
  errorMessage: string | null;
  scanError: string | null;
  uiState: PrinterUiState;
  permissionState: AndroidBluetoothPermissionStatus | null;
  isIOS: boolean;
  scanning: boolean;
  printers: PrinterRecord[];
  connectedPrinter: PrinterRecord | null;
  connecting: string | null;
  testing: string | null;
  texts: PrinterStatusTexts;
  onGoBack: () => void;
  onOpenBluetoothSettings: () => void;
  onDismissUnsupported: () => void;
  onCheckConnection: () => void;
  onScan: () => void;
  onTestPrint: (printer: PrinterRecord) => void;
  onDisconnect: () => void;
}

export function PrinterStatusCards({
  errorMessage,
  scanError,
  uiState,
  permissionState,
  isIOS,
  scanning,
  printers,
  connectedPrinter,
  connecting,
  testing,
  texts,
  onGoBack,
  onOpenBluetoothSettings,
  onDismissUnsupported,
  onCheckConnection,
  onScan,
  onTestPrint,
  onDisconnect,
}: PrinterStatusCardsProps) {
  const connectingPrinter = connecting
    ? (printers.find(printer => printer.id === connecting) ?? null)
    : null;

  return (
    <>
      {errorMessage && (
        <View style={styles.errorCard}>
          <AlertTriangle size={16} color={Colors.error} />
          <Text style={styles.errorCardText}>{errorMessage}</Text>
        </View>
      )}

      {scanError && (
        <View style={styles.errorCard}>
          <AlertTriangle size={16} color={Colors.error} />
          <Text style={styles.errorCardText}>{scanError}</Text>
        </View>
      )}

      {uiState === 'module_unavailable' && (
        <View style={styles.permissionDeniedCard}>
          <View style={styles.permissionDeniedHeader}>
            <ShieldOff size={20} color={Colors.error} />
            <Text style={styles.permissionDeniedTitle}>{texts.printer.moduleUnavailableTitle}</Text>
          </View>
          <Text style={styles.permissionDeniedText}>{texts.printer.moduleUnavailableText}</Text>
          <Pressable
            onPress={onGoBack}
            style={({ pressed }) => [
              styles.permissionDeniedButton,
              pressed && styles.permissionDeniedButtonPressed,
            ]}
            testID="go-back"
          >
            <Text style={styles.permissionDeniedButtonText}>{texts.common.goBack}</Text>
          </Pressable>
        </View>
      )}

      {(uiState === 'permission_never_ask' || permissionState === 'never_ask_again') && (
        <View style={styles.permissionDeniedCard}>
          <View style={styles.permissionDeniedHeader}>
            <ShieldOff size={20} color={Colors.error} />
            <Text style={styles.permissionDeniedTitle}>Bluetooth Permission Required</Text>
          </View>
          <Text style={styles.permissionDeniedText}>
            Bluetooth scanning is permanently disabled. Open Android Settings to enable Bluetooth
            permissions for this app, then return and tap Scan again.
          </Text>
          <Pressable
            onPress={onOpenBluetoothSettings}
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
      )}

      {(uiState === 'permission_denied' || permissionState === 'denied') && (
        <View style={styles.permissionDeniedCard}>
          <View style={styles.permissionDeniedHeader}>
            <ShieldOff size={20} color={Colors.gold} />
            <Text style={styles.permissionDeniedTitle}>Bluetooth Permission Denied</Text>
          </View>
          <Text style={styles.permissionDeniedText}>
            Tap &quot;Scan&quot; to grant Bluetooth permissions. You may be prompted again.
          </Text>
        </View>
      )}

      {uiState === 'unsupported_transport' && (
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
            onPress={onDismissUnsupported}
            style={({ pressed }) => [
              styles.unsupportedButton,
              pressed && styles.unsupportedButtonPressed,
            ]}
          >
            <Text style={styles.unsupportedButtonText}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      {uiState === 'connecting' && connectingPrinter && (
        <View style={styles.connectingCard}>
          <Loader size={20} color={Colors.gold} />
          <Text style={styles.connectingText}>Connecting to {connectingPrinter.name}...</Text>
        </View>
      )}

      {uiState === 'disconnected' && (
        <View style={styles.disconnectedCard}>
          <View style={styles.disconnectedHeader}>
            <WifiOff size={20} color={Colors.error} />
            <Text style={styles.disconnectedTitle}>Printer Disconnected</Text>
          </View>
          <Text style={styles.disconnectedText}>
            The previously connected printer is no longer reachable. Check that the printer is
            powered on and in range, then tap &quot;Reconnect&quot; to restore the connection.
          </Text>
          <View style={styles.disconnectedActions}>
            <Pressable
              onPress={onCheckConnection}
              style={({ pressed }) => [
                styles.disconnectedButton,
                pressed && styles.disconnectedButtonPressed,
              ]}
            >
              <RefreshCw size={14} color={Colors.gold} />
              <Text style={styles.disconnectedButtonText}>Check Connection</Text>
            </Pressable>
            <Pressable
              onPress={onScan}
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
      )}

      {uiState === 'connected' && connectedPrinter && (
        <View style={styles.connectedCard}>
          <View style={styles.connectedHeader}>
            <View style={styles.connectedIconWrap}>
              <Printer size={18} color="#fff" />
            </View>
            <View style={styles.connectedInfo}>
              <Text style={styles.connectedName}>{connectedPrinter.name}</Text>
              <View style={styles.connectedMeta}>
                <View
                  style={[
                    styles.connectedTypeBadge,
                    connectedPrinter.transport === 'ble'
                      ? styles.typeBadgeBle
                      : connectedPrinter.transport === 'tcp'
                        ? styles.typeBadgeTcp
                        : styles.typeBadgeClassic,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      connectedPrinter.transport === 'ble'
                        ? styles.typeBadgeTextBle
                        : connectedPrinter.transport === 'tcp'
                          ? styles.typeBadgeTextTcp
                          : styles.typeBadgeTextClassic,
                    ]}
                  >
                    {getTransportLabel(connectedPrinter.transport)}
                  </Text>
                </View>
                <Text style={styles.connectedAddress}>{connectedPrinter.address}</Text>
              </View>
              <Text style={styles.connectedCanonical}>
                {connectedPrinter.address} via {getTransportLabel(connectedPrinter.transport)}
              </Text>
            </View>
          </View>

          <View style={styles.connectedDivider} />

          <View style={styles.connectedActions}>
            <Pressable
              onPress={() => onTestPrint(connectedPrinter)}
              style={({ pressed }) => [styles.testButton, pressed && styles.testButtonPressed]}
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
              onPress={onDisconnect}
              style={({ pressed }) => [
                styles.disconnectButton,
                pressed && styles.disconnectButtonPressed,
              ]}
            >
              <Text style={styles.disconnectText}>{texts.printer.disconnect}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isIOS && uiState !== 'connected' && (
        <View style={styles.iosFlowCard}>
          <View style={styles.iosFlowHeader}>
            <View style={styles.iosFlowIconWrap}>
              <Bluetooth size={20} color="#5B9BD5" />
            </View>
            <Text style={styles.iosFlowTitle}>{texts.printer.iosBluetoothSetup}</Text>
          </View>
          <View style={styles.stepsContainer}>
            {[
              { num: '1', title: texts.printer.step1Title, desc: texts.printer.step1Desc },
              { num: '2', title: texts.printer.step2Title, desc: texts.printer.step2Desc },
              { num: '3', title: texts.printer.step3Title, desc: texts.printer.step3Desc },
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
            onPress={onOpenBluetoothSettings}
            style={({ pressed }) => [
              styles.openSettingsButton,
              pressed && styles.openSettingsButtonPressed,
            ]}
            testID="open-bt-settings"
          >
            <ExternalLink size={16} color="#fff" />
            <Text style={styles.openSettingsText}>{texts.printer.openBluetoothSettings}</Text>
          </Pressable>
        </View>
      )}

      {uiState !== 'connected' && (
        <View style={styles.infoCard}>
          <Info size={16} color="#5B9BD5" />
          <Text style={styles.infoText}>
            {isIOS
              ? 'iOS supports BLE and TCP/IP thermal printers. Classic Bluetooth (MFi) printers require External Accessory framework support.'
              : texts.printer.bluetoothInfo}
          </Text>
        </View>
      )}

      {(uiState === 'scan_empty' || uiState === 'disconnected') &&
        !scanning &&
        printers.length === 0 && (
          <View style={styles.emptyState}>
            <BluetoothSearching size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{texts.printer.noPrintersFound}</Text>
            <Text style={styles.emptySubtitle}>
              {isIOS ? texts.printer.iosEmptyHint : texts.printer.androidEmptyHint}
            </Text>
            <View style={styles.compatRow}>
              <View style={styles.compatItem}>
                <Smartphone size={14} color={Colors.textMuted} />
                <Text style={styles.compatText}>{texts.printer.worksOnBothPlatforms}</Text>
              </View>
              <View style={styles.compatItem}>
                <Radio size={14} color={Colors.textMuted} />
                <Text style={styles.compatText}>
                  {isIOS ? 'BLE only' : 'BLE + Classic BT + TCP'}
                </Text>
              </View>
            </View>
          </View>
        )}
    </>
  );
}
