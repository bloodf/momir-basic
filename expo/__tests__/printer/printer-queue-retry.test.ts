import { resetInMemoryDb, getInMemoryDb } from '../../__mocks__/expo-sqlite';
import { QueueEngine, PrintRenderer, PrinterPort } from '../../services/printer/queue/engine';
import { createJob, updateJobState } from '../../services/printer/storage/repositories';

const TEST_PRINTER_ID = 'test-printer-1';

class FakeRenderer implements PrintRenderer {
  async render(payload: string): Promise<Uint8Array[]> {
    const encoded = new TextEncoder().encode(`PRINTED:${payload}`);
    return [encoded];
  }
}

class FakeAdapter implements PrinterPort {
  connectCalled = 0;
  sendCalled = 0;
  shouldFail = false;
  failOn: 'connect' | 'send' | null = null;

  async connect(): Promise<void> {
    this.connectCalled++;
    if (this.failOn === 'connect') {
      throw new Error('Connection timeout');
    }
  }

  async disconnect(): Promise<void> {}

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
    this.shouldFail = false;
    this.failOn = null;
  }
}

describe('QueueEngine - Retry Backoff', () => {
  let engine: QueueEngine;
  let renderer: FakeRenderer;
  let adapter: FakeAdapter;

  beforeEach(() => {
    resetInMemoryDb();
    jest.useFakeTimers();
    engine = new QueueEngine();
    renderer = new FakeRenderer();
    adapter = new FakeAdapter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('first failure triggers failed_retryable with 15s backoff', async () => {
    adapter.failOn = 'connect';

    await createJob({
      id: 'job-1',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    const job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, renderer, adapter);

    expect(result.success).toBe(false);
    expect(result.failureType).toBe('pre_write');

    await engine.recordTerminalState(job!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-1');

    expect(updatedJob?.state).toBe('failed_retryable');
    expect(updatedJob?.attempts).toBe(1);
    expect(updatedJob?.next_retry_at).not.toBeNull();

    const nextRetryAt = new Date(updatedJob!.next_retry_at!);
    const expectedRetryAt = new Date(Date.now() + 15_000);
    expect(nextRetryAt.getTime()).toBeCloseTo(expectedRetryAt.getTime(), -2);
  });

  it('second failure triggers failed_retryable with 60s backoff', async () => {
    adapter.failOn = 'connect';

    await createJob({
      id: 'job-2',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    await updateJobState('job-2', 'failed_retryable', 'Connection timeout', new Date(Date.now() + 15_000).toISOString());

    jest.advanceTimersByTime(16_000);

    const job = await engine.claimJob(TEST_PRINTER_ID);
    expect(job).not.toBeNull();
    expect(job!.attempts).toBe(1);

    const result = await engine.dispatch(job!, renderer, adapter);
    expect(result.success).toBe(false);

    await engine.recordTerminalState(job!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-2');

    expect(updatedJob?.state).toBe('failed_retryable');
    expect(updatedJob?.attempts).toBe(2);

    const nextRetryAt = new Date(updatedJob!.next_retry_at!);
    const expectedRetryAt = new Date(Date.now() + 60_000);
    expect(nextRetryAt.getTime()).toBeCloseTo(expectedRetryAt.getTime(), -2);
  });

  it('third failure triggers failed_retryable with 300s backoff', async () => {
    adapter.failOn = 'connect';

    await createJob({
      id: 'job-3',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    await updateJobState('job-3', 'failed_retryable', 'Connection timeout', new Date(Date.now() + 15_000).toISOString());

    jest.advanceTimersByTime(16_000);
    const job2 = await engine.claimJob(TEST_PRINTER_ID);
    await engine.dispatch(job2!, renderer, adapter);
    await engine.recordTerminalState(job2!, { success: false, error: 'Connection timeout', failureType: 'pre_write' });

    jest.advanceTimersByTime(61_000);
    const job3 = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job3!, renderer, adapter);
    expect(result.success).toBe(false);

    await engine.recordTerminalState(job3!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-3');

    expect(updatedJob?.state).toBe('failed_retryable');
    expect(updatedJob?.attempts).toBe(3);

    const nextRetryAt = new Date(updatedJob!.next_retry_at!);
    const expectedRetryAt = new Date(Date.now() + 300_000);
    expect(nextRetryAt.getTime()).toBeCloseTo(expectedRetryAt.getTime(), -2);
  });

  it('fourth failure moves to failed_terminal', async () => {
    adapter.failOn = 'connect';

    await createJob({
      id: 'job-4',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    await updateJobState('job-4', 'failed_retryable', 'Connection timeout', new Date(Date.now() + 15_000).toISOString());

    jest.advanceTimersByTime(16_000);
    let job = await engine.claimJob(TEST_PRINTER_ID);
    await engine.dispatch(job!, renderer, adapter);
    await engine.recordTerminalState(job!, { success: false, error: 'Connection timeout', failureType: 'pre_write' });

    jest.advanceTimersByTime(61_000);
    job = await engine.claimJob(TEST_PRINTER_ID);
    await engine.dispatch(job!, renderer, adapter);
    await engine.recordTerminalState(job!, { success: false, error: 'Connection timeout', failureType: 'pre_write' });

    jest.advanceTimersByTime(301_000);
    job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, renderer, adapter);
    expect(result.success).toBe(false);

    await engine.recordTerminalState(job!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-4');

    expect(updatedJob?.state).toBe('failed_terminal');
    expect(updatedJob?.attempts).toBe(3);
    expect(updatedJob?.last_error).toBe('Connection timeout');
  });
});

describe('QueueEngine - Uncertain Write', () => {
  let engine: QueueEngine;
  let renderer: FakeRenderer;
  let adapter: FakeAdapter;

  beforeEach(() => {
    resetInMemoryDb();
    engine = new QueueEngine();
    renderer = new FakeRenderer();
    adapter = new FakeAdapter();
  });

  it('uncertain write result moves to sent_unknown immediately', async () => {
    await createJob({
      id: 'job-uncertain',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    adapter.send = async function(): Promise<'success' | 'uncertain'> {
      this.sendCalled++;
      return 'uncertain';
    };

    const job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, renderer, adapter);

    expect(result.success).toBe(false);
    expect(result.failureType).toBe('uncertain_write');

    await engine.recordTerminalState(job!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-uncertain');

    expect(updatedJob?.state).toBe('sent_unknown');
    expect(updatedJob?.last_error).toContain('uncertain');
  });

  it('uncertain write does not increment retry attempts', async () => {
    await createJob({
      id: 'job-uncertain-2',
      printerId: TEST_PRINTER_ID,
      documentType: 'card_receipt',
      payload: JSON.stringify({ cardId: 'card-123' }),
    });

    adapter.send = async function(): Promise<'success' | 'uncertain'> {
      this.sendCalled++;
      return 'uncertain';
    };

    const job = await engine.claimJob(TEST_PRINTER_ID);
    const result = await engine.dispatch(job!, renderer, adapter);

    expect(result.failureType).toBe('uncertain_write');

    await engine.recordTerminalState(job!, result);

    const db = getInMemoryDb();
    const updatedJob = db.print_jobs.find(j => j.id === 'job-uncertain-2');

    expect(updatedJob?.state).toBe('sent_unknown');
    expect(updatedJob?.attempts).toBe(0);
  });
});
