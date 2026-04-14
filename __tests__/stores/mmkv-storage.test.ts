describe('MMKVStorage', () => {
  const loadModule = () => require('@/stores/mmkv-storage') as typeof import('@/stores/mmkv-storage');
  const loadMMKVMock = () => require('react-native-mmkv') as {
    __resetMMKVMock: () => void;
  };

  beforeEach(() => {
    jest.resetModules();
    loadMMKVMock().__resetMMKVMock();
    jest.clearAllMocks();
  });

  it('returns null for missing keys', () => {
    const { MMKVStorage } = loadModule();

    expect(MMKVStorage.getItem('missing')).toBeNull();
  });

  it('returns the stored string for an existing key', () => {
    const { MMKVStorage, mmkvInstance } = loadModule();
    mmkvInstance.set('settings', JSON.stringify({ enabled: true }));

    expect(MMKVStorage.getItem('settings')).toBe('{"enabled":true}');
  });

  it('stores a value that can be retrieved', () => {
    const { MMKVStorage } = loadModule();

    MMKVStorage.setItem('settings', '{"theme":"dark"}');

    expect(MMKVStorage.getItem('settings')).toBe('{"theme":"dark"}');
  });

  it('removes a value so subsequent reads return null', () => {
    const { MMKVStorage } = loadModule();

    MMKVStorage.setItem('history', '["a"]');
    MMKVStorage.removeItem('history');

    expect(MMKVStorage.getItem('history')).toBeNull();
  });

  it('clears corrupted JSON and returns null', () => {
    const { MMKVStorage, mmkvInstance } = loadModule();
    mmkvInstance.set('broken', '{bad-json');

    expect(MMKVStorage.getItem('broken')).toBeNull();
    expect(mmkvInstance.contains('broken')).toBe(false);
  });
});
