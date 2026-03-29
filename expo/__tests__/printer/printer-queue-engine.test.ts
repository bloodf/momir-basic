import { resetInMemoryDb, getInMemoryDb } from '../../__mocks__/expo-sqlite';
import { QueueEngine, PrintRenderer, PrinterPort, processQueueForPrinter, getQueueSummary } from '../../services/printer/queue/engine';
import { createJob, upsertPrinter } from '../../services/printer/storage/repositories';
import type { PrinterCapabilities, CanonicalPrinterIdentity } from '../../types';

const TEST_PRINTER_ID = 'test-printer-1';
const TEST_JOB_ID = 'test-job-1';
const CANONICAL_PRINTER_ADDRESS = 'AA:BB:CC:DD:EE:FF';
const CANONICAL_TRANSPORT = 'ble';
const TEST_IDENTITY = { address: CANONICAL_PRINTER_ADDRESS, transport: CANONICAL_TRANSPORT as const };

class TestRenderer implements PrintRenderer {
  public renderCalled = 0;
  public renderParams: { payload: string; documentType: 'card_receipt' | 'diagnostics'; capabilities: PrinterCapabilities } | null = null;
  public shouldFail = false;
  public failError = 'Render failed';

  async render(payload: string, documentType: 'card_receipt' | 'diagnostics', capabilities: PrinterCapabilities): Promise<Uint8Array[]> {
    this.renderCalled++;
    this.renderParams = { payload, documentType, capabilities };

    if (this.shouldFail) {
      throw new Error(this.failError);
    }

    const encoded = new TextEncoder().encode(`PRINTED:${payload}`);
    return [encoded];
  }
}

class TestAdapter implements PrinterPort {
  connectCalled = 0;
  disconnectCalled = 0;
  sendCalled = 0;
  connectAddress: string | null = null;
  sendBytes: Uint8Array[] | null = null;
  shouldFailOn: 'connect' | 'send' | null = null;
  sendResult: 'success' | 'uncertain' = 'success';

  async connect(identity: CanonicalPrinterIdentity): Promise<void> {
    this.connectCalled++;
    this.connectAddress = identity.address;
    if (this.shouldFailOn === 'connect') {
      throw new Error('Connection timeout');
    }
  }

  async disconnect(): Promise<void> {
    this.disconnectCalled++;
  }

  async send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'> {
    this.sendCalled++;
    this.sendBytes = bytes;
    if (this.shouldFailOn === 'send') {
      throw new Error('Send failed');
    }
    return this.sendResult;
  }

  reset(): void {
    this.connectCalled = 0;
    this.disconnectCalled = 0;
    this.sendCalled = 0;
    this.connectAddress = null;
    this.sendBytes = null;
    this.shouldFailOn = null;
    this.sendResult = 'success';
  }
}

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportText: true,
  supportImage: true,
  supportQR: true,
  supportCut: true,
  paperWidth: 58,
};

describe('QueueEngine - Queue Semantics', () => {
  let engine: QueueEngine;
  let renderer: TestRenderer;
  let adapter: TestAdapter;

  beforeEach(() => {
    resetInMemoryDb();
    engine = new QueueEngine();
    renderer = new TestRenderer();
    adapter = new TestAdapter();
  });

  describe('claimJob', () => {
    it('claims a queued job for a printer', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);

      expect(job).not.toBeNull();
      expect(job!.id).toBe(TEST_JOB_ID);
      expect(job!.state).toBe('dispatching');
    });

    it('returns null when no jobs available', async () => {
      const job = await engine.claimJob(TEST_PRINTER_ID);
      expect(job).toBeNull();
    });

    it('does not claim job when another is already active for same printer', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job1 = await engine.claimJob(TEST_PRINTER_ID);
      const job2 = await engine.claimJob(TEST_PRINTER_ID);

      expect(job1).not.toBeNull();
      expect(job2).toBeNull();
    });
  });

  describe('dispatch - success path', () => {
    it('dispatches job and completes successfully', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      expect(job).not.toBeNull();

      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(result.success).toBe(true);
      expect(adapter.connectCalled).toBe(1);
      expect(adapter.sendCalled).toBe(1);
      expect(adapter.disconnectCalled).toBe(1);
    });

    it('render is called with correct documentType and capabilities', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'diagnostics',
        payload: JSON.stringify({ appName: 'Rork', platform: 'android', transport: 'ble', paperWidth: 58, timestamp: '2026-03-29' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(renderer.renderCalled).toBe(1);
      expect(renderer.renderParams?.documentType).toBe('diagnostics');
      expect(renderer.renderParams?.capabilities).toEqual(DEFAULT_CAPABILITIES);
    });

    it('bytes are sent to adapter as Uint8Array chunks', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(adapter.sendBytes).not.toBeNull();
      expect(Array.isArray(adapter.sendBytes)).toBe(true);
      expect(adapter.sendBytes![0]).toBeInstanceOf(Uint8Array);
    });
  });

  describe('dispatch - failure types', () => {
    it('returns pre_write failure when render fails', async () => {
      renderer.shouldFail = true;
      renderer.failError = 'Render error';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(result.success).toBe(false);
      expect(result.failureType).toBe('pre_write');
      expect(adapter.connectCalled).toBe(0);
    });

    it('returns pre_write failure when connect fails', async () => {
      adapter.shouldFailOn = 'connect';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(result.success).toBe(false);
      expect(result.failureType).toBe('pre_write');
      expect(adapter.disconnectCalled).toBe(0);
    });

    it('returns uncertain_write when send returns uncertain', async () => {
      adapter.sendResult = 'uncertain';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(result.success).toBe(false);
      expect(result.failureType).toBe('uncertain_write');
      expect(adapter.disconnectCalled).toBe(1);
    });
  });

  describe('recordTerminalState', () => {
    it('records completed state after successful dispatch', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      expect(result.success).toBe(true);

      await engine.recordTerminalState(job!, result);

      const db = getInMemoryDb();
      const updatedJob = db.print_jobs.find(j => j.id === TEST_JOB_ID);
      expect(updatedJob?.state).toBe('completed');
    });

    it('releases printer after terminal state is recorded', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      await engine.recordTerminalState(job!, result);

      await createJob({
        id: 'test-job-2',
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-456' }),
      });

      const newJob = await engine.claimJob(TEST_PRINTER_ID);
      expect(newJob).not.toBeNull();
      expect(newJob?.id).toBe('test-job-2');
    });

    it('marks uncertain_write as failed_manual (no auto-retry)', async () => {
      adapter.sendResult = 'uncertain';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      await engine.recordTerminalState(job!, result);

      const db = getInMemoryDb();
      const updatedJob = db.print_jobs.find(j => j.id === TEST_JOB_ID);
      expect(updatedJob?.state).toBe('failed_manual');
    });

    it('sets retry_wait with backoff on retryable failure', async () => {
      adapter.shouldFailOn = 'send';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      const result = await engine.dispatch(job!, renderer, adapter, DEFAULT_CAPABILITIES, TEST_IDENTITY);

      await engine.recordTerminalState(job!, result);

      const db = getInMemoryDb();
      const updatedJob = db.print_jobs.find(j => j.id === TEST_JOB_ID);
      expect(updatedJob?.state).toBe('retry_wait');
    });
  });

  describe('Canonical Identity in Queue', () => {
    it('job uses printerId as the registered printer identifier', async () => {
      await upsertPrinter({
        id: TEST_PRINTER_ID,
        name: 'Test Thermal',
        address: CANONICAL_PRINTER_ADDRESS,
        transport: CANONICAL_TRANSPORT,
        capabilities: DEFAULT_CAPABILITIES,
      });

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);

      expect(job!.printerId).toBe(TEST_PRINTER_ID);
    });

    it('processQueueForPrinter throws on missing native module', async () => {
      await upsertPrinter({
        id: TEST_PRINTER_ID,
        name: 'Test Thermal',
        address: CANONICAL_PRINTER_ADDRESS,
        transport: CANONICAL_TRANSPORT,
        capabilities: DEFAULT_CAPABILITIES,
      });

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      await expect(processQueueForPrinter(TEST_PRINTER_ID)).rejects.toThrow('native module');
    });
  });

  describe('Queue Semantics - Terminal States', () => {
    it('job in failed_manual is not re-claimed automatically', async () => {
      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      const job = await engine.claimJob(TEST_PRINTER_ID);
      await engine.recordTerminalState(job!, { success: false, failureType: 'uncertain_write' });

      const newJob = await engine.claimJob(TEST_PRINTER_ID);
      expect(newJob).toBeNull();
    });

    it('multiple printers can have active jobs simultaneously', async () => {
      const PRINTER_2 = 'test-printer-2';

      await createJob({
        id: TEST_JOB_ID,
        printerId: TEST_PRINTER_ID,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-123' }),
      });

      await createJob({
        id: 'test-job-2',
        printerId: PRINTER_2,
        documentType: 'card_receipt',
        payload: JSON.stringify({ cardId: 'card-456' }),
      });

      const job1 = await engine.claimJob(TEST_PRINTER_ID);
      const job2 = await engine.claimJob(PRINTER_2);

      expect(job1).not.toBeNull();
      expect(job2).not.toBeNull();
      expect(job1!.id).not.toBe(job2!.id);
    });
  });
});

describe('getQueueSummary', () => {
  let engine: QueueEngine;
  let renderer: TestRenderer;
  let adapter: TestAdapter;

  beforeEach(() => {
    resetInMemoryDb();
    engine = new QueueEngine();
    renderer = new TestRenderer();
    adapter = new TestAdapter();
  });

  it('counts pending, completed, and failed jobs correctly', async () => {
    await upsertPrinter({
      id: TEST_PRINTER_ID,
      name: 'Test Thermal',
      address: CANONICAL_PRINTER_ADDRESS,
      transport: CANONICAL_TRANSPORT,
      capabilities: DEFAULT_CAPABILITIES,
    });

    await createJob({
      id: 'job-pending',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-1' }),
    });

    await createJob({
      id: 'job-completed',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-2' }),
    });

    await createJob({
      id: 'job-failed',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-3' }),
    });

    const db = getInMemoryDb();
    const completedJob = db.print_jobs.find(j => j.id === 'job-completed');
    completedJob!.state = 'completed';

    const failedJob = db.print_jobs.find(j => j.id === 'job-failed');
    failedJob!.state = 'failed_manual';

    const summary = await getQueueSummary(TEST_PRINTER_ID);

    expect(summary.pending).toBe(1);
    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failedJobs).toHaveLength(1);
  });
});
