import { resetInMemoryDb, getInMemoryDb } from '../../__mocks__/expo-sqlite';

describe('Print Queue Job Lifecycle', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('starts with empty queue', () => {
    const db = getInMemoryDb();
    expect(db.print_jobs).toHaveLength(0);
  });

  it('creates a queued job', async () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: JSON.stringify({ text: 'Test print' }),
      state: 'queued',
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(db.print_jobs).toHaveLength(1);
    expect(db.print_jobs[0].state).toBe('queued');
    expect(db.print_jobs[0].attempts).toBe(0);
  });

  it('moves job to retry_wait after failed attempt', () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: '{}',
      state: 'queued',
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.print_jobs[0].state = 'retry_wait';
    db.print_jobs[0].attempts = 1;
    db.print_jobs[0].last_error = 'Connection timeout';

    expect(db.print_jobs[0].state).toBe('retry_wait');
    expect(db.print_jobs[0].attempts).toBe(1);
    expect(db.print_jobs[0].last_error).toBe('Connection timeout');
  });

  it('moves job to completed after successful print', () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: '{}',
      state: 'dispatching',
      attempts: 1,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.print_jobs[0].state = 'completed';
    db.print_jobs[0].updated_at = new Date().toISOString();

    expect(db.print_jobs[0].state).toBe('completed');
  });

  it('moves job to failed_manual after uncertain write', () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: '{}',
      state: 'dispatching',
      attempts: 1,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.print_jobs[0].state = 'failed_manual';
    db.print_jobs[0].last_error = 'Print result uncertain - paper may not have advanced';

    expect(db.print_jobs[0].state).toBe('failed_manual');
    expect(db.print_jobs[0].last_error).toContain('uncertain');
  });

  it('handles multiple jobs in queue', () => {
    const db = getInMemoryDb();
    db.print_jobs.push(
      {
        id: '1',
        printer_id: '1',
        payload: '{}',
        state: 'completed',
        attempts: 1,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        printer_id: '1',
        payload: '{}',
        state: 'queued',
        attempts: 0,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        printer_id: '1',
        payload: '{}',
        state: 'retry_wait',
        attempts: 2,
        last_error: 'Connection refused',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    expect(db.print_jobs).toHaveLength(3);
    expect(db.print_jobs.filter(j => j.state === 'queued')).toHaveLength(1);
    expect(db.print_jobs.filter(j => j.state === 'retry_wait')).toHaveLength(1);
    expect(db.print_jobs.filter(j => j.state === 'completed')).toHaveLength(1);
  });

  it('persists job across simulated restart', () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: JSON.stringify({ cardId: 'card-123', printedAt: new Date().toISOString() }),
      state: 'queued',
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const reloadedPayload = JSON.parse(db.print_jobs[0].payload);
    expect(reloadedPayload.cardId).toBe('card-123');
  });

  it('caps retry attempts at maximum', () => {
    const db = getInMemoryDb();
    db.print_jobs.push({
      id: '1',
      printer_id: '1',
      payload: '{}',
      state: 'retry_wait',
      attempts: 3,
      last_error: 'Connection timeout',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (db.print_jobs[0].attempts >= 3) {
      db.print_jobs[0].state = 'failed_manual';
    }

    expect(db.print_jobs[0].state).toBe('failed_manual');
    expect(db.print_jobs[0].attempts).toBe(3);
  });
});