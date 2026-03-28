import { AppSettings, PrinterConfig } from '@/types';

const DEFAULT_PRINTER: PrinterConfig = {
  name: '',
  address: '',
  type: 'ble',
  paperWidth: 58,
  printArt: true,
  autoPrint: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  printer: DEFAULT_PRINTER,
  excludeDigitalOnly: true,
  excludeFunnySets: true,
  uniqueCardsOnly: false,
  printerConnected: false,
  devMode: false,
};

function migrateLegacySettings(stored: Record<string, unknown>): AppSettings {
  const migrated = { ...DEFAULT_SETTINGS, ...stored };
  
  if (stored.printer && typeof stored.printer === 'object') {
    const oldPrinter = stored.printer as Record<string, unknown>;
    migrated.printer = {
      name: typeof oldPrinter.name === 'string' ? oldPrinter.name : '',
      address: typeof oldPrinter.address === 'string' ? oldPrinter.address : '',
      type: oldPrinter.type === 'classic' || oldPrinter.type === 'ble' ? oldPrinter.type : 'ble',
      paperWidth: oldPrinter.paperWidth === 58 || oldPrinter.paperWidth === 80 ? oldPrinter.paperWidth : 58,
      printArt: oldPrinter.printArt !== undefined ? Boolean(oldPrinter.printArt) : true,
      autoPrint: oldPrinter.autoPrint !== undefined ? Boolean(oldPrinter.autoPrint) : false,
    };
  }
  
  if (typeof migrated.printerConnected !== 'boolean') {
    migrated.printerConnected = false;
  }
  
  return migrated;
}

describe('Printer Settings Migration', () => {
  it('migrates empty legacy settings to defaults', () => {
    const legacy = {};
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.printer).toEqual(DEFAULT_PRINTER);
    expect(migrated.excludeDigitalOnly).toBe(true);
    expect(migrated.excludeFunnySets).toBe(true);
    expect(migrated.uniqueCardsOnly).toBe(false);
    expect(migrated.printerConnected).toBe(false);
    expect(migrated.devMode).toBe(false);
  });

  it('preserves paper width preference from legacy settings', () => {
    const legacy = {
      printer: {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 80,
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.printer.paperWidth).toBe(80);
    expect(migrated.printer.name).toBe('Test Printer');
  });

  it('preserves print art preference', () => {
    const legacy = {
      printer: {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
        printArt: false,
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.printer.printArt).toBe(false);
  });

  it('preserves auto print preference', () => {
    const legacy = {
      printer: {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
        printArt: true,
        autoPrint: true,
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.printer.autoPrint).toBe(true);
  });

  it('converts string printer type to valid type', () => {
    const legacy = {
      printer: {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'classic',
        paperWidth: 80,
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.printer.type).toBe('classic');
  });

  it('handles malformed printer object gracefully', () => {
    const legacy = {
      printer: {
        name: 123,
        address: null,
        type: 'invalid',
      },
    };
    const migrated = migrateLegacySettings(legacy as Record<string, unknown>);
    
    expect(migrated.printer.name).toBe('');
    expect(migrated.printer.address).toBe('');
    expect(migrated.printer.type).toBe('ble');
  });

  it('handles missing printer field gracefully', () => {
    const legacy = {
      excludeDigitalOnly: false,
      excludeFunnySets: false,
    };
    const migrated = migrateLegacySettings(legacy as Record<string, unknown>);
    
    expect(migrated.printer).toEqual(DEFAULT_PRINTER);
    expect(migrated.excludeDigitalOnly).toBe(false);
    expect(migrated.excludeFunnySets).toBe(false);
  });

  it('preserves other settings when migrating printer', () => {
    const legacy = {
      excludeDigitalOnly: false,
      excludeFunnySets: true,
      uniqueCardsOnly: true,
      devMode: true,
      printer: {
        name: 'My Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated.excludeDigitalOnly).toBe(false);
    expect(migrated.excludeFunnySets).toBe(true);
    expect(migrated.uniqueCardsOnly).toBe(true);
    expect(migrated.devMode).toBe(true);
    expect(migrated.printer.name).toBe('My Printer');
  });

  it('converts legacy printerConnected to boolean', () => {
    const legacy1 = { printerConnected: 'yes' };
    const legacy2 = { printerConnected: null };
    const legacy3 = { printerConnected: undefined };
    
    const migrated1 = migrateLegacySettings(legacy1 as Record<string, unknown>);
    const migrated2 = migrateLegacySettings(legacy2 as Record<string, unknown>);
    const migrated3 = migrateLegacySettings(legacy3 as Record<string, unknown>);
    
    expect(migrated1.printerConnected).toBe(false);
    expect(migrated2.printerConnected).toBe(false);
    expect(migrated3.printerConnected).toBe(false);
  });

  it('handles complete legacy settings object', () => {
    const legacy = {
      excludeDigitalOnly: false,
      excludeFunnySets: false,
      uniqueCardsOnly: true,
      printerConnected: true,
      devMode: true,
      printer: {
        name: 'Thermal-80mm BT',
        address: 'AA:BB:CC:DD:EE:02',
        type: 'classic',
        paperWidth: 80,
        printArt: true,
        autoPrint: true,
      },
    };
    const migrated = migrateLegacySettings(legacy);
    
    expect(migrated).toEqual({
      printer: {
        name: 'Thermal-80mm BT',
        address: 'AA:BB:CC:DD:EE:02',
        type: 'classic',
        paperWidth: 80,
        printArt: true,
        autoPrint: true,
      },
      excludeDigitalOnly: false,
      excludeFunnySets: false,
      uniqueCardsOnly: true,
      printerConnected: true,
      devMode: true,
    });
  });
});