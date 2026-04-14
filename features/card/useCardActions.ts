import { useCallback } from 'react';
import { Platform, Alert, Share, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchRandomCard, getLocalizedScryfallErrorMessage } from '@/services/scryfall';
import { getCardFaceDisplayData } from '@/utils/cardFaces';
import { showToast } from '@/components/Toast';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';
import type { Card } from '@/types';

interface UseCardActionsProps {
  card: Card | undefined;
  cardType: string;
  currentIndex: number;
  activeFaceIndex: number;
  setCards: (fn: (prev: Card[]) => Card[]) => void;
  heroScale: Animated.Value;
  cardEntryAnim: Animated.Value;
  onPrint: () => void;
}

export function useCardActions({
  card,
  currentIndex,
  activeFaceIndex,
  setCards,
  heroScale,
  cardEntryAnim,
  onPrint,
}: UseCardActionsProps) {
  const { addCard } = useHistoryStore();
  const { settings } = useSettingsStore();
  const { t, locale } = useI18n();

  const rerollMutation = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      const typeLine = card.typeLine.toLowerCase();
      let type: 'creature' | 'artifact' | 'enchantment' = 'creature';
      if (typeLine.includes('artifact')) type = 'artifact';
      else if (typeLine.includes('enchantment')) type = 'enchantment';
      return fetchRandomCard(type, card.cmc, settings.excludeFunnySets, 3, locale);
    },
    onSuccess: (newCard) => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addCard(newCard);
      heroScale.setValue(1.08);
      cardEntryAnim.setValue(0);
      setCards(prev => {
        const updated = [...prev];
        updated[currentIndex] = newCard;
        return updated;
      });
      Animated.parallel([
        Animated.timing(cardEntryAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(heroScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t.errors.fetchFailed,
        message: getLocalizedScryfallErrorMessage(error, t.errors),
      });
    },
  });

  const handleReroll = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rerollMutation.mutate();
  }, [rerollMutation]);

  return {
    rerollPending: rerollMutation.isPending,
    isSharing: false,
    isDownloading: false,
    autoPrintTriggered: false,
    handleShare: async () => {
      if (!card) return;
      const displayCard = getCardFaceDisplayData(card, activeFaceIndex);
      const artist = displayCard.artist ?? t.card.unknownArtist;
      try {
        await Share.share({
          message: `${displayCard.name} — ${t.card.artBy(artist)}\n${card.scryfallUri}`,
          url: displayCard.artCropUrl,
        });
      } catch {
        Alert.alert('Share Failed', 'Unable to share card art right now.');
      }
    },
    handleDownload: async () => {
      if (!card) return;
      const displayCard = getCardFaceDisplayData(card, activeFaceIndex);
      if (Platform.OS === 'web') {
        try {
          const link = document.createElement('a');
          link.href = displayCard.artCropUrl;
          link.target = '_blank';
          link.download = `${displayCard.name.replace(/[^a-zA-Z0-9]/g, '_')}_art.jpg`;
          link.click();
        } catch {
          Alert.alert('Download Failed', 'Unable to open the art download in this browser.');
        }
      } else {
        Alert.alert('Download', 'Art download requires a development build with file system access.');
      }
    },
    handleReroll,
    navigateToPrint: onPrint,
  };
}
