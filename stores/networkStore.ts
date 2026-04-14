import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

import { showToast } from '@/components/Toast';
import { ErrorCategory, logger } from '@/utils/logger';

type NetworkState = {
  isOnline: boolean;
  isReachable: boolean;
  checkNow: () => void;
};

const COLD_START_SUPPRESSION_COUNT = 4;
const REACHABILITY_INTERVAL_MS = 5 * 60 * 1000;

let unsubscribe: (() => void) | null = null;
let reachabilityInterval: ReturnType<typeof setInterval> | null = null;
let offlineEventCount = 0;
let hasShownOfflineToast = false;
let wasOffline = false;

function applyConnectivityState(state: NetInfoState): void {
  const online = state.isConnected === true && state.isInternetReachable !== false;
  const currentOnline = useNetworkStore.getState().isOnline;

  if (online === currentOnline) {
    return;
  }

  if (!online) {
    offlineEventCount += 1;
    if (offlineEventCount <= COLD_START_SUPPRESSION_COUNT) {
      return;
    }

    wasOffline = true;
    hasShownOfflineToast = true;
    useNetworkStore.setState({ isOnline: false, isReachable: false });
    showToast({
      type: 'warning',
      title: 'You are offline',
      message: 'Some features may not be available',
      duration: 6000,
    });
    return;
  }

  useNetworkStore.setState({ isOnline: true });
  if (wasOffline) {
    wasOffline = false;
    hasShownOfflineToast = false;
    showToast({
      type: 'success',
      title: 'Back online',
      message: 'Connection restored',
      duration: 3000,
    });
  }
}

async function runReachabilityCheck(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://api.scryfall.com/health', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    useNetworkStore.setState({ isReachable: response.status > 0 });
  } catch (error) {
    logger.debug(ErrorCategory.Network, 'Reachability check failed', error);
    useNetworkStore.setState({ isReachable: false });
  }
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  isReachable: true,
  checkNow: () => {
    void NetInfo.fetch().then((state) => {
      applyConnectivityState(state);
    });
  },
}));

export function initNetworkListener(): void {
  if (unsubscribe) {
    return;
  }

  unsubscribe = NetInfo.addEventListener((state) => {
    applyConnectivityState(state);
  });

  reachabilityInterval = setInterval(() => {
    void runReachabilityCheck();
  }, REACHABILITY_INTERVAL_MS);
}

export function cleanupNetworkListener(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (reachabilityInterval) {
    clearInterval(reachabilityInterval);
    reachabilityInterval = null;
  }

  offlineEventCount = 0;
  hasShownOfflineToast = false;
  wasOffline = false;
  useNetworkStore.setState({ isOnline: true, isReachable: true });
}
