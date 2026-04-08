import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
  ImageBackground,
  PanResponder,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, ChevronDown, ScrollText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CARD_TYPES } from '@/constants/cardTypes';
import { Card, CardType } from '@/types';
import {
  fetchRandomCard,
  fetchMultipleCards,
  fetchRandomBgCardForType,
  BgCardData,
  getLocalizedScryfallErrorMessage,
} from '@/services/scryfall';
import { useHistory } from '@/providers/HistoryProvider';
import { useSettings } from '@/providers/SettingsProvider';

import { useI18n } from '@/i18n';
import { TypePicker } from '@/components/TypePicker';
import { HistorySheet } from '@/components/HistorySheet';
import { showToast } from '@/components/Toast';
import { useNetwork } from '@/providers/NetworkProvider';
import { startHeroArtRotationInterval } from './heroRotation';

const MIN_CMC = 0;
const MAX_CMC = 20;
const MIN_MULTI_COUNT = 1;
const MAX_MULTI_COUNT = 10;
const EMPTY_BG_DATA: BgCardData = { artUrl: '', colors: [] };
const MAX_BG_ROTATION_FETCH_ATTEMPTS = 3;

function getDominantColor(colors: string[]): string {
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addCard, addCards, cards } = useHistory();
  const { settings } = useSettings();

  const { t, locale } = useI18n();
  const { isOnline: _isOnline } = useNetwork();

  const [cmc, setCmc] = useState(1);
  const [typeIndex, setTypeIndex] = useState(0);
  const [_lastCards, setLastCards] = useState<Card[]>([]);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [multiCardCounts, setMultiCardCounts] = useState<Record<string, number>>({});

  const cardType = CARD_TYPES[typeIndex].id;
  const currentTypeConfig = CARD_TYPES[typeIndex];
  const showCmc = currentTypeConfig.useCmc;
  const multiCount = currentTypeConfig.multiCard
    ? (multiCardCounts[cardType] ?? currentTypeConfig.count)
    : currentTypeConfig.count;

  const typeLabel = currentTypeConfig.multiCard
    ? t.cardTypes[currentTypeConfig.id as keyof typeof t.cardTypes].replace(/^\d+/, String(multiCount))
    : t.cardTypes[currentTypeConfig.id as keyof typeof t.cardTypes];
  const typeDesc = t.cardTypeDescriptions[currentTypeConfig.id as keyof typeof t.cardTypeDescriptions];

  const bgCache = useRef<Partial<Record<CardType, BgCardData>>>({});
  const bgPrefetchCache = useRef<Partial<Record<CardType, BgCardData>>>({});
  const rotationCleanupRef = useRef<(() => void) | null>(null);
  const currentCardTypeRef = useRef<CardType>(cardType);
  const isHomeFocusedRef = useRef(false);
  const appStateStatusRef = useRef(AppState.currentState);
  const currentBgDataRef = useRef<BgCardData>(EMPTY_BG_DATA);
  const initializedBgTypeRef = useRef<CardType | null>(null);
  const [currentBgData, setCurrentBgData] = useState<BgCardData>(EMPTY_BG_DATA);
  const [currentBgType, setCurrentBgType] = useState<CardType>(cardType);
  const [isHomeFocused, setIsHomeFocused] = useState(false);
  const [appStateStatus, setAppStateStatus] = useState(AppState.currentState);

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

  const dominantColor = useMemo(() => getDominantColor(currentBgData.colors), [currentBgData.colors]);

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

  const prefetchNextBgCardForType = useCallback(async (type: CardType, currentArtUrl: string) => {
    const prefetched = bgPrefetchCache.current[type];

    if (prefetched?.artUrl && prefetched.artUrl !== currentArtUrl) {
      return prefetched;
    }

    const nextBg = await fetchDistinctBgCardForType(type, currentArtUrl);
    if (nextBg.artUrl) {
      bgPrefetchCache.current[type] = nextBg;
    }

    return nextBg;
  }, [fetchDistinctBgCardForType]);

  const getNextBgCardForType = useCallback(async (type: CardType, currentArtUrl: string) => {
    const prefetched = bgPrefetchCache.current[type];
    delete bgPrefetchCache.current[type];

    if (prefetched?.artUrl && prefetched.artUrl !== currentArtUrl) {
      return prefetched;
    }

    return fetchDistinctBgCardForType(type, currentArtUrl);
  }, [fetchDistinctBgCardForType]);

  const applyBgData = useCallback((type: CardType, nextBg: BgCardData) => {
    if (!nextBg.artUrl) {
      return;
    }

    bgCache.current[type] = nextBg;
    queryClient.setQueryData(['bgArt', type], nextBg);
    setCurrentBgType(type);
    setCurrentBgData(nextBg);
  }, [queryClient]);

  useEffect(() => {
    CARD_TYPES.forEach((ct, idx) => {
      if (idx !== typeIndex && !bgCache.current[ct.id]) {
        setTimeout(() => {
          queryClient.prefetchQuery({
            queryKey: ['bgArt', ct.id],
            queryFn: () => fetchRandomBgCardForType(ct.id),
            staleTime: Infinity,
          }).then(() => {
            const cached = queryClient.getQueryData<BgCardData>(['bgArt', ct.id]);
            if (cached) bgCache.current[ct.id] = cached;
          }).catch(() => {});
        }, idx * 300);
      }
    });
  }, [queryClient, typeIndex]);

  useEffect(() => {
    if (!bgQuery.data?.artUrl) {
      return;
    }

    if (initializedBgTypeRef.current === cardType) {
      return;
    }

    initializedBgTypeRef.current = cardType;
    applyBgData(cardType, bgQuery.data);
    void prefetchNextBgCardForType(cardType, bgQuery.data.artUrl);
  }, [applyBgData, bgQuery.data, cardType, prefetchNextBgCardForType]);

  const bgFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const castScale = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const cmcPulse = useRef(new Animated.Value(1)).current;
  const typeTransition = useRef(new Animated.Value(1)).current;
  const heroImageScale = useRef(new Animated.Value(1.05)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(heroImageScale, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, heroImageScale]);

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

  const swipeSlide = useRef(new Animated.Value(0)).current;

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
  }, [typeTransition, swipeSlide]);

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
    })
  , [nextType, prevType]);

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

  const castMutation = useMutation({
    mutationFn: async () => {
      if (currentTypeConfig.multiCard) {
        return fetchMultipleCards(cardType, multiCount, settings.excludeFunnySets, locale);
      } else {
        const card = await fetchRandomCard(cardType, cmc, settings.excludeFunnySets, 3, locale);
        return [card];
      }
    },
    onSuccess: (cards) => {
      setLastCards(cards);
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

  const handleCast = useCallback(() => {
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
  }, [castMutation, spinAnim, castScale]);

  const typeOpacity = typeTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const typeTranslateY = typeTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const safeTopHeight = insets.top;
  const topCoverHeight = Math.max(safeTopHeight + 32, 64);

  return (
    <View style={styles.container}>
      {currentBgData.artUrl ? (
        <Animated.View style={[styles.bgWrap, { opacity: bgFadeAnim }]}> 
          <Animated.View style={[styles.bgImageWrap, { transform: [{ scale: heroImageScale }] }]}> 
            <ImageBackground
              source={{ uri: currentBgData.artUrl }}
              style={styles.bgImage}
              resizeMode="cover"
              testID="hero-art"
              accessibilityLabel={currentBgData.artUrl}
            />
          </Animated.View>

          <View style={[styles.safeAreaCover, { height: topCoverHeight }]}>
            <LinearGradient
              colors={['#000000', 'rgba(0,0,0,0.92)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
              locations={[0, 0.45, 0.75, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <LinearGradient
            colors={[
              'transparent',
              'rgba(18,18,18,0.08)',
              'rgba(18,18,18,0.45)',
              dominantColor,
              dominantColor,
            ]}
            locations={[0, 0.18, 0.4, 0.6, 1]}
            style={styles.bgGradient}
          />
          <View style={[styles.bgBottomFill, { backgroundColor: dominantColor }]} />
        </Animated.View>
      ) : (
        <View style={[styles.bgWrap, { backgroundColor: Colors.background }]}>
          <LinearGradient
            colors={['rgba(232,105,45,0.03)', Colors.background]}
            style={styles.bgGradient}
          />
        </View>
      )}

      <Animated.View
        style={[styles.innerContainer, { opacity: fadeIn }]}
        {...swipePanResponder.panHandlers}
      >


        <View style={styles.spacer} />

        <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, 12) + 60 }]}>
          <Animated.View
            style={[styles.typeRow, { opacity: typeOpacity, transform: [{ translateY: typeTranslateY }, { translateX: swipeSlide }] }]}
          >
            <Pressable
              onPress={() => setTypePickerVisible(true)}
              style={styles.typeLabelWrap}
              testID="type-label-tap"
            >
              <View style={styles.typeLabelRow}>
                <Text style={styles.typeSelectorText}>{typeLabel}</Text>
                <ChevronDown size={14} color={Colors.gold} style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.typeDescription}>{typeDesc}</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.typeIndicatorRow}>
            {CARD_TYPES.map((ct, i) => (
              <View
                key={ct.id}
                style={[styles.typeIndicatorDot, i === typeIndex && styles.typeIndicatorDotActive]}
              />
            ))}
          </View>

          {showCmc ? (
            <View style={styles.cmcSection}>
              <View style={styles.cmcHeader}>
                <Pressable
                  onPress={decrementCmc}
                  disabled={cmc <= MIN_CMC}
                  style={({ pressed }) => [
                    styles.cmcStepButton,
                    cmc <= MIN_CMC && styles.cmcStepButtonDisabled,
                    pressed && cmc > MIN_CMC && styles.cmcStepButtonPressed,
                  ]}
                  hitSlop={10}
                  testID="cmc-decrement"
                >
                  <Minus size={18} color={cmc <= MIN_CMC ? Colors.textMuted : Colors.gold} />
                </Pressable>

                <Animated.View style={[styles.cmcDisplay, { transform: [{ scale: cmcPulse }] }]}>
                  <Text style={styles.cmcValue}>{cmc}</Text>
                  <Text style={styles.cmcLabel}>{t.common.mana}</Text>
                </Animated.View>

                <Pressable
                  onPress={incrementCmc}
                  disabled={cmc >= MAX_CMC}
                  style={({ pressed }) => [
                    styles.cmcStepButton,
                    cmc >= MAX_CMC && styles.cmcStepButtonDisabled,
                    pressed && cmc < MAX_CMC && styles.cmcStepButtonPressed,
                  ]}
                  hitSlop={10}
                  testID="cmc-increment"
                >
                  <Plus size={18} color={cmc >= MAX_CMC ? Colors.textMuted : Colors.gold} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.multiCardSection}>
              <View style={styles.cmcHeader}>
                <Pressable
                  onPress={decrementMultiCount}
                  disabled={multiCount <= MIN_MULTI_COUNT}
                  style={({ pressed }) => [
                    styles.cmcStepButton,
                    multiCount <= MIN_MULTI_COUNT && styles.cmcStepButtonDisabled,
                    pressed && multiCount > MIN_MULTI_COUNT && styles.cmcStepButtonPressed,
                  ]}
                  hitSlop={10}
                  testID="multi-count-decrement"
                >
                  <Minus size={18} color={multiCount <= MIN_MULTI_COUNT ? Colors.textMuted : Colors.gold} />
                </Pressable>

                <Animated.View style={[styles.cmcDisplay, { transform: [{ scale: cmcPulse }] }]}>
                  <Text style={styles.cmcValue}>{multiCount}</Text>
                  <Text style={styles.cmcLabel}>{t.home.cardCount}</Text>
                </Animated.View>

                <Pressable
                  onPress={incrementMultiCount}
                  disabled={multiCount >= MAX_MULTI_COUNT}
                  style={({ pressed }) => [
                    styles.cmcStepButton,
                    multiCount >= MAX_MULTI_COUNT && styles.cmcStepButtonDisabled,
                    pressed && multiCount < MAX_MULTI_COUNT && styles.cmcStepButtonPressed,
                  ]}
                  hitSlop={10}
                  testID="multi-count-increment"
                >
                  <Plus size={18} color={multiCount >= MAX_MULTI_COUNT ? Colors.textMuted : Colors.gold} />
                </Pressable>
              </View>
              <Text style={styles.multiCardLabel}>{t.home.fetchingCards(multiCount)}</Text>
            </View>
          )}

          <Animated.View style={[styles.castButtonWrap, { transform: [{ scale: castScale }] }]}>
            <Pressable
              onPress={handleCast}
              disabled={castMutation.isPending}
              style={({ pressed }) => [
                styles.castButton,
                pressed && styles.castButtonPressed,
                castMutation.isPending && styles.castButtonDisabled,
              ]}
              testID="cast-button"
            >
              {castMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.castButtonText}>{t.common.cast}</Text>
              )}
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setHistoryVisible(true);
            }}
            style={({ pressed }) => [
              styles.historyButton,
              pressed && styles.historyButtonPressed,
            ]}
            hitSlop={8}
            testID="open-history"
          >
            <ScrollText size={16} color={Colors.gold} />
            <Text style={styles.historyButtonLabel}>{t.history.title}</Text>
            {cards.length > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>
                  {cards.length > 99 ? '99+' : cards.length}
                </Text>
              </View>
            )}
          </Pressable>

          <TypePicker
            visible={typePickerVisible}
            selected={cardType as CardType}
            onSelect={handleTypeSelect}
            onClose={() => setTypePickerVisible(false)}
          />
        </View>
      </Animated.View>

      <HistorySheet visible={historyVisible} onClose={() => setHistoryVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '68%',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgBottomFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  innerContainer: {
    flex: 1,
  },
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    backgroundColor: 'rgba(232,105,45,0.15)',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.3)',
  },
  sessionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  spacer: {
    flex: 1,
  },
  bottomControls: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    marginTop: 24,
  },
  typeLabelWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeSelectorText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  typeDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeIndicatorRow: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginBottom: 18,
  },
  typeIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(232,105,45,0.18)',
  },
  typeIndicatorDotActive: {
    backgroundColor: Colors.gold,
    width: 16,
    borderRadius: 3,
  },
  cmcSection: {
    width: '100%',
    marginBottom: 20,
  },
  cmcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 24,
  },
  cmcStepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(232,105,45,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,105,45,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cmcStepButtonPressed: {
    backgroundColor: 'rgba(232,105,45,0.25)',
    borderColor: Colors.gold,
  },
  cmcStepButtonDisabled: {
    opacity: 0.3,
  },
  cmcDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  cmcValue: {
    fontSize: 52,
    fontWeight: '200' as const,
    color: Colors.gold,
    lineHeight: 58,
  },
  cmcLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(232,105,45,0.45)',
    letterSpacing: 4,
    marginTop: 2,
  },
  multiCardSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    marginBottom: 18,
  },
  multiCardLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  castButtonWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  castButton: {
    backgroundColor: Colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#E8692D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  castButtonPressed: {
    backgroundColor: Colors.goldDark,
  },
  castButtonDisabled: {
    opacity: 0.7,
  },
  castButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 10,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.2)',
  },
  retryText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.15)',
    marginTop: 4,
  },
  historyButtonPressed: {
    backgroundColor: 'rgba(232,105,45,0.15)',
    borderColor: 'rgba(232,105,45,0.3)',
  },
  historyButtonLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  historyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
