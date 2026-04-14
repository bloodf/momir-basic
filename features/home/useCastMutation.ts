import { useCallback } from 'react';
import { Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchRandomCard, fetchMultipleCards, getLocalizedScryfallErrorMessage } from '@/services/scryfall';
import { showToast } from '@/components/Toast';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';
import type { CardType } from '@/types';

interface UseCastMutationParams {
  cmc: number;
  cardType: string;
  multiCount: number;
  excludeFunny: boolean;
  lang: string;
  isMultiCard: boolean;
}

export function useCastMutation(params: UseCastMutationParams) {
  const router = useRouter();
  const { addCard, addCards } = useHistoryStore();
  const { settings } = useSettingsStore();
  const { t, locale } = useI18n();

  const castMutation = useMutation({
    mutationFn: async () => {
      const { cmc, cardType, multiCount, excludeFunny, lang, isMultiCard } = params;
      if (isMultiCard) {
        return fetchMultipleCards(cardType as CardType, multiCount, excludeFunny, lang);
      }
      const card = await fetchRandomCard(cardType as CardType, cmc, excludeFunny, 3, lang);
      return [card];
    },
    onSuccess: (cards) => {
      if (cards.length === 1) {
        addCard(cards[0]);
        router.push({ pathname: '/card', params: { cardJson: JSON.stringify(cards[0]) } });
      } else {
        addCards(cards);
        router.push({ pathname: '/card', params: { cardJson: JSON.stringify(cards[0]), multiCards: JSON.stringify(cards) } });
      }
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t.errors.fetchFailed,
        message: getLocalizedScryfallErrorMessage(error, t.errors),
      });
    },
  });

  const handleCast = useCallback((castScale: Animated.Value, spinAnim: Animated.Value) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(castScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(castScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    spinLoop.start();

    castMutation.mutate(undefined, {
      onSettled: () => {
        spinLoop.stop();
        spinAnim.setValue(0);
      },
    });
  }, [castMutation]);

  return {
    isPending: castMutation.isPending,
    handleCast,
  };
}
