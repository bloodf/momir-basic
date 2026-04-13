/**
 * Printer Session Diagnostics — Structured Event Taxonomy
 *
 * Every printer session emits structured events for:
 * - Permission lifecycle (Android Bluetooth permissions)
 * - Transport discovery and filtering
 * - Connect/disconnect lifecycle
 * - Print job lifecycle (queued → dispatching → completed/failed)
 * - Native module errors with explicit error codes
 *
 * Events are emitted to the PrinterSessionLogger and can be captured
 * by logcat/Console.app for hardware certification evidence.
 */

import { Platform, NativeModules } from 'react-native';
import type { PrinterTransport } from '../../../types';
import { PrinterErrorCode } from '../adapters/port';
import { ErrorCategory, logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// Event Type Taxonomy
// ---------------------------------------------------------------------------

export const PrinterEventType = {
  // Permission events
  PRINTER_PERMISSION_REQUESTED: 'PRINTER_PERMISSION_REQUESTED',
  PRINTER_PERMISSION_GRANTED: 'PRINTER_PERMISSION_GRANTED',
  PRINTER_PERMISSION_DENIED: 'PRINTER_PERMISSION_DENIED',

  // Discovery events
  PRINTER_DISCOVERY_STARTED: 'PRINTER_DISCOVERY_STARTED',
  PRINTER_DISCOVERY_RESULT: 'PRINTER_DISCOVERY_RESULT',
  PRINTER_DISCOVERY_COMPLETED: 'PRINTER_DISCOVERY_COMPLETED',

  // Connection events
  PRINTER_CONNECT_STARTED: 'PRINTER_CONNECT_STARTED',
  PRINTER_CONNECT_SUCCESS: 'PRINTER_CONNECT_SUCCESS',
  PRINTER_CONNECT_FAILED: 'PRINTER_CONNECT_FAILED',
  PRINTER_DISCONNECTED: 'PRINTER_DISCONNECTED',

  // Print job events
  PRINT_JOB_QUEUED: 'PRINT_JOB_QUEUED',
  PRINT_JOB_DISPATCHED: 'PRINT_JOB_DISPATCHED',
  PRINT_JOB_COMPLETED: 'PRINT_JOB_COMPLETED',
  PRINT_JOB_FAILED: 'PRINT_JOB_FAILED',
  PRINT_JOB_SENT_UNKNOWN: 'PRINT_JOB_SENT_UNKNOWN',

  // Native module events
  PRINTER_NATIVE_ERROR: 'PRINTER_NATIVE_ERROR',
} as const;

export type PrinterEventType = (typeof PrinterEventType)[keyof typeof PrinterEventType];

// ---------------------------------------------------------------------------
// Event Payloads
// ---------------------------------------------------------------------------

export interface PrinterPermissionEvent {
  event: typeof PrinterEventType.PRINTER_PERMISSION_REQUESTED | typeof PrinterEventType.PRINTER_PERMISSION_GRANTED | typeof PrinterEventType.PRINTER_PERMISSION_DENIED;
  platform: string;
  transport?: PrinterTransport;
  permissionState?: string;
  reason?: string;
}

export interface PrinterDiscoveryEvent {
  event: typeof PrinterEventType.PRINTER_DISCOVERY_STARTED | typeof PrinterEventType.PRINTER_DISCOVERY_COMPLETED;
  platform: string;
  transport?: PrinterTransport;
  durationMs?: number;
  count?: number;
}

export interface PrinterDiscoveryResultEvent {
  event: typeof PrinterEventType.PRINTER_DISCOVERY_RESULT;
  platform: string;
  printerName: string;
  printerAddress: string;
  transport: PrinterTransport;
  accepted: boolean;
  rejectedReason?: string;
}

export interface PrinterConnectEvent {
  event: typeof PrinterEventType.PRINTER_CONNECT_STARTED | typeof PrinterEventType.PRINTER_CONNECT_SUCCESS | typeof PrinterEventType.PRINTER_CONNECT_FAILED;
  platform: string;
  transport?: PrinterTransport;
  printerAddress: string;
  printerName?: string;
  errorCode?: PrinterErrorCode;
  errorMessage?: string;
  durationMs?: number;
}

export interface PrinterDisconnectEvent {
  event: typeof PrinterEventType.PRINTER_DISCONNECTED;
  platform: string;
  transport?: PrinterTransport;
  printerAddress: string;
}

export interface PrintJobEvent {
  event: typeof PrinterEventType.PRINT_JOB_QUEUED | typeof PrinterEventType.PRINT_JOB_DISPATCHED | typeof PrinterEventType.PRINT_JOB_COMPLETED | typeof PrinterEventType.PRINT_JOB_FAILED | typeof PrinterEventType.PRINT_JOB_SENT_UNKNOWN;
  platform: string;
  jobId: string;
  printerId: string;
  printerAddress?: string;
  documentType: string;
  attempts?: number;
  failureType?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface PrinterNativeErrorEvent {
  event: typeof PrinterEventType.PRINTER_NATIVE_ERROR;
  platform: string;
  transport?: PrinterTransport;
  errorCode: PrinterErrorCode;
  errorMessage: string;
  nativeStack?: string;
}

export type PrinterSessionEvent =
  | PrinterPermissionEvent
  | PrinterDiscoveryEvent
  | PrinterDiscoveryResultEvent
  | PrinterConnectEvent
  | PrinterDisconnectEvent
  | PrintJobEvent
  | PrinterNativeErrorEvent;

// ---------------------------------------------------------------------------
// Session Logger Interface
// ---------------------------------------------------------------------------

export interface PrinterSessionLogger {
  log(event: PrinterSessionEvent): void;
}

// ---------------------------------------------------------------------------
// Console Logger (default — outputs to logcat / Console.app)
// ---------------------------------------------------------------------------

function getPlatform(): string {
  return Platform.OS;
}

function getAppVersion(): string {
  try {
    return NativeModules.ExponentConstants?.expoVersion ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function getBuildId(): string {
  try {
    return String(NativeModules.ExponentConstants?.android?.versionCode ?? NativeModules.ExponentConstants?.ios?.buildNumber ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

function formatEvent(event: PrinterSessionEvent): string {
  const timestamp = new Date().toISOString();
  const meta = {
    ts: timestamp,
    platform: getPlatform(),
    appVersion: getAppVersion(),
    buildId: getBuildId(),
  };

  // Use JSON as structured format — easy to parse with logcat -r or grep
  return JSON.stringify({
    ...meta,
    domain: 'PrinterSession',
    event: event.event,
    payload: event,
  });
}

export const consolePrinterLogger: PrinterSessionLogger = {
  log(event: PrinterSessionEvent): void {
    const formatted = formatEvent(event);
    // PrinterSession tag allows filtering with: adb logcat -s PrinterSession:*
    // On iOS this appears in Console.app under the device
    logger.debug(ErrorCategory.Printer, formatted);
  },
};

// ---------------------------------------------------------------------------
// No-op Logger (safe default when diagnostics are disabled)
// ---------------------------------------------------------------------------

export const noOpPrinterLogger: PrinterSessionLogger = {
  log(_event: PrinterSessionEvent): void {
    // Intentionally empty — diagnostics disabled
  },
};

// ---------------------------------------------------------------------------
// Singleton instance with configurable logger
// ---------------------------------------------------------------------------

let _logger: PrinterSessionLogger = noOpPrinterLogger;

export function setPrinterSessionLogger(logger: PrinterSessionLogger): void {
  _logger = logger;
}

export function getPrinterSessionLogger(): PrinterSessionLogger {
  return _logger;
}

export function initPrinterDiagnostics(): void {
  // Default: enable console logging in debug builds
  // Production can swap via setPrinterSessionLogger if Sentry integration is desired
  if (__DEV__) {
    _logger = consolePrinterLogger;
  }
}

// ---------------------------------------------------------------------------
// Convenience Emit Helpers
// ---------------------------------------------------------------------------

function emit(event: PrinterSessionEvent): void {
  _logger.log(event);
}

export function emitPermissionRequested(transport?: PrinterTransport): void {
  emit({
    event: PrinterEventType.PRINTER_PERMISSION_REQUESTED,
    platform: getPlatform(),
    transport,
  });
}

export function emitPermissionGranted(transport?: PrinterTransport): void {
  emit({
    event: PrinterEventType.PRINTER_PERMISSION_GRANTED,
    platform: getPlatform(),
    transport,
  });
}

export function emitPermissionDenied(reason: string, transport?: PrinterTransport): void {
  emit({
    event: PrinterEventType.PRINTER_PERMISSION_DENIED,
    platform: getPlatform(),
    transport,
    reason,
  });
}

export function emitDiscoveryStarted(): void {
  emit({
    event: PrinterEventType.PRINTER_DISCOVERY_STARTED,
    platform: getPlatform(),
  });
}

export function emitDiscoveryResult(params: {
  printerName: string;
  printerAddress: string;
  transport: PrinterTransport;
  accepted: boolean;
  rejectedReason?: string;
}): void {
  emit({
    event: PrinterEventType.PRINTER_DISCOVERY_RESULT,
    platform: getPlatform(),
    ...params,
  });
}

export function emitDiscoveryCompleted(durationMs: number, count: number): void {
  emit({
    event: PrinterEventType.PRINTER_DISCOVERY_COMPLETED,
    platform: getPlatform(),
    durationMs,
    count,
  });
}

export function emitConnectStarted(address: string, transport?: PrinterTransport): void {
  emit({
    event: PrinterEventType.PRINTER_CONNECT_STARTED,
    platform: getPlatform(),
    printerAddress: address,
    transport,
  });
}

export function emitConnectSuccess(address: string, printerName: string | undefined, transport: PrinterTransport | undefined, durationMs: number): void {
  emit({
    event: PrinterEventType.PRINTER_CONNECT_SUCCESS,
    platform: getPlatform(),
    printerAddress: address,
    printerName,
    transport,
    durationMs,
  });
}

export function emitConnectFailed(address: string, transport: PrinterTransport | undefined, errorCode: PrinterErrorCode, errorMessage: string, durationMs: number): void {
  emit({
    event: PrinterEventType.PRINTER_CONNECT_FAILED,
    platform: getPlatform(),
    printerAddress: address,
    transport,
    errorCode,
    errorMessage,
    durationMs,
  });
}

export function emitDisconnected(address: string, transport?: PrinterTransport): void {
  emit({
    event: PrinterEventType.PRINTER_DISCONNECTED,
    platform: getPlatform(),
    printerAddress: address,
    transport,
  });
}

export function emitJobQueued(jobId: string, printerId: string, documentType: string): void {
  emit({
    event: PrinterEventType.PRINT_JOB_QUEUED,
    platform: getPlatform(),
    jobId,
    printerId,
    documentType,
  });
}

export function emitJobDispatched(jobId: string, printerId: string, printerAddress: string, documentType: string, attempts: number): void {
  emit({
    event: PrinterEventType.PRINT_JOB_DISPATCHED,
    platform: getPlatform(),
    jobId,
    printerId,
    printerAddress,
    documentType,
    attempts,
  });
}

export function emitJobCompleted(jobId: string, printerId: string, printerAddress: string, documentType: string, durationMs: number): void {
  emit({
    event: PrinterEventType.PRINT_JOB_COMPLETED,
    platform: getPlatform(),
    jobId,
    printerId,
    printerAddress,
    documentType,
    durationMs,
  });
}

export function emitJobFailed(
  jobId: string,
  printerId: string,
  printerAddress: string,
  documentType: string,
  failureType: string,
  errorMessage: string,
  attempts: number,
  durationMs: number
): void {
  emit({
    event: PrinterEventType.PRINT_JOB_FAILED,
    platform: getPlatform(),
    jobId,
    printerId,
    printerAddress,
    documentType,
    failureType,
    errorMessage,
    attempts,
    durationMs,
  });
}

export function emitJobSentUnknown(jobId: string, printerId: string, printerAddress: string, documentType: string, durationMs: number): void {
  emit({
    event: PrinterEventType.PRINT_JOB_SENT_UNKNOWN,
    platform: getPlatform(),
    jobId,
    printerId,
    printerAddress,
    documentType,
    durationMs,
  });
}

export function emitNativeError(transport: PrinterTransport | undefined, errorCode: PrinterErrorCode, errorMessage: string): void {
  emit({
    event: PrinterEventType.PRINTER_NATIVE_ERROR,
    platform: getPlatform(),
    transport,
    errorCode,
    errorMessage,
  });
}
