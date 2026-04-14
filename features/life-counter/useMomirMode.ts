import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { fetchRandomCard, getLocalizedScryfallErrorMessage } from '@/services/scryfall';
import { showToast } from '@/components/Toast';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';

const MOMIR_CMC_VALUES = Array.from({ length: 21 }, (_, index) => index);

export function useMomirMode() {
  const router = useRouter();
  const { addCard } = useHistoryStore();
  const { settings } = useSettingsStore();
  const { t, locale } = useI18n();

  const momirCastMutation = useMutation({
    mutationFn: async (cmc: number) => fetchRandomCard('creature', cmc, settings.excludeFunnySets, 3, locale),
    onSuccess: (card) => {
      addCard(card);
      router.push({ pathname: '/card', params: { cardJson: JSON.stringify(card) } });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t.errors.fetchFailed,
        message: getLocalizedScryfallErrorMessage(error, t.errors),
      });
    },
  });

  const castMomirCreature = useCallback((cmc: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    momirCastMutation.mutate(cmc);
  }, [momirCastMutation]);

  const getMomirCmcValues = useCallback(() => MOMIR_CMC_VALUES, []);

  return {
    isPending: momirCastMutation.isPending,
    castMomirCreature,
    getMomirCmcValues,
  };
}
