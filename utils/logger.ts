/**
 * Structured logger with typed error categories and severity-gated output.
 *
 * - error / warn: always emit (visible in production)
 * - info / debug: only emit in __DEV__ builds
 * - All console calls are wrapped in try-catch so the logger never throws.
 *
 * Follows the PrinterAdapterError / PrinterErrorCode pattern from
 * services/printer/adapters/port.ts.
 */

/** Error categories for classified logging. */
export enum ErrorCategory {
  Storage = 'storage',
  Network = 'network',
  Navigation = 'navigation',
  Printer = 'printer',
  Render = 'render',
}

/** Log severity levels. Debug and info are no-ops in production. */
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Format the category into an uppercase bracket prefix. */
function formatPrefix(category: ErrorCategory): string {
  return `[${category.toUpperCase()}]`;
}

/**
 * Internal log dispatcher.
 *
 * Wraps every console call in try-catch to prevent logger crashes
 * (per threat model T-01-02: logger must never throw, even if
 * console is broken).
 */
function log(level: LogLevel, category: ErrorCategory, message: string, error?: unknown): void {
  // Suppress debug/info in production builds
  if (!__DEV__ && (level === 'debug' || level === 'info')) {
    return;
  }

  const formatted = `${formatPrefix(category)} ${message}`;
  const args: unknown[] = error !== undefined ? [formatted, error] : [formatted];

  try {
    switch (level) {
      case 'error':
        console.error(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'info':
      case 'debug':
        console.log(...args);
        break;
    }
  } catch {
    // Intentionally swallow — logger must never throw (T-01-02)
  }
}

/** Structured logger with severity-gated output. */
export const logger = {
  error(category: ErrorCategory, message: string, error?: unknown): void {
    log('error', category, message, error);
  },
  warn(category: ErrorCategory, message: string, error?: unknown): void {
    log('warn', category, message, error);
  },
  info(category: ErrorCategory, message: string, error?: unknown): void {
    log('info', category, message, error);
  },
  debug(category: ErrorCategory, message: string, error?: unknown): void {
    log('debug', category, message, error);
  },
};