import { useState, useCallback, useRef, useMemo } from 'react';
import { Animated, Platform, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CARD_TYPES } from '@/constants/cardTypes';
import type { CardType } from '@/types';

const MIN_CMC = 0;
const MAX_CMC = 20;
const MIN_MULTI_COUNT = 1;
const MAX_MULTI_COUNT = 10;

export function useCmcStepper() {
  const [cmc, setCmc] = useState(1);
  const [typeIndex, setTypeIndex] = useState(0);
  const [multiCardCounts, setMultiCardCounts] = useState<Record<string, number>>({});
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  const cmcPulse = useRef(new Animated.Value(1)).current;
  const swipeSlide = useRef(new Animated.Value(0)).current;
  const typeTransition = useRef(new Animated.Value(1)).current;

  const cardType = CARD_TYPES[typeIndex].id;
  const currentTypeConfig = CARD_TYPES[typeIndex];
  const showCmc = currentTypeConfig.useCmc;
  const multiCount = currentTypeConfig.multiCard
    ? (multiCardCounts[cardType] ?? currentTypeConfig.count)
    : currentTypeConfig.count;

  const animateCmcChange = useCallback(() => {
    Animated.sequence([
      Animated.timing(cmcPulse, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(cmcPulse, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
  }, [cmcPulse]);

  const incrementCmc = useCallback(() => {
    setCmc(prev => {
      const next = Math.min(MAX_CMC, prev + 1);
      if (next !== prev) {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        animateCmcChange();
      }
      return next;
    });
  }, [animateCmcChange]);

  const decrementCmc = useCallback(() => {
    setCmc(prev => {
      const next = Math.max(MIN_CMC, prev - 1);
      if (next !== prev) {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        animateCmcChange();
      }
      return next;
    });
  }, [animateCmcChange]);

  const animateTypeChange = useCallback((direction: 'left' | 'right') => {
    typeTransition.setValue(0);
    swipeSlide.setValue(direction === 'left' ? 30 : -30);
    Animated.parallel([
      Animated.spring(typeTransition, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 18,
      }),
      Animated.spring(swipeSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 18,
      }),
    ]).start();
  }, [swipeSlide, typeTransition]);

  const nextType = useCallback(() => {
    setTypeIndex(prev => {
      const next = prev === CARD_TYPES.length - 1 ? 0 : prev + 1;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      animateTypeChange('left');
      return next;
    });
  }, [animateTypeChange]);

  const prevType = useCallback(() => {
    setTypeIndex(prev => {
      const next = prev === 0 ? CARD_TYPES.length - 1 : prev - 1;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      animateTypeChange('right');
      return next;
    });
  }, [animateTypeChange]);

  const swipePanResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          nextType();
        } else if (gestureState.dx > 40) {
          prevType();
        }
      },
    }),
  [nextType, prevType]);

  const handleTypeSelect = useCallback((type: CardType) => {
    const idx = CARD_TYPES.findIndex(ct => ct.id === type);
    if (idx !== -1 && idx !== typeIndex) {
      const direction = idx > typeIndex ? 'left' : 'right';
      setTypeIndex(idx);
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      animateTypeChange(direction);
    }
  }, [typeIndex, animateTypeChange]);

  const incrementMultiCount = useCallback(() => {
    if (!currentTypeConfig.multiCard) return;
    setMultiCardCounts(prev => {
      const current = prev[cardType] ?? currentTypeConfig.count;
      const next = Math.min(MAX_MULTI_COUNT, current + 1);
      if (next !== current) {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        animateCmcChange();
      }
      return { ...prev, [cardType]: next };
    });
  }, [cardType, currentTypeConfig, animateCmcChange]);

  const decrementMultiCount = useCallback(() => {
    if (!currentTypeConfig.multiCard) return;
    setMultiCardCounts(prev => {
      const current = prev[cardType] ?? currentTypeConfig.count;
      const next = Math.max(MIN_MULTI_COUNT, current - 1);
      if (next !== current) {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        animateCmcChange();
      }
      return { ...prev, [cardType]: next };
    });
  }, [cardType, currentTypeConfig, animateCmcChange]);

  return {
    cmc,
    setCmc,
    typeIndex,
    setTypeIndex,
    multiCardCounts,
    setMultiCardCounts,
    typePickerVisible,
    setTypePickerVisible,
    cmcPulse,
    swipeSlide,
    typeTransition,
    swipePanResponder,
    cardType,
    currentTypeConfig,
    showCmc,
    multiCount,
    incrementCmc,
    decrementCmc,
    nextType,
    prevType,
    handleTypeSelect,
    incrementMultiCount,
    decrementMultiCount,
  };
}
