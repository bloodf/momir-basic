import type { PrintJob } from '@/types';
import { getNextJobForPrinter, updateJobState, getJobById } from '../storage/repositories';

export type PrintFailureType =
  | 'pre_write'
  | 'uncertain_write';

export interface PrintRenderer {
  render(payload: string): Promise<Uint8Array[]>;
}

export interface PrinterPort {
  connect(printerId: string): Promise<void>;
  disconnect(): Promise<void>;
  send(bytes: Uint8Array[]): Promise<'success' | 'uncertain'>;
}

const RETRY_BACKOFF_MS = [15_000, 60_000, 300_000] as const;
const MAX_AUTO_RETRIES = 3;

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
    adapter: PrinterPort
  ): Promise<{ success: boolean; error?: string; failureType?: PrintFailureType }> {
    let bytes: Uint8Array[];
    try {
      bytes = await renderer.render(job.payload);
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
      // Disconnect error after successful send is non-fatal
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
