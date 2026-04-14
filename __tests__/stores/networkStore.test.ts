jest.mock('@/components/Toast', () => ({
  showToast: jest.fn(),
}));

describe('useNetworkStore', () => {
  const loadNetInfoMock = () => require('@react-native-community/netinfo');
  const loadToastMock = () => require('@/components/Toast') as {
    showToast: jest.Mock;
  };
  const loadStoreModule = () => require('@/stores/networkStore') as typeof import('@/stores/networkStore');

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    loadNetInfoMock().__reset();
    loadToastMock().showToast.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ status: 200 }) as unknown as typeof fetch;
  });

  afterEach(() => {
    const { cleanupNetworkListener } = loadStoreModule();
    cleanupNetworkListener();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with online and reachable defaults', () => {
    const { useNetworkStore } = loadStoreModule();

    expect(useNetworkStore.getState().isOnline).toBe(true);
    expect(useNetworkStore.getState().isReachable).toBe(true);
  });

  it('subscribes to NetInfo and updates online state on changes', () => {
    const NetInfo = loadNetInfoMock();
    const { initNetworkListener, useNetworkStore } = loadStoreModule();

    initNetworkListener();
    NetInfo.__emit({ isConnected: true, isInternetReachable: true });

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(useNetworkStore.getState().isOnline).toBe(true);
  });

  it('suppresses the first four offline events during cold start', () => {
    const NetInfo = loadNetInfoMock();
    const { initNetworkListener, useNetworkStore } = loadStoreModule();
    const { showToast } = loadToastMock();

    initNetworkListener();

    for (let index = 0; index < 4; index += 1) {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
      expect(useNetworkStore.getState().isOnline).toBe(true);
    }

    expect(showToast).not.toHaveBeenCalled();
  });

  it('marks offline and shows a warning toast after the suppression threshold', () => {
    const NetInfo = loadNetInfoMock();
    const { initNetworkListener, useNetworkStore } = loadStoreModule();
    const { showToast } = loadToastMock();

    initNetworkListener();

    for (let index = 0; index < 5; index += 1) {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    }

    expect(useNetworkStore.getState().isOnline).toBe(false);
    expect(useNetworkStore.getState().isReachable).toBe(false);
    expect(showToast).toHaveBeenCalledWith({
      type: 'warning',
      title: 'You are offline',
      message: 'Some features may not be available',
      duration: 6000,
    });
  });

  it('shows a success toast when connectivity returns after being offline', () => {
    const NetInfo = loadNetInfoMock();
    const { initNetworkListener, useNetworkStore } = loadStoreModule();
    const { showToast } = loadToastMock();

    initNetworkListener();
    for (let index = 0; index < 5; index += 1) {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    }

    showToast.mockClear();
    NetInfo.__emit({ isConnected: true, isInternetReachable: true });

    expect(useNetworkStore.getState().isOnline).toBe(true);
    expect(showToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'Back online',
      message: 'Connection restored',
      duration: 3000,
    });
  });

  it('cleanup unsubscribes and clears the reachability interval', () => {
    const NetInfo = loadNetInfoMock();
    const { initNetworkListener, cleanupNetworkListener } = loadStoreModule();

    initNetworkListener();
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    cleanupNetworkListener();

    expect(NetInfo.addEventListener.mock.results[0]?.value).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('checkNow calls NetInfo.fetch', async () => {
    const NetInfo = loadNetInfoMock();
    const { useNetworkStore } = loadStoreModule();

    useNetworkStore.getState().checkNow();
    await Promise.resolve();

    expect(NetInfo.fetch).toHaveBeenCalledTimes(1);
  });
});
