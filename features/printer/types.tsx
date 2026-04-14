import React from 'react';
import { Bluetooth, Radio, Wifi } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { PrinterTransport } from '@/types';

/**
 * PrinterUiState — exhaustive, hardware-grounded states only.
 *
 * Each state represents a real condition of the printer+platform system.
 * No "connected" state is shown without adapter.isConnected() verification.
 */
export type PrinterUiState =
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

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function getTransportLabel(transport: PrinterTransport): string {
  switch (transport) {
    case 'ble': return 'BLE';
    case 'classic': return 'Classic BT';
    case 'tcp': return 'TCP/IP';
  }
}

export function getTransportIcon(transport: PrinterTransport): React.ReactNode {
  switch (transport) {
    case 'ble': return <Radio size={14} color="#5B9BD5" />;
    case 'classic': return <Bluetooth size={14} color="#C084FC" />;
    case 'tcp': return <Wifi size={14} color={Colors.gold} />;
  }
}
