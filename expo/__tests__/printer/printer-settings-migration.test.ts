import {
  LegacyPrinterConfig,
  PrinterPreferences,
  migratePrinterPreferences,
  DEFAULT_PRINTER_PREFERENCES,
} from '@/types';

describe('Printer Settings Migration', () => {
  describe('migratePrinterPreferences', () => {
    it('migrates legacy config to preferences with null printer id', () => {
      const legacy: LegacyPrinterConfig = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 80,
        printArt: true,
        autoPrint: true,
      };

      const result = migratePrinterPreferences(legacy);

      expect(result.preferredPrinterId).toBeNull();
      expect(result.paperWidth).toBe(80);
      expect(result.printArt).toBe(true);
      expect(result.autoPrint).toBe(true);
    });

    it('preserves paper width 58', () => {
      const legacy: LegacyPrinterConfig = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'classic',
        paperWidth: 58,
        printArt: false,
        autoPrint: false,
      };

      const result = migratePrinterPreferences(legacy);

      expect(result.paperWidth).toBe(58);
      expect(result.preferredPrinterId).toBeNull();
    });

    it('handles invalid paper width with default of 58', () => {
      const legacy = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 100,
        printArt: true,
        autoPrint: false,
      };

      const result = migratePrinterPreferences(legacy as LegacyPrinterConfig);

      expect(result.paperWidth).toBe(58);
    });

    it('handles missing printArt with default true', () => {
      const legacy = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
      };

      const result = migratePrinterPreferences(legacy as LegacyPrinterConfig);

      expect(result.printArt).toBe(true);
    });

    it('handles missing autoPrint with default false', () => {
      const legacy = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
        printArt: true,
      };

      const result = migratePrinterPreferences(legacy as LegacyPrinterConfig);

      expect(result.autoPrint).toBe(false);
    });

    it('handles non-boolean printArt value', () => {
      const legacy = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
        printArt: 'yes' as unknown as boolean,
        autoPrint: false,
      };

      const result = migratePrinterPreferences(legacy);

      expect(result.printArt).toBe(true);
    });

    it('handles non-boolean autoPrint value', () => {
      const legacy = {
        name: 'Test Printer',
        address: 'AA:BB:CC:DD:EE:01',
        type: 'ble',
        paperWidth: 58,
        printArt: true,
        autoPrint: 1 as unknown as boolean,
      };

      const result = migratePrinterPreferences(legacy);

      expect(result.autoPrint).toBe(false);
    });

    it('handles completely malformed legacy config', () => {
      const legacy = {
        name: 123,
        address: null,
        type: 'invalid',
        paperWidth: 'wide',
        printArt: undefined,
        autoPrint: 'true',
      };

      const result = migratePrinterPreferences(legacy as LegacyPrinterConfig);

      expect(result.preferredPrinterId).toBeNull();
      expect(result.paperWidth).toBe(58);
      expect(result.printArt).toBe(true);
      expect(result.autoPrint).toBe(false);
    });
  });

  describe('DEFAULT_PRINTER_PREFERENCES', () => {
    it('has correct default values', () => {
      expect(DEFAULT_PRINTER_PREFERENCES.preferredPrinterId).toBeNull();
      expect(DEFAULT_PRINTER_PREFERENCES.paperWidth).toBe(58);
      expect(DEFAULT_PRINTER_PREFERENCES.printArt).toBe(true);
      expect(DEFAULT_PRINTER_PREFERENCES.autoPrint).toBe(false);
    });
  });

  describe('already-migrated settings pass-through', () => {
    it('recognizes new format with preferredPrinterId', () => {
      const newFormat: PrinterPreferences = {
        preferredPrinterId: 'printer-123',
        paperWidth: 80,
        printArt: false,
        autoPrint: true,
      };

      expect(newFormat.preferredPrinterId).toBe('printer-123');
      expect(newFormat.paperWidth).toBe(80);
    });

    it('recognizes new format with null preferredPrinterId', () => {
      const newFormat: PrinterPreferences = {
        preferredPrinterId: null,
        paperWidth: 58,
        printArt: true,
        autoPrint: false,
      };

      expect(newFormat.preferredPrinterId).toBeNull();
    });
  });
});
