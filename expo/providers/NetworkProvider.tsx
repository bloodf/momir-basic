import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform, AppState } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/Toast';

async function checkConnectivity(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://api.scryfall.com/health', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export const [NetworkProvider, useNetwork] = createContextHook(() => {
  const queryClient = useQueryClient();
  const wasOfflineRef = useRef(false);
  const hasShownOfflineRef = useRef(false);

  const connectivityQuery = useQuery({
    queryKey: ['networkConnectivity'],
    queryFn: checkConnectivity,
    refetchInterval: 15000,
    staleTime: 10000,
    gcTime: 30000,
  });

  const isOnline = connectivityQuery.data ?? true;

  useEffect(() => {
    if (!isOnline && !hasShownOfflineRef.current) {
      wasOfflineRef.current = true;
      hasShownOfflineRef.current = true;
      showToast({
        type: 'warning',
        title: 'You are offline',
        message: 'Some features may not be available',
        duration: 6000,
      });
      console.log('[Network] Device went offline');
    }

    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      hasShownOfflineRef.current = false;
      showToast({
        type: 'success',
        title: 'Back online',
        message: 'Connection restored',
        duration: 3000,
      });
      console.log('[Network] Device back online');
    }
  }, [isOnline]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        void queryClient.invalidateQueries({ queryKey: ['networkConnectivity'] });
      };
      const handleOffline = () => {
        void queryClient.invalidateQueries({ queryKey: ['networkConnectivity'] });
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['networkConnectivity'] });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const checkNow = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['networkConnectivity'] });
  }, [queryClient]);

  return useMemo(() => ({
    isOnline,
    isChecking: connectivityQuery.isLoading,
    checkNow,
  }), [isOnline, connectivityQuery.isLoading, checkNow]);
});
