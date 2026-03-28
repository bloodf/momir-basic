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

// Transport type
export type PrinterTransport = 'ble' | 'classic' | 'tcp';

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
export interface PrinterPreferences {
  preferredPrinterId: string | null;  // null = no printer selected
  paperWidth: 58 | 80;
  printArt: boolean;
  autoPrint: boolean;
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

// Print job state machine
export type PrintJobState =
  | 'queued'       // waiting to be processed
  | 'ready'        // claimed by worker, about to dispatch
  | 'dispatching'  // actively sending to printer
  | 'completed'    // finished successfully
  | 'retry_wait'   // failed, waiting to retry (auto)
  | 'failed_manual'; // failed, needs manual retry

// A single print job (immutable payload, mutable state in DB)
export interface PrintJob {
  id: string;
  printerId: string;
  documentType: 'card_receipt' | 'diagnostics';
  payload: string;        // JSON stringified PrintDocumentData
  state: PrintJobState;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string;   // ISO timestamp for retry_wait jobs
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
    autoPrint: typeof legacy.autoPrint === 'boolean' ? legacy.autoPrint : false,
  };
}

// Default printer preferences
export const DEFAULT_PRINTER_PREFERENCES: PrinterPreferences = {
  preferredPrinterId: null,
  paperWidth: 58,
  printArt: true,
  autoPrint: false,
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
