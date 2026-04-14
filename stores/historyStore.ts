import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Card } from '@/types';

import { MMKVStorage } from './mmkv-storage';

export const HISTORY_KEY = 'momir_card_history';

type HistoryState = {
  cards: Card[];
  addCard: (card: Card) => void;
  addCards: (cards: Card[]) => void;
  removeCard: (cardId: string) => void;
  clearHistory: () => void;
};

export function filterHistory(
  cards: Card[],
  search: string,
  typeFilter?: string,
  cmcFilter?: number,
): Card[] {
  let filtered = cards;

  if (search) {
    const normalizedSearch = search.toLowerCase();
    filtered = filtered.filter((card) => card.name.toLowerCase().includes(normalizedSearch));
  }

  if (typeFilter) {
    const normalizedTypeFilter = typeFilter.toLowerCase();
    filtered = filtered.filter((card) => card.typeLine.toLowerCase().includes(normalizedTypeFilter));
  }

  if (cmcFilter !== undefined && cmcFilter >= 0) {
    filtered = filtered.filter((card) => card.cmc === cmcFilter);
  }

  return filtered;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      cards: [],
      addCard: (card) =>
        set((state) => ({
          cards: [card, ...state.cards],
        })),
      addCards: (cards) =>
        set((state) => ({
          cards: [...cards, ...state.cards],
        })),
      removeCard: (cardId) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== cardId),
        })),
      clearHistory: () =>
        set({
          cards: [],
        }),
    }),
    {
      name: HISTORY_KEY,
      storage: createJSONStorage(() => MMKVStorage),
      partialize: (state) => ({
        cards: state.cards,
      }),
    },
  ),
);

export function useFilteredHistory(search: string, typeFilter?: string, cmcFilter?: number): Card[] {
  const cards = useHistoryStore((state) => state.cards);

  return useMemo(
    () => filterHistory(cards, search, typeFilter, cmcFilter),
    [cards, search, typeFilter, cmcFilter],
  );
}
