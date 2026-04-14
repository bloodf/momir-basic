import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Card } from '@/types';

export function useCardNavigation(initialCards: Card[]) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);

  const cardEntryAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(1.08)).current;

  const card = cards[currentIndex];
  const isMulti = cards.length > 1;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardEntryAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(heroScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardEntryAnim, heroScale]);

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    heroScale.setValue(1.05);
    cardEntryAnim.setValue(0.5);
    setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1));
    Animated.parallel([
      Animated.timing(cardEntryAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(heroScale, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [cards.length, cardEntryAnim, heroScale]);

  const goPrev = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    heroScale.setValue(1.05);
    cardEntryAnim.setValue(0.5);
    setCurrentIndex(prev => Math.max(0, prev - 1));
    Animated.parallel([
      Animated.timing(cardEntryAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(heroScale, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [cardEntryAnim, heroScale]);

  const handleToggleFace = useCallback(() => {
    if (!card?.faces || card.faces.length < 2) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setActiveFaceIndex((prev) => (prev === 0 ? 1 : 0));
  }, [card?.faces]);

  return {
    cards,
    setCards,
    currentIndex,
    setCurrentIndex,
    activeFaceIndex,
    setActiveFaceIndex,
    cardEntryAnim,
    heroScale,
    card,
    isMulti,
    goNext,
    goPrev,
    handleToggleFace,
  };
}
