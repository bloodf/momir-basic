export interface CardFace {
  name: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  printedName?: string;
  printedTypeLine?: string;
  printedText?: string;
  image_uris?: {
    art_crop: string;
    normal: string;
    small: string;
  };
}

export interface Card {
  id: string;
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  power?: string;
  toughness?: string;
  scryfallUri: string;
  artCropUrl: string;
  normalImageUrl: string;
  smallImageUrl: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  artist?: string;
  flavorText?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  colors: string[];
  cmc: number;
  fetchedAt: string;
  sessionId?: string;
  printedName?: string;
  printedTypeLine?: string;
  printedText?: string;
  lang?: string;
  /** Normalized faces for double-faced/modal cards. Single-face cards have faces: []. */
  faces?: CardFace[];
}

export type CardType =
  | 'creature'
  | 'commander'
  | 'artifact'
  | 'equipment'
  | 'enchantment'
  | 'aura'
  | 'instants'
  | 'sorceries'
  | 'lands';

export interface CardTypeConfig {
  id: CardType;
  label: string;
  description: string;
  multiCard: boolean;
  useCmc: boolean;
  count: number;
}

// Transport type enum with explicit values
export enum PrinterTransportType {
  BLE = 'ble',
  CLASSIC = 'classic',
  TCP = 'tcp',
}

/** Legacy type alias for backward compatibility — prefer PrinterTransportType */
export type PrinterTransport = 'ble' | 'classic' | 'tcp';

/**
 * Validates that a string is a known PrinterTransport.
 * Returns the valid transport or throws if unknown.
 */
export function validateTransport(transport: string): PrinterTransport {
  if (transport === 'ble' || transport === 'classic' || transport === 'tcp') {
    return transport;
  }
  throw new Error(`Unsupported transport: "${transport}". Expected one of: ble, classic, tcp`);
}

/**
 * Canonical printer identity used across registry, queue, and adapter layers.
 * Every connect/dispatch path must use this composite key.
 */
export interface CanonicalPrinterIdentity {
  address: string;
  transport: PrinterTransport;
}

// Printer record (stored in SQLite registry, keyed by stable ID)
export interface PrinterRecord {
  id: string;           // stable registry ID (UUID)
  name: string;         // display name
  address: string;      // device address/Bluetooth UUID
  transport: PrinterTransport;
  capabilities: PrinterCapabilities;
  lastSeenAt: string;   // ISO timestamp
  createdAt: string;    // ISO timestamp
}

// Capabilities snapshot (captured at discovery time)
export interface PrinterCapabilities {
  supportImage: boolean;
  supportQR: boolean;
  supportCut: boolean;
  supportText: boolean;
  paperWidth: 58 | 80;
  maxColumnWidth?: number;
  encoding?: string;
}

// User preferences for printing (lives in SettingsProvider/AsyncStorage)
export type PrintMode = 'full' | 'image_only';
export type DitherAlgorithm = 'floyd' | 'bayer' | 'threshold' | 'none';
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface PrinterPreferences {
  preferredPrinterId: string | null;  // null = no printer selected
  paperWidth: 58 | 80;
  printArt: boolean;
  printQR: boolean;
  printFlavorText: boolean;
  autoPrint: boolean;
  printMode: PrintMode;  // 'full' = receipt layout, 'image_only' = full card image
  // Image pre-processing tuning (applied before sending bitmap to printer)
  imageDither: DitherAlgorithm;       // default 'floyd'
  imageBrightness: number;            // 0.5..1.5, default 1.0
  imageContrast: number;              // 0.5..1.5, default 1.0
  imageThreshold: number;             // 0..255, default 128
  imageMaxHeightPx: number;           // default 480
  // QR code tuning
  qrSize: number;                     // 1..16 ESC/POS module size, default 8
  qrErrorCorrection: QrErrorCorrection; // default 'L'
}

// Legacy printer config (for migration only)
export interface LegacyPrinterConfig {
  name: string;
  address: string;
  type: 'classic' | 'ble';
  paperWidth: 58 | 80;
  printArt: boolean;
  autoPrint: boolean;
}

// Print job state machine — explicit outcomes for deterministic handling
export type PrintJobState =
  | 'queued'              // waiting to be processed
  | 'printing'            // actively sending to printer
  | 'printed_confirmed'    // successfully printed and confirmed
  | 'failed_retryable'    // failed, auto-retryable after backoff
  | 'failed_terminal'     // failed, non-retryable (operator must investigate)
  | 'sent_unknown';       // uncertain delivery — disconnect mid-write, operator reconciliation required

// A single print job (immutable payload, mutable state in DB)
export interface PrintJob {
  id: string;
  printerId: string;
  canonicalIdentity?: CanonicalPrinterIdentity; // address+transport snapshot at job creation for safe resume
  documentType: 'card_receipt' | 'diagnostics';
  payload: string;        // JSON stringified PrintDocumentData
  state: PrintJobState;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;   // ISO timestamp for failed_retryable jobs
}

// Document data for a card receipt
export interface CardReceiptData {
  cardId: string;
  cardName: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  artCropUrl: string;
  scryfallUrl: string;
  artist?: string;
  rarity: string;
  setName: string;
  paperWidth: 58 | 80;
  printArt: boolean;
  /** Optional back face data for double-faced cards */
  backFaceData?: {
    name: string;
    manaCost?: string;
    typeLine: string;
    oracleText?: string;
    flavorText?: string;
    power?: string;
    toughness?: string;
    artCropUrl?: string;
  };
}

// Document data for diagnostics/test print
export interface DiagnosticsData {
  appName: string;
  platform: string;
  printerName?: string;
  printerTransport?: PrinterTransport;
  paperWidth: 58 | 80;
  timestamp: string;
}

/**
 * Migrates legacy PrinterConfig to new PrinterPreferences structure.
 * The legacy config stored printer identity (name/address/type) directly,
 * but the new structure stores only a preferredPrinterId reference.
 * Since old configs don't have a registry ID, preferredPrinterId is set to null.
 */
export function migratePrinterPreferences(
  legacy: LegacyPrinterConfig
): PrinterPreferences {
  return {
    preferredPrinterId: null,
    paperWidth: legacy.paperWidth === 58 || legacy.paperWidth === 80 ? legacy.paperWidth : 58,
    printArt: typeof legacy.printArt === 'boolean' ? legacy.printArt : true,
    printQR: true,
    printFlavorText: true,
    autoPrint: typeof legacy.autoPrint === 'boolean' ? legacy.autoPrint : false,
    printMode: 'full' as const,
    imageDither: 'floyd',
    imageBrightness: 1.0,
    imageContrast: 1.0,
    imageThreshold: 128,
    imageMaxHeightPx: 480,
    qrSize: 8,
    qrErrorCorrection: 'L',
  };
}

// Default printer preferences
export const DEFAULT_PRINTER_PREFERENCES: PrinterPreferences = {
  preferredPrinterId: null,
  paperWidth: 58,
  printArt: true,
  printQR: true,
  printFlavorText: true,
  autoPrint: false,
  printMode: 'full' as const,
  imageDither: 'floyd',
  imageBrightness: 1.0,
  imageContrast: 1.0,
  imageThreshold: 128,
  imageMaxHeightPx: 480,
  qrSize: 8,
  qrErrorCorrection: 'L',
};

export interface AppSettings {
  printer: PrinterPreferences;
  excludeDigitalOnly: boolean;
  excludeFunnySets: boolean;
  uniqueCardsOnly: boolean;
  printerConnected: boolean;
  devMode: boolean;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  scryfall_uri: string;
  image_uris?: {
    art_crop: string;
    normal: string;
    small: string;
  };
  set_name: string;
  set: string;
  collector_number: string;
  artist?: string;
  rarity: string;
  colors?: string[];
  cmc: number;
  lang?: string;
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    flavor_text?: string;
    power?: string;
    toughness?: string;
    artist?: string;
    printed_name?: string;
    printed_type_line?: string;
    printed_text?: string;
    image_uris?: {
      art_crop: string;
      normal: string;
      small: string;
    };
  }>;
}
