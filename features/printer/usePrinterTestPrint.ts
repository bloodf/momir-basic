import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PrinterRecord } from '@/types';
import { createAdapter } from '@/services/printer/adapters/factory';
import { showToast } from '@/components/Toast';
import { ErrorCategory } from '@/utils/logger';
import { logger } from '@/utils/logger';

interface UsePrinterTestPrintReturn {
  testPrintStatus: string | null;
  isTestPrinting: boolean;
  sendTestPrint: (printer: PrinterRecord, testPrintTitle: string, successMessage: (name: string) => string) => Promise<void>;
  resetTestStatus: () => void;
}

export function usePrinterTestPrint(): UsePrinterTestPrintReturn {
  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  const sendTestPrint = useCallback(async (
    printer: PrinterRecord,
    testPrintTitle: string,
    successMessage: (name: string) => string,
  ) => {
    setTestPrintStatus(printer.id);
    setIsTestPrinting(true);

    try {
      const adapter = createAdapter();

      // Connect using registry DB key — adapter.connectPrinter handles address lookup
      await adapter.connectPrinter(printer.id);

      // Build ESC/POS test page
      const now = new Date().toISOString();
      const testText = [
        '\x1B\x40',          // ESC @ — init
        '\x1B\x61\x01',      // Center align
        '\x1B\x45\x01',      // Bold on
        'MOMIR PRINTER TEST\n',
        '\x1B\x45\x00',      // Bold off
        '================================\n',
        '\x1B\x61\x00',      // Left align
        `Printer: ${printer.name}\n`,
        `Address: ${printer.address}\n`,
        `Transport: ${printer.transport}\n`,
        `Platform: ${Platform.OS}\n`,
        `Time: ${now}\n`,
        '================================\n',
        '\x1B\x61\x01',      // Center
        'Print test successful!\n',
        '\x1B\x61\x00',      // Left
        '\n\n\n',             // Feed
      ].join('');

      await adapter.sendText(testText);

      showToast({ type: 'success', title: testPrintTitle, message: successMessage(printer.name) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed';
      showToast({ type: 'error', title: testPrintTitle, message });
    } finally {
      setTestPrintStatus(null);
      setIsTestPrinting(false);
    }
  }, []);

  const resetTestStatus = useCallback(() => {
    setTestPrintStatus(null);
    setIsTestPrinting(false);
  }, []);

  return {
    testPrintStatus,
    isTestPrinting,
    sendTestPrint,
    resetTestStatus,
  };
}
