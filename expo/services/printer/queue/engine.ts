import type { PrintJob, PrinterCapabilities, CanonicalPrinterIdentity } from '@/types';
import { getNextJobForPrinter, updateJobState, getJobById, getJobsForPrinter, getPrinterById } from '../storage/repositories';
import { EscPosRenderer } from '../render/escpos';
import { CardReceiptDocument, DiagnosticsDocument } from '../render/document';
import { createAdapter } from '../adapters/factory';
import { getPrinterPreferencesFromSettings } from '../../../providers/SettingsProvider';
import type { PrinterPort as AppPrinterPort } from '../adapters/port';
import {
  emitJobQueued,
  emitJobDispatched,
  emitJobCompleted,
  emitJobFailed,
  emitJobSentUnknown,
} from '../diagnostics';

export type PrintFailureType =
  | 'pre_write'        // render or connect error — retryable
  | 'uncertain_write'  // disconnect mid-write — sent_unknown, operator action required
  | 'terminal';        // non-retryable hardware error

export interface PrintRenderer {
  render(payload: string, documentType: 'card_receipt' | 'diagnostics', capabilities: PrinterCapabilities): Promise<Uint8Array[]>;
}

export interface PrinterPort {
  connect(identity: CanonicalPrinterIdentity): Promise<void>;
  disconnect(): Promise<void>;
  send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'>;
}

class AdapterWrapper implements PrinterPort {
  constructor(private adapter: AppPrinterPort) {}

  async connect(identity: CanonicalPrinterIdentity): Promise<void> {
    await this.adapter.connectPrinter(identity.address, identity.transport);
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnectPrinter();
  }

  async send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'> {
    try {
      const text = bytes.map(b => new TextDecoder().decode(b)).join('');
      await this.adapter.sendText(text);
      return 'success';
    } catch {
      return 'uncertain';
    }
  }
}

const RETRY_BACKOFF_MS = [15_000, 60_000, 300_000] as const;
const MAX_AUTO_RETRIES = 3;

export class QueueRenderer implements PrintRenderer {
  async render(
    payload: string,
    documentType: 'card_receipt' | 'diagnostics',
    capabilities: PrinterCapabilities
  ): Promise<Uint8Array[]> {
    const escpos = new EscPosRenderer();

    if (documentType === 'card_receipt') {
      const data = JSON.parse(payload);
      const doc = new CardReceiptDocument({
        name: data.name,
        manaCost: data.manaCost,
        type: data.type,
        oracleText: data.oracleText,
        flavorText: data.flavorText,
        power: data.power,
        toughness: data.toughness,
        imageUrl: data.imageUrl,
        setCode: data.setCode,
        scryfallId: data.scryfallId,
      });
      await doc.render(escpos, capabilities);
    } else {
      const data = JSON.parse(payload);
      const doc = new DiagnosticsDocument(
        data.appName,
        data.platform,
        data.transport,
        data.paperWidth,
        data.timestamp
      );
      await doc.render(escpos, capabilities);
    }

    return escpos.getChunks();
  }
}

export class QueueEngine {
  private activePrinters: Set<string> = new Set();

  async claimJob(printerId: string): Promise<PrintJob | null> {
    if (this.activePrinters.has(printerId)) {
      return null;
    }

    const job = await getNextJobForPrinter(printerId);
    if (!job) {
      return null;
    }

    if (job.state === 'queued' || job.state === 'failed_retryable') {
      await updateJobState(job.id, 'printing');
    }

    this.activePrinters.add(printerId);

    const claimedJob = await getJobById(job.id);
    return claimedJob;
  }

  async dispatch(
    job: PrintJob,
    renderer: PrintRenderer,
    adapter: PrinterPort,
    capabilities: PrinterCapabilities,
    identity: CanonicalPrinterIdentity
  ): Promise<{ success: boolean; error?: string; failureType?: PrintFailureType; durationMs?: number }> {
    const dispatchStart = Date.now();
    let bytes: Uint8Array[];
    try {
      bytes = await renderer.render(job.payload, job.documentType, capabilities);
    } catch (renderError) {
      return {
        success: false,
        error: renderError instanceof Error ? renderError.message : 'Render failed',
        failureType: 'pre_write',
      };
    }

    try {
      await adapter.connect(identity);
    } catch (connectError) {
      const error = connectError instanceof Error ? connectError.message : 'Connection failed';
      return { success: false, error, failureType: 'pre_write' };
    }

    try {
      const result = await adapter.send(bytes);
      if (result === 'uncertain') {
        await adapter.disconnect();
        return {
          success: false,
          error: 'Print result uncertain — printer may have received partial data',
          failureType: 'uncertain_write',
        };
      }
    } catch (sendError) {
      const error = sendError instanceof Error ? sendError.message : 'Send failed';
      await adapter.disconnect();
      return { success: false, error, failureType: 'pre_write' };
    }

    try {
      await adapter.disconnect();
    } catch {
      // Intentionally swallow — disconnect after confirmed send is non-fatal
    }

    return { success: true, durationMs: Date.now() - dispatchStart };
  }

  async recordTerminalState(
    job: PrintJob,
    result: { success: boolean; error?: string; failureType?: PrintFailureType; durationMs?: number }
  ): Promise<{ durationMs?: number }> {
    this.activePrinters.delete(job.printerId);
    const address = job.canonicalIdentity?.address ?? 'unknown';

    if (result.success) {
      await updateJobState(job.id, 'printed_confirmed', null);
      emitJobCompleted(job.id, job.printerId, address, job.documentType, result.durationMs ?? 0);
      return { durationMs: result.durationMs };
    }

    if (result.failureType === 'uncertain_write') {
      await updateJobState(job.id, 'sent_unknown', result.error ?? 'Uncertain delivery — operator reconciliation required');
      emitJobSentUnknown(job.id, job.printerId, address, job.documentType, result.durationMs ?? 0);
      return { durationMs: result.durationMs };
    }

    if (result.failureType === 'terminal') {
      await updateJobState(job.id, 'failed_terminal', result.error ?? 'Terminal printer error');
      emitJobFailed(job.id, job.printerId, address, job.documentType, 'terminal', result.error ?? 'Terminal error', job.attempts, result.durationMs ?? 0);
      return { durationMs: result.durationMs };
    }

    const currentJob = await getJobById(job.id);
    if (!currentJob) return {};

    const attempts = currentJob.attempts + 1;

    if (attempts > MAX_AUTO_RETRIES) {
      await updateJobState(job.id, 'failed_terminal', result.error ?? 'Max retries exceeded — operator investigation required');
      emitJobFailed(job.id, job.printerId, address, job.documentType, 'max_retries', result.error ?? 'Max retries exceeded', attempts, result.durationMs ?? 0);
      return { durationMs: result.durationMs };
    }

    const backoffIndex = Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1);
    const backoffMs = RETRY_BACKOFF_MS[backoffIndex];
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    await updateJobState(job.id, 'failed_retryable', result.error ?? 'Print failed', nextRetryAt);
    emitJobFailed(job.id, job.printerId, address, job.documentType, 'retryable', result.error ?? 'Print failed', attempts, result.durationMs ?? 0);
    return { durationMs: result.durationMs };
  }

  releasePrinter(printerId: string): void {
    this.activePrinters.delete(printerId);
  }
}

const queueEngine = new QueueEngine();
const queueRenderer = new QueueRenderer();

export async function processQueue(): Promise<void> {
  const prefs = await getPrinterPreferencesFromSettings();
  const printerId = prefs.preferredPrinterId;
  if (!printerId) return;

  await processQueueForPrinter(printerId);
}

export async function processQueueForPrinter(printerId: string): Promise<void> {
  if (!printerId) return;

  const printer = await getPrinterById(printerId);
  if (!printer) return;

  const appAdapter = createAdapter();
  const adapter = new AdapterWrapper(appAdapter);
  const capabilities = printer.capabilities;
  const identity: CanonicalPrinterIdentity = { address: printer.address, transport: printer.transport };

  let job = await queueEngine.claimJob(printerId);
  while (job) {
    const address = job.canonicalIdentity?.address ?? 'unknown';
    emitJobDispatched(job.id, job.printerId, address, job.documentType, job.attempts);
    const result = await queueEngine.dispatch(job, queueRenderer, adapter, capabilities, identity);
    await queueEngine.recordTerminalState(job, result);

    const nextJob = await queueEngine.claimJob(printerId);
    if (!nextJob) break;
    job = nextJob;
  }
}

export async function retryJob(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  if (!job) return;
  if (job.state !== 'failed_terminal' && job.state !== 'sent_unknown') return;
  await updateJobState(jobId, 'queued');
}

export async function abandonJob(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  if (!job) return;
  await updateJobState(jobId, 'failed_terminal', 'Abandoned by operator');
}

export async function getQueueSummary(printerId: string): Promise<{
  pending: number;
  completed: number;
  uncertain: number;
  failedRetryable: number;
  failedTerminal: number;
  sentUnknownJobs: PrintJob[];
  failedTerminalJobs: PrintJob[];
}> {
  const jobs = await getJobsForPrinter(printerId);
  const pending = jobs.filter(j => j.state === 'queued' || j.state === 'printing').length;
  const completed = jobs.filter(j => j.state === 'printed_confirmed').length;
  const failedRetryable = jobs.filter(j => j.state === 'failed_retryable').length;
  const sentUnknownJobs = jobs.filter(j => j.state === 'sent_unknown');
  const failedTerminalJobs = jobs.filter(j => j.state === 'failed_terminal');
  return {
    pending,
    completed,
    uncertain: sentUnknownJobs.length,
    failedRetryable,
    failedTerminal: failedTerminalJobs.length,
    sentUnknownJobs,
    failedTerminalJobs,
  };
}

export async function resumeQueueAfterRestart(): Promise<void> {
  const prefs = await getPrinterPreferencesFromSettings();
  const printerId = prefs.preferredPrinterId;
  if (!printerId) return;

  const printer = await getPrinterById(printerId);
  if (!printer) return;

  const appAdapter = createAdapter();
  const isCurrentlyConnected = await appAdapter.isConnected(printer.address);
  if (!isCurrentlyConnected) return;

  const summary = await getQueueSummary(printerId);
  if (summary.uncertain > 0 || summary.failedTerminal > 0) {
    return;
  }

  if (summary.pending > 0 || summary.failedRetryable > 0) {
    await processQueueForPrinter(printerId);
  }
}
