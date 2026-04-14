import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Animated, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { CARD_TYPES } from '@/constants/cardTypes';
import { ErrorCategory, logger } from '@/utils/logger';
import { fetchRandomBgCardForType } from '@/services/scryfall';
import type { BgCardData } from '@/services/scryfall';
import type { CardType } from '@/types';
import { startHeroArtRotationInterval } from '@/app/(tabs)/(home)/heroRotation';
import { markHeroArtAsWarm } from '@/app/(tabs)/(home)/heroArtCache';

const EMPTY_BG_DATA: BgCardData = { artUrl: '', colors: [] };
const MAX_BG_ROTATION_FETCH_ATTEMPTS = 3;

export function getDominantColor(colors: string[]): string {
  if (colors.length === 0) return Colors.background;
  const colorMap: Record<string, string> = {
    W: '#1f1c16',
    U: '#0d161e',
    B: '#161214',
    R: '#1e1210',
    G: '#101a14',
  };
  return colorMap[colors[0]] ?? Colors.background;
}

export function useHeroBackground(cardType: CardType, typeIndex: number) {
  const queryClient = useQueryClient();

  const bgFadeAnim = useRef(new Animated.Value(0)).current;
  const heroImageScale = useRef(new Animated.Value(1.05)).current;

  const bgCache = useRef<Partial<Record<CardType, BgCardData>>>({});
  const bgPrefetchCache = useRef<Partial<Record<CardType, BgCardData>>>({});
  const warmedArtUrlsRef = useRef<Record<string, true>>({});
  const warmedArtUrlOrderRef = useRef<string[]>([]);
  const warmingArtPromisesRef = useRef<Record<string, Promise<boolean>>>({});
  const rotationCleanupRef = useRef<(() => void) | null>(null);
  const currentCardTypeRef = useRef<CardType>(cardType);
  const isHomeFocusedRef = useRef(false);
  const appStateStatusRef = useRef(AppState.currentState);
  const currentBgDataRef = useRef<BgCardData>(EMPTY_BG_DATA);
  const initializedBgTypeRef = useRef<CardType | null>(null);

  const [currentBgData, setCurrentBgData] = useState<BgCardData>(EMPTY_BG_DATA);
  const [currentBgType, setCurrentBgType] = useState<CardType>(cardType);
  const [isHomeFocused, setIsHomeFocused] = useState(false);
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState);

  const bgQuery = useQuery({
    queryKey: ['bgArt', cardType],
    queryFn: async () => {
      if (bgCache.current[cardType]) {
        return bgCache.current[cardType];
      }
      const data = await fetchRandomBgCardForType(cardType as CardType);
      bgCache.current[cardType] = data;
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const dominantColor = useMemo(
    () => getDominantColor(currentBgData.colors),
    [currentBgData.colors],
  );

  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);

      return () => {
        setIsHomeFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppStateStatus);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    currentCardTypeRef.current = cardType;
  }, [cardType]);

  useEffect(() => {
    isHomeFocusedRef.current = isHomeFocused;
  }, [isHomeFocused]);

  useEffect(() => {
    appStateStatusRef.current = appStateStatus;
  }, [appStateStatus]);

  useEffect(() => {
    currentBgDataRef.current = currentBgData;
  }, [currentBgData]);

  const stopHeroRotation = useCallback(() => {
    rotationCleanupRef.current?.();
    rotationCleanupRef.current = null;
  }, []);

  const fetchDistinctBgCardForType = useCallback(async (type: CardType, currentArtUrl: string) => {
    for (let attempt = 0; attempt < MAX_BG_ROTATION_FETCH_ATTEMPTS; attempt += 1) {
      const nextBg = await fetchRandomBgCardForType(type);
      if (nextBg.artUrl && nextBg.artUrl !== currentArtUrl) {
        return nextBg;
      }
    }

    return EMPTY_BG_DATA;
  }, []);

  const warmHeroArt = useCallback((artUrl: string) => {
    if (!artUrl) {
      return Promise.resolve(false);
    }

    if (warmedArtUrlsRef.current[artUrl]) {
      markHeroArtAsWarm(warmedArtUrlOrderRef.current, warmedArtUrlsRef.current, artUrl);
      return Promise.resolve(true);
    }

    const existingPromise = warmingArtPromisesRef.current[artUrl];
    if (existingPromise) {
      return existingPromise;
    }

    const warmingPromise = Image.prefetch(artUrl, 'memory-disk')
      .then((didWarm) => {
        if (didWarm) {
          markHeroArtAsWarm(warmedArtUrlOrderRef.current, warmedArtUrlsRef.current, artUrl);
        }

        return didWarm;
      })
      .catch(() => false)
      .finally(() => {
        delete warmingArtPromisesRef.current[artUrl];
      });

    warmingArtPromisesRef.current[artUrl] = warmingPromise;
    return warmingPromise;
  }, []);

  const prefetchNextBgCardForType = useCallback(async (type: CardType, currentArtUrl: string) => {
    const prefetched = bgPrefetchCache.current[type];

    if (prefetched?.artUrl && prefetched.artUrl !== currentArtUrl) {
      void warmHeroArt(prefetched.artUrl);
      return prefetched;
    }

    const nextBg = await fetchDistinctBgCardForType(type, currentArtUrl);
    if (nextBg.artUrl && await warmHeroArt(nextBg.artUrl)) {
      bgPrefetchCache.current[type] = nextBg;
    }

    return nextBg;
  }, [fetchDistinctBgCardForType, warmHeroArt]);

  const getNextBgCardForType = useCallback(async (type: CardType, currentArtUrl: string) => {
    const prefetched = bgPrefetchCache.current[type];
    delete bgPrefetchCache.current[type];

    if (prefetched?.artUrl && prefetched.artUrl !== currentArtUrl) {
      return prefetched;
    }

    const nextBg = await fetchDistinctBgCardForType(type, currentArtUrl);
    if (nextBg.artUrl) {
      await warmHeroArt(nextBg.artUrl);
    }

    return nextBg;
  }, [fetchDistinctBgCardForType, warmHeroArt]);

  const applyBgData = useCallback((type: CardType, nextBg: BgCardData) => {
    if (!nextBg.artUrl) {
      return;
    }

    bgCache.current[type] = nextBg;
    queryClient.setQueryData(['bgArt', type], nextBg);
    setCurrentBgType(type);
    setCurrentBgData(nextBg);
  }, [queryClient]);

  const rotateHeroArt = useCallback(async (type: CardType) => {
    const activeArtUrl = currentBgDataRef.current.artUrl;

    if (!activeArtUrl) {
      return;
    }

    const nextBg = await getNextBgCardForType(type, activeArtUrl);

    if (
      !nextBg.artUrl ||
      nextBg.artUrl === activeArtUrl ||
      !isHomeFocusedRef.current ||
      appStateStatusRef.current !== 'active' ||
      currentCardTypeRef.current !== type
    ) {
      return;
    }

    applyBgData(type, nextBg);
    void prefetchNextBgCardForType(type, nextBg.artUrl);
  }, [applyBgData, getNextBgCardForType, prefetchNextBgCardForType]);

  const isHeroRotationActive = isHomeFocused && appStateStatus === 'active' && currentBgType === cardType && Boolean(currentBgData.artUrl);

  useEffect(() => {
    stopHeroRotation();

    if (!isHeroRotationActive) {
      return;
    }

    rotationCleanupRef.current = startHeroArtRotationInterval(() => {
      void rotateHeroArt(cardType);
    });

    return stopHeroRotation;
  }, [cardType, isHeroRotationActive, rotateHeroArt, stopHeroRotation]);

  useEffect(() => {
    const timers = CARD_TYPES.map((ct, idx) => {
      if (idx === typeIndex) {
        return null;
      }

      if (bgCache.current[ct.id]?.artUrl) {
        void warmHeroArt(bgCache.current[ct.id]?.artUrl ?? '');
        return null;
      }

      return setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['bgArt', ct.id],
          queryFn: () => fetchRandomBgCardForType(ct.id),
          staleTime: Infinity,
        }).then(async () => {
          const cached = queryClient.getQueryData<BgCardData>(['bgArt', ct.id]);
          if (cached) {
            bgCache.current[ct.id] = cached;
            if (cached.artUrl) {
              await warmHeroArt(cached.artUrl);
            }
          }
        }).catch((error) => {
          logger.warn(ErrorCategory.Network, 'Hero art prefetch failed', error);
        });
      }, idx * 300);
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, [queryClient, typeIndex, warmHeroArt]);

  useEffect(() => {
    if (!bgQuery.data?.artUrl) {
      return;
    }

    if (initializedBgTypeRef.current === cardType) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await warmHeroArt(bgQuery.data.artUrl);

      if (cancelled) {
        return;
      }

      initializedBgTypeRef.current = cardType;
      applyBgData(cardType, bgQuery.data);
      void prefetchNextBgCardForType(cardType, bgQuery.data.artUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyBgData, bgQuery.data, cardType, prefetchNextBgCardForType, warmHeroArt]);

  useEffect(() => {
    if (currentBgData.artUrl) {
      bgFadeAnim.setValue(0);
      heroImageScale.setValue(1.05);
      Animated.parallel([
        Animated.timing(bgFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heroImageScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentBgData.artUrl, bgFadeAnim, heroImageScale]);

  return {
    currentBgData,
    currentBgType,
    dominantColor,
    bgFadeAnim,
    heroImageScale,
  };
}
