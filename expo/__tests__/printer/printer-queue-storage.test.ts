import { resetInMemoryDb } from '../../__mocks__/expo-sqlite';
import * as Repositories from '../../services/printer/storage/repositories';
import type { PrinterCapabilities, PrinterTransport } from '@/types';

describe('Printer Queue Storage Repository', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  describe('Printer Repository', () => {
    const mockCapabilities: PrinterCapabilities = {
      supportImage: true,
      supportQR: true,
      supportCut: true,
      supportText: true,
      paperWidth: 58,
    };

    it('upserts a printer', async () => {
      await Repositories.upsertPrinter({
        id: 'printer-1',
        name: 'Test Printer',
        address: '00:11:22:33:44:55',
        transport: 'ble' as PrinterTransport,
        capabilities: mockCapabilities,
      });

      const printer = await Repositories.getPrinterById('printer-1');
      expect(printer).not.toBeNull();
      expect(printer?.id).toBe('printer-1');
      expect(printer?.name).toBe('Test Printer');
      expect(printer?.address).toBe('00:11:22:33:44:55');
      expect(printer?.transport).toBe('ble');
    });

    it('gets printer by address', async () => {
      await Repositories.upsertPrinter({
        id: 'printer-2',
        name: 'Test Printer 2',
        address: '00:11:22:33:44:66',
        transport: 'ble' as PrinterTransport,
        capabilities: mockCapabilities,
      });

      const printer = await Repositories.getPrinterByAddress('00:11:22:33:44:66');
      expect(printer).not.toBeNull();
      expect(printer?.id).toBe('printer-2');
    });

    it('returns null for non-existent printer', async () => {
      const printer = await Repositories.getPrinterById('non-existent');
      expect(printer).toBeNull();
    });

    it('lists all printers', async () => {
      await Repositories.upsertPrinter({
        id: 'printer-3',
        name: 'Printer Three',
        address: 'address-3',
        transport: 'tcp' as PrinterTransport,
        capabilities: mockCapabilities,
      });

      const printers = await Repositories.listPrinters();
      expect(printers.length).toBeGreaterThan(0);
    });

    it('deletes a printer', async () => {
      await Repositories.upsertPrinter({
        id: 'printer-to-delete',
        name: 'Delete Me',
        address: 'delete-address',
        transport: 'ble' as PrinterTransport,
        capabilities: mockCapabilities,
      });

      await Repositories.deletePrinter('printer-to-delete');
      const printer = await Repositories.getPrinterById('printer-to-delete');
      expect(printer).toBeNull();
    });
  });

  describe('Job Repository', () => {
    const mockPayload = JSON.stringify({ cardId: 'card-123', cardName: 'Test Card' });

    beforeEach(async () => {
      await Repositories.resetPrinters();
      await Repositories.upsertPrinter({
        id: 'test-printer-id',
        name: 'Test Printer',
        address: 'test-address',
        transport: 'ble' as PrinterTransport,
        capabilities: { supportImage: true, supportQR: false, supportCut: false, supportText: true, paperWidth: 58 },
      });
    });

    it('creates a job', async () => {
      await Repositories.createJob({
        id: 'job-1',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      const job = await Repositories.getJobById('job-1');
      expect(job).not.toBeNull();
      expect(job?.id).toBe('job-1');
      expect(job?.printerId).toBe('test-printer-id');
      expect(job?.documentType).toBe('card_receipt');
      expect(job?.state).toBe('queued');
      expect(job?.attempts).toBe(0);
    });

    it('gets job by id', async () => {
      await Repositories.createJob({
        id: 'job-2',
        printerId: 'test-printer-id',
        documentType: 'diagnostics',
        payload: '{}',
      });

      const job = await Repositories.getJobById('job-2');
      expect(job).not.toBeNull();
      expect(job?.documentType).toBe('diagnostics');
    });

    it('lists jobs by state', async () => {
      await Repositories.createJob({
        id: 'job-3',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      const queuedJobs = await Repositories.listJobsByState('queued');
      expect(queuedJobs.length).toBeGreaterThan(0);
    });

    it('lists all jobs', async () => {
      await Repositories.createJob({
        id: 'job-4',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      const allJobs = await Repositories.listAllJobs();
      expect(allJobs.length).toBeGreaterThan(0);
    });

    it('updates job state', async () => {
      await Repositories.createJob({
        id: 'job-5',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      await Repositories.updateJobState('job-5', 'dispatching');

      const job = await Repositories.getJobById('job-5');
      expect(job?.state).toBe('dispatching');
    });

    it('updates job state to retry_wait with error', async () => {
      await Repositories.createJob({
        id: 'job-6',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      await Repositories.updateJobState('job-6', 'retry_wait', 'Connection timeout', '2025-01-01T00:00:00Z');

      const job = await Repositories.getJobById('job-6');
      expect(job?.state).toBe('retry_wait');
      expect(job?.lastError).toBe('Connection timeout');
      expect(job?.nextRetryAt).toBe('2025-01-01T00:00:00Z');
    });

    it('increments attempts on retry_wait state', async () => {
      await Repositories.createJob({
        id: 'job-7',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      await Repositories.updateJobState('job-7', 'retry_wait', 'Error');

      const job = await Repositories.getJobById('job-7');
      expect(job?.attempts).toBe(1);
    });

    it('deletes a job', async () => {
      await Repositories.createJob({
        id: 'job-to-delete',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      await Repositories.deleteJob('job-to-delete');
      const job = await Repositories.getJobById('job-to-delete');
      expect(job).toBeNull();
    });

    it('resets all jobs', async () => {
      await Repositories.createJob({
        id: 'job-reset-1',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });
      await Repositories.createJob({
        id: 'job-reset-2',
        printerId: 'test-printer-id',
        documentType: 'card_receipt',
        payload: mockPayload,
      });

      await Repositories.resetJobs();

      const allJobs = await Repositories.listAllJobs();
      expect(allJobs).toHaveLength(0);
    });

    it('handles all job states', async () => {
      const states: Array<'queued' | 'ready' | 'dispatching' | 'completed' | 'retry_wait' | 'failed_manual'> = [
        'queued',
        'ready',
        'dispatching',
        'completed',
        'retry_wait',
        'failed_manual',
      ];

      for (const state of states) {
        await Repositories.resetJobs();
        await Repositories.createJob({
          id: `job-state-${state}`,
          printerId: 'test-printer-id',
          documentType: 'card_receipt',
          payload: mockPayload,
        });

        await Repositories.updateJobState(`job-state-${state}`, state, state === 'retry_wait' ? 'error' : null);

        const job = await Repositories.getJobById(`job-state-${state}`);
        expect(job?.state).toBe(state);
      }
    });
  });
});