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

export interface GameSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  players: string[];
  turns: Turn[];
  currentTurn: number;
  currentPlayerIndex: number;
}

export interface Turn {
  turnNumber: number;
  playerName: string;
  cmc: number;
  cardId: string;
  cardName: string;
  timestamp: string;
}

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  rssi?: number;
  type: 'classic' | 'ble';
}

export interface PrinterConfig {
  name: string;
  address: string;
  type: 'classic' | 'ble';
  paperWidth: 58 | 80;
  printArt: boolean;
  autoPrint: boolean;
}

export interface AppSettings {
  printer: PrinterConfig;
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
