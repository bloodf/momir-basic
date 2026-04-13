import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorCategory } from '@/utils/logger';
import { safeJsonParse } from '@/utils/safe-json-parse';

describe('safeJsonParse', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns fallback when input is null', () => {
    const result = safeJsonParse(null, { default: true }, 'test_key');

    expect(result).toEqual({ default: true });
  });

  it('returns parsed value when input is valid JSON', () => {
    const data = { name: 'test', value: 42 };
    const result = safeJsonParse(JSON.stringify(data), {}, 'test_key');

    expect(result).toEqual(data);
  });

  it('returns fallback and calls AsyncStorage.removeItem when input is corrupted JSON', async () => {
    const corrupted = '{invalid json}}}';
    const fallback = { safe: true };
    const result = safeJsonParse(corrupted, fallback, 'corrupted_key');

    expect(result).toEqual(fallback);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('corrupted_key');
  });

  it('logs error with ErrorCategory.Storage and key name on parse failure', () => {
    const corrupted = 'not valid json at all';
    safeJsonParse(corrupted, [], 'broken_key');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [formattedMessage, error] = consoleErrorSpy.mock.calls[0];
    expect(formattedMessage).toContain('[STORAGE]');
    expect(formattedMessage).toContain('broken_key');
    expect(error).toBeDefined();
  });

  it('returns fallback when input is empty string', () => {
    const result = safeJsonParse('', [1, 2, 3], 'empty_key');

    expect(result).toEqual([1, 2, 3]);
  });
});