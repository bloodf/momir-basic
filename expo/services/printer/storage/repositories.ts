import { getDatabase } from './database';
import type { PrinterRecord, PrinterCapabilities, PrintJob, PrintJobState, PrinterTransport } from '@/types';

export interface CreatePrinterInput {
  id: string;
  name: string;
  address: string;
  transport: PrinterTransport;
  capabilities: PrinterCapabilities;
}

export async function upsertPrinter(input: CreatePrinterInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO printers (id, name, address, transport, capabilities, last_seen_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.id, input.name, input.address, input.transport, JSON.stringify(input.capabilities), now, now]
  );
}

export async function getPrinterByAddress(address: string): Promise<PrinterRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM printers WHERE address = ? LIMIT 1',
    [address]
  );
  if (!row) return null;
  return rowToPrinterRecord(row);
}

export async function getPrinterById(id: string): Promise<PrinterRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM printers WHERE id = ? LIMIT 1',
    [id]
  );
  if (!row) return null;
  return rowToPrinterRecord(row);
}

export async function listPrinters(): Promise<PrinterRecord[]> {
  const db = await getDatabase();
  const rows = await db.getFirstAsync<unknown[]>('SELECT * FROM printers ORDER BY last_seen_at DESC');
  return (rows as Record<string, unknown>[] ?? []).map(rowToPrinterRecord);
}

export async function deletePrinter(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM printers WHERE id = ?', [id]);
}

function rowToPrinterRecord(row: Record<string, unknown>): PrinterRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    address: row.address as string,
    transport: row.transport as PrinterTransport,
    capabilities: JSON.parse(row.capabilities as string) as PrinterCapabilities,
    lastSeenAt: row.last_seen_at as string,
    createdAt: row.created_at as string,
  };
}

export interface CreateJobInput {
  id: string;
  printerId: string;
  documentType: 'card_receipt' | 'diagnostics';
  payload: string;
}

export async function createJob(input: CreateJobInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO print_jobs (id, printer_id, document_type, payload, state, attempts, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'queued', 0, NULL, ?, ?)`,
    [input.id, input.printerId, input.documentType, input.payload, now, now]
  );
}

export async function getJobById(id: string): Promise<PrintJob | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM print_jobs WHERE id = ? LIMIT 1',
    [id]
  );
  if (!row) return null;
  return rowToPrintJob(row);
}

export async function listJobsByState(state: PrintJobState): Promise<PrintJob[]> {
  const db = await getDatabase();
  const rows = await db.getFirstAsync<unknown[]>(
    'SELECT * FROM print_jobs WHERE state = ? ORDER BY created_at ASC',
    [state]
  );
  return (rows as Record<string, unknown>[] ?? []).map(rowToPrintJob);
}

export async function listAllJobs(): Promise<PrintJob[]> {
  const db = await getDatabase();
  const rows = await db.getFirstAsync<unknown[]>('SELECT * FROM print_jobs ORDER BY created_at DESC');
  return (rows as Record<string, unknown>[] ?? []).map(rowToPrintJob);
}

export async function updateJobState(
  id: string,
  state: PrintJobState,
  error: string | null = null,
  nextRetryAt?: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existingJob = await getJobById(id);
  const attempts = state === 'retry_wait' 
    ? (existingJob?.attempts ?? 0) + 1 
    : (existingJob?.attempts ?? 0);
  
  await db.runAsync(
    `UPDATE print_jobs SET state = ?, attempts = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?`,
    [state, attempts, error, nextRetryAt ?? null, now, id]
  );
}

export async function deleteJob(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM print_jobs WHERE id = ?', [id]);
}

export async function resetJobs(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM print_jobs');
}

export async function resetPrinters(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM printers');
}

function rowToPrintJob(row: Record<string, unknown>): PrintJob {
  return {
    id: row.id as string,
    printerId: row.printer_id as string,
    documentType: row.document_type as 'card_receipt' | 'diagnostics',
    payload: row.payload as string,
    state: row.state as PrintJobState,
    attempts: row.attempts as number,
    lastError: row.last_error as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    nextRetryAt: row.next_retry_at as string | undefined,
  };
}