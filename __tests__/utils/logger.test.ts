import { ErrorCategory, logger } from '@/utils/logger';

describe('logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('ErrorCategory', () => {
    it('has all required categories', () => {
      expect(ErrorCategory.Storage).toBe('storage');
      expect(ErrorCategory.Network).toBe('network');
      expect(ErrorCategory.Navigation).toBe('navigation');
      expect(ErrorCategory.Printer).toBe('printer');
      expect(ErrorCategory.Render).toBe('render');
    });
  });

  describe('logger.error', () => {
    it('logs with [STORAGE] prefix when ErrorCategory.Storage is used', () => {
      const error = new Error('disk full');
      logger.error(ErrorCategory.Storage, 'Failed to persist locale', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[STORAGE] Failed to persist locale',
        error,
      );
    });

    it('always produces output regardless of __DEV__', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = false;

        logger.error(ErrorCategory.Network, 'Request failed');

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });
  });

  describe('logger.warn', () => {
    it('logs with [NAVIGATION] prefix when ErrorCategory.Navigation is used', () => {
      const error = new Error('URL rejected');
      logger.warn(ErrorCategory.Navigation, 'Failed to open external URL', error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[NAVIGATION] Failed to open external URL',
        error,
      );
    });

    it('always produces output regardless of __DEV__', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = false;

        logger.warn(ErrorCategory.Printer, 'Background merge failed');

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });
  });

  describe('logger.debug', () => {
    it('is a no-op when __DEV__ is false', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = false;

        logger.debug(ErrorCategory.Network, 'Fetching card');

        expect(consoleLogSpy).not.toHaveBeenCalled();
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });

    it('logs when __DEV__ is true', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = true;

        logger.debug(ErrorCategory.Network, 'Fetching card');

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[NETWORK] Fetching card',
        );
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });
  });

  describe('logger.info', () => {
    it('is a no-op when __DEV__ is false', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = false;

        logger.info(ErrorCategory.Network, 'Online status changed');

        expect(consoleLogSpy).not.toHaveBeenCalled();
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });

    it('logs when __DEV__ is true', () => {
      const originalDev = globalThis.__DEV__;
      try {
        // @ts-expect-error - __DEV__ is a React Native global
        globalThis.__DEV__ = true;

        logger.info(ErrorCategory.Network, 'Online status changed');

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[NETWORK] Online status changed',
        );
      } finally {
        // @ts-expect-error - restoring
        globalThis.__DEV__ = originalDev;
      }
    });
  });

  describe('defensive logging', () => {
    it('never throws even if console.error itself throws', () => {
      consoleErrorSpy.mockRestore();
      const throwingSpy = jest.fn(() => {
        throw new Error('console is broken');
      });
      jest.spyOn(console, 'error').mockImplementation(throwingSpy);

      // Should NOT throw
      expect(() => {
        logger.error(ErrorCategory.Storage, 'test', new Error('inner'));
      }).not.toThrow();

      jest.restoreAllMocks();
    });
  });

  describe('error parameter handling', () => {
    it('logs without error parameter', () => {
      logger.error(ErrorCategory.Network, 'Request failed');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NETWORK] Request failed',
      );
    });

    it('logs with error parameter', () => {
      const error = new Error('timeout');
      logger.error(ErrorCategory.Network, 'Request failed', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NETWORK] Request failed',
        error,
      );
    });

    it('formats category as uppercase', () => {
      logger.warn(ErrorCategory.Printer, 'test message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PRINTER] test message',
      );
    });
  });
});