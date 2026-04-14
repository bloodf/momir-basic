import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { getTransportIcon, getTransportLabel } from '@/features/printer/types';
import type { PrinterRecord } from '@/types';

import { styles } from '../printerSetup.styles';

interface PrinterDeviceListProps {
  printers: PrinterRecord[];
  connectedPrinter: PrinterRecord | null;
  connecting: string | null;
  testing: string | null;
  preferredPrinterId: string | null;
  sectionLabel: string;
  connectedLabel: string;
  testLabel: string;
  onConnect: (printer: PrinterRecord) => void;
  onTestPrint: (printer: PrinterRecord) => void;
  onForgetPrinter: (printer: PrinterRecord) => void;
}

export function PrinterDeviceList({
  printers,
  connectedPrinter,
  connecting,
  testing,
  preferredPrinterId,
  sectionLabel,
  connectedLabel,
  testLabel,
  onConnect,
  onTestPrint,
  onForgetPrinter,
}: PrinterDeviceListProps) {
  return (
    <View style={styles.devicesSection}>
      <Text style={styles.sectionLabel}>{sectionLabel}</Text>
      {printers.map(printer => {
        const isConnected = connectedPrinter?.id === printer.id;
        const isConnecting = connecting === printer.id;
        const isTesting = testing === printer.id;
        const isPreferred = preferredPrinterId === printer.id;

        return (
          <View
            key={printer.id}
            style={[styles.deviceItem, isConnected && styles.deviceItemConnected]}
            testID={`device-${printer.id}`}
          >
            <View
              style={[
                styles.deviceIcon,
                printer.transport === 'ble'
                  ? styles.deviceIconBle
                  : printer.transport === 'tcp'
                    ? styles.deviceIconTcp
                    : styles.deviceIconClassic,
              ]}
            >
              {getTransportIcon(printer.transport)}
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceTitleRow}>
                <Text
                  style={[styles.deviceName, isConnected && styles.deviceNameConnected]}
                  numberOfLines={1}
                >
                  {printer.name}
                </Text>
                {isPreferred && (
                  <View style={styles.preferredChip}>
                    <Text style={styles.preferredChipText}>Preferred</Text>
                  </View>
                )}
              </View>
              <View style={styles.deviceMeta}>
                <View
                  style={[
                    styles.typeBadge,
                    printer.transport === 'ble'
                      ? styles.typeBadgeBle
                      : printer.transport === 'tcp'
                        ? styles.typeBadgeTcp
                        : styles.typeBadgeClassic,
                  ]}
                >
                  {getTransportIcon(printer.transport)}
                  <Text
                    style={[
                      styles.typeBadgeText,
                      printer.transport === 'ble'
                        ? styles.typeBadgeTextBle
                        : printer.transport === 'tcp'
                          ? styles.typeBadgeTextTcp
                          : styles.typeBadgeTextClassic,
                    ]}
                  >
                    {getTransportLabel(printer.transport)}
                  </Text>
                </View>
                <Text style={styles.deviceAddress} numberOfLines={1}>
                  {printer.address}
                </Text>
              </View>
            </View>
            <View style={styles.deviceActions}>
              <Pressable
                onPress={() => onConnect(printer)}
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
                    {isConnected ? connectedLabel : 'Connect'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => onTestPrint(printer)}
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
                  <Text style={styles.deviceActionSecondaryText}>{testLabel}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => onForgetPrinter(printer)}
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
      })}
    </View>
  );
}
