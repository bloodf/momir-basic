import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Card } from '@/types';
import { safeJsonParse } from '@/utils/safe-json-parse';

const HISTORY_KEY = 'momir_card_history';

export const [HistoryProvider, useHistory] = createContextHook(() => {
  const [cards, setCards] = useState<Card[]>([]);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['cardHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      return safeJsonParse<Card[]>(stored, [], HISTORY_KEY);
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setCards(historyQuery.data);
    }
  }, [historyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: Card[]) => {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cardHistory'] });
    },
  });

  const addCard = useCallback((card: Card) => {
    setCards(prev => {
      const updated = [card, ...prev];
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const addCards = useCallback((newCards: Card[]) => {
    setCards(prev => {
      const updated = [...newCards, ...prev];
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const removeCard = useCallback((cardId: string) => {
    setCards(prev => {
      const updated = prev.filter(c => c.id !== cardId);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const clearHistory = useCallback(() => {
    setCards([]);
    saveMutation.mutate([]);
  }, [saveMutation]);

  return useMemo(() => ({
    cards,
    addCard,
    addCards,
    removeCard,
    clearHistory,
    isLoading: historyQuery.isLoading,
  }), [cards, addCard, addCards, removeCard, clearHistory, historyQuery.isLoading]);
});

export function useFilteredHistory(search: string, typeFilter?: string, cmcFilter?: number) {
  const { cards } = useHistory();
  return useMemo(() => {
    let filtered = cards;
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(lower));
    }
    if (typeFilter) {
      filtered = filtered.filter(c => c.typeLine.toLowerCase().includes(typeFilter.toLowerCase()));
    }
    if (cmcFilter !== undefined && cmcFilter >= 0) {
      filtered = filtered.filter(c => c.cmc === cmcFilter);
    }
    return filtered;
  }, [cards, search, typeFilter, cmcFilter]);
}
