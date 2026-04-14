import { useState, useCallback } from 'react';
import type { PrinterRecord } from '@/types';
import { registryService } from '@/services/printer/registry/service';
import { showToast } from '@/components/Toast';
import { getErrorMessage } from './types';

interface UseTcpPrinterSetupReturn {
  tcpModalVisible: boolean;
  tcpHost: string;
  tcpPort: string;
  isAdding: boolean;
  openTcpModal: () => void;
  closeTcpModal: () => void;
  setTcpHost: React.Dispatch<React.SetStateAction<string>>;
  setTcpPort: React.Dispatch<React.SetStateAction<string>>;
  addTcpPrinter: () => Promise<PrinterRecord | null>;
}

export function useTcpPrinterSetup(): UseTcpPrinterSetupReturn {
  const [tcpModalVisible, setTcpModalVisible] = useState(false);
  const [tcpHost, setTcpHost] = useState('');
  const [tcpPort, setTcpPort] = useState('9100');
  const [isAdding, setIsAdding] = useState(false);

  const openTcpModal = useCallback(() => {
    setTcpModalVisible(true);
  }, []);

  const closeTcpModal = useCallback(() => {
    setTcpModalVisible(false);
    setTcpHost('');
    setTcpPort('9100');
  }, []);

  const addTcpPrinter = useCallback(async (): Promise<PrinterRecord | null> => {
    const host = tcpHost.trim();
    const port = parseInt(tcpPort.trim(), 10);

    if (!host) {
      showToast({ type: 'warning', title: 'TCP Printer', message: 'Please enter a hostname or IP address.' });
      return null;
    }
    if (isNaN(port) || port < 1 || port > 65535) {
      showToast({ type: 'warning', title: 'TCP Printer', message: 'Please enter a valid port number (1-65535).' });
      return null;
    }

    setIsAdding(true);
    try {
      const tcpPrinter: PrinterRecord = {
        id: `tcp-${host}-${port}`,
        name: `TCP Printer (${host})`,
        address: host,
        transport: 'tcp',
        capabilities: {
          supportImage: true,
          supportQR: true,
          supportCut: true,
          supportText: true,
          paperWidth: 58,
        },
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await registryService.mergeDiscoveredWithRegistry([tcpPrinter]);
      closeTcpModal();
      return tcpPrinter;
    } catch (error) {
      showToast({ type: 'error', title: 'TCP Printer', message: getErrorMessage(error, 'Failed to add TCP printer.') });
      return null;
    } finally {
      setIsAdding(false);
    }
  }, [tcpHost, tcpPort, closeTcpModal]);

  return {
    tcpModalVisible,
    tcpHost,
    tcpPort,
    isAdding,
    openTcpModal,
    closeTcpModal,
    setTcpHost,
    setTcpPort,
    addTcpPrinter,
  };
}
