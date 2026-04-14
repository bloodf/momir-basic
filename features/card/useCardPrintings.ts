import { useState, useCallback, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchCardPrintings } from '@/services/scryfall';
import type { CardPrinting } from '@/services/scryfall';
import { ErrorCategory, logger } from '@/utils/logger';

export function useCardPrintings() {
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [printingsExpanded, setPrintingsExpanded] = useState(false);
  const [printingsLoading, setPrintingsLoading] = useState(false);
  const [printingsFetched, setPrintingsFetched] = useState(false);

  const chevronRotation = useRef(new Animated.Value(0)).current;

  const togglePrintings = useCallback(async (cardName: string | undefined) => {
    if (!cardName) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();

    if (!printingsFetched && !printingsLoading) {
      setPrintingsLoading(true);
      try {
        const results = await fetchCardPrintings(cardName);
        setPrintings(results);
        setPrintingsFetched(true);
      } catch (error) {
        logger.debug(ErrorCategory.Network, 'Printings fetch failed', error);
        setPrintings([]);
      } finally {
        setPrintingsLoading(false);
      }
    }

    const expanding = !printingsExpanded;
    setPrintingsExpanded(expanding);

    Animated.parallel([
      Animated.timing(chevronRotation, {
        toValue: expanding ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [printingsExpanded, printingsFetched, printingsLoading, chevronRotation]);

  const resetPrintings = useCallback((_cardId: string | undefined) => {
    setPrintingsExpanded(false);
    setPrintings([]);
    setPrintingsFetched(false);
    chevronRotation.setValue(0);
  }, [chevronRotation]);

  return {
    printings,
    printingsExpanded,
    printingsLoading,
    printingsFetched,
    chevronRotation,
    togglePrintings,
    resetPrintings,
    setPrintingsExpanded,
  };
}
