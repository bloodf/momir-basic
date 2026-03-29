import { resetInMemoryDb, getInMemoryDb } from '../../__mocks__/expo-sqlite';
import { QueueEngine, PrintRenderer, PrinterPort, processQueueForPrinter, getQueueSummary } from '../../services/printer/queue/engine';
import { createJob, getJobById, upsertPrinter } from '../../services/printer/storage/repositories';

const TEST_PRINTER_ID = 'test-printer-1';
const TEST_JOB_ID = 'test-job-1';
const FAKE_PRINTER_ID = 'fake-ble-001';
const FAKE_PRINTER_ADDRESS = 'AA:BB:CC:DD:EE:FF';

class FakeRenderer implements PrintRenderer {
  async render(payload: string): Promise<Uint8Array[]> {
    const encoded = new TextEncoder().encode(`PRINTED:${payload}`);
    return [encoded];
  }
}

class FakeAdapter implements PrinterPort {
  connectCalled = 0;
  sendCalled = 0;
  disconnectCalled = 0;
  shouldFail = false;
  failOn: 'connect' | 'send' | null = null;

  async connect(): Promise<void> {
    this.connectCalled++;
    if (this.failOn === 'connect') {
      throw new Error('Connection timeout');
    }
  }

  async disconnect(): Promise<void> {
    this.disconnectCalled++;
  }

  async send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'> {
    this.sendCalled++;
    if (this.failOn === 'send') {
      throw new Error('Send failed');
    }
    return 'success';
  }

  reset(): void {
    this.connectCalled = 0;
    this.sendCalled = 0;
    this.disconnectCalled = 0;
    this.shouldFail = false;
    this.failOn = null;
  }
}

describe('QueueEngine - Happy Path', () => {
  let engine: QueueEngine;
  let renderer: FakeRenderer;
  let adapter: FakeAdapter;

  beforeEach(() => {
    resetInMemoryDb();
    engine = new QueueEngine();
    renderer = new FakeRenderer();
    adapter = new FakeAdapter();
  });

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

  it('dispatches job and completes successfully', async () => {
    await createJob({
      id: TEST_JOB_ID,
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    const job = await engine.claimJob(TEST_PRINTER_ID);
    expect(job).not.toBeNull();

    const result = await engine.dispatch(job!, renderer, adapter);

    expect(result.success).toBe(true);
    expect(adapter.connectCalled).toBe(1);
    expect(adapter.sendCalled).toBe(1);
    expect(adapter.disconnectCalled).toBe(1);
  });

  it('records completed state after successful dispatch', async () => {
    await createJob({
      id: TEST_JOB_ID,
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    const job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, renderer, adapter);

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
    const result = await engine.dispatch(job!, renderer, adapter);

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

  it('handles render failure gracefully', async () => {
    const badRenderer: PrintRenderer = {
      async render(): Promise<Uint8Array[]> {
        throw new Error('Render error');
      },
    };

    await createJob({
      id: TEST_JOB_ID,
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    const job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, badRenderer, adapter);

    expect(result.success).toBe(false);
    expect(result.failureType).toBe('pre_write');
  });

  it('processes diagnostics jobs immediately for a concrete printer', async () => {
    await upsertPrinter({
      id: FAKE_PRINTER_ID,
      name: 'FakeThermal-BLE-001',
      address: FAKE_PRINTER_ADDRESS,
      transport: 'ble',
      capabilities: {
        supportImage: true,
        supportQR: true,
        supportCut: true,
        supportText: true,
        paperWidth: 58,
      },
    });

    await createJob({
      id: 'diag-now',
      printerId: FAKE_PRINTER_ID,
      documentType: 'diagnostics',
      payload: JSON.stringify({
        appName: 'Rork',
        platform: 'test',
        transport: 'ble',
        paperWidth: 58,
        timestamp: '2026-03-29T00:00:00.000Z',
      }),
    });

    await processQueueForPrinter(FAKE_PRINTER_ID);

    const job = await getJobById('diag-now');
    const summary = await getQueueSummary(FAKE_PRINTER_ID);

    expect(job?.state).toBe('completed');
    expect(summary.pending).toBe(0);
    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(0);
  });
});
