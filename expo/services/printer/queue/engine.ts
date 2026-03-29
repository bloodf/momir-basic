import type { PrintJob, PrinterCapabilities } from '@/types';
import { getNextJobForPrinter, updateJobState, getJobById, getJobsForPrinter, getPrinterById } from '../storage/repositories';
import { EscPosRenderer } from '../render/escpos';
import { CardReceiptDocument, DiagnosticsDocument } from '../render/document';
import { createAdapter } from '../adapters/factory';
import { getPrinterPreferencesFromSettings } from '../../../providers/SettingsProvider';
import type { PrinterPort as AppPrinterPort } from '../adapters/port';

export type PrintFailureType =
  | 'pre_write'
  | 'uncertain_write';

export interface PrintRenderer {
  render(payload: string, documentType: 'card_receipt' | 'diagnostics', capabilities: PrinterCapabilities): Promise<Uint8Array[]>;
}

export interface PrinterPort {
  connect(printerId: string): Promise<void>;
  disconnect(): Promise<void>;
  send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'>;
}

class AdapterWrapper implements PrinterPort {
  constructor(private adapter: AppPrinterPort) {}

  async connect(printerId: string): Promise<void> {
    await this.adapter.connectPrinter(printerId);
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnectPrinter('');
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

    if (job.state === 'queued') {
      await updateJobState(job.id, 'dispatching');
    } else if (job.state === 'retry_wait') {
      await updateJobState(job.id, 'dispatching');
    }

    this.activePrinters.add(printerId);

    const claimedJob = await getJobById(job.id);
    return claimedJob;
  }

  async dispatch(
    job: PrintJob,
    renderer: PrintRenderer,
    adapter: PrinterPort,
    capabilities: PrinterCapabilities
  ): Promise<{ success: boolean; error?: string; failureType?: PrintFailureType }> {
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
      await adapter.connect(job.printerId);
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
          error: 'Print result uncertain - printer state unknown',
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
      // Intentionally swallow — disconnect after send is non-fatal
    }

    return { success: true };
  }

  async recordTerminalState(
    job: PrintJob,
    result: { success: boolean; error?: string; failureType?: PrintFailureType }
  ): Promise<void> {
    const printerId = job.printerId;
    this.activePrinters.delete(printerId);

    if (result.success) {
      await updateJobState(job.id, 'completed', null);
      return;
    }

    if (result.failureType === 'uncertain_write') {
      await updateJobState(job.id, 'failed_manual', result.error ?? 'Print result uncertain');
      return;
    }

    const currentJob = await getJobById(job.id);
    if (!currentJob) return;

    const attempts = currentJob.attempts + 1;

    if (attempts > MAX_AUTO_RETRIES) {
      await updateJobState(job.id, 'failed_manual', result.error ?? 'Max retries exceeded');
      return;
    }

    const backoffIndex = Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1);
    const backoffMs = RETRY_BACKOFF_MS[backoffIndex];
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    await updateJobState(job.id, 'retry_wait', result.error ?? 'Print failed', nextRetryAt);
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

  let job = await queueEngine.claimJob(printerId);
  while (job) {
    const result = await queueEngine.dispatch(job, queueRenderer, adapter, capabilities);
    await queueEngine.recordTerminalState(job, result);

    const nextJob = await queueEngine.claimJob(printerId);
    if (!nextJob) break;
    job = nextJob;
  }
}

export async function retryJob(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  if (!job) return;
  if (job.state !== 'failed_manual') return;
  await updateJobState(jobId, 'queued');
}

export async function getQueueSummary(printerId: string): Promise<{
  pending: number;
  completed: number;
  failed: number;
  failedJobs: PrintJob[];
}> {
  const jobs = await getJobsForPrinter(printerId);
  const pending = jobs.filter(j => j.state === 'queued' || j.state === 'retry_wait' || j.state === 'dispatching' || j.state === 'ready').length;
  const completed = jobs.filter(j => j.state === 'completed').length;
  const failedJobs = jobs.filter(j => j.state === 'failed_manual');
  return {
    pending,
    completed,
    failed: failedJobs.length,
    failedJobs,
  };
}
