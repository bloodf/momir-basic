import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, ChevronDown, ScrollText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CARD_TYPES } from '@/constants/cardTypes';
import type { CardType } from '@/types';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';
import { TypePicker } from '@/components/TypePicker';
import { HistorySheet } from '@/components/HistorySheet';
import { useHeroBackground } from '@/features/home/useHeroBackground';
import { useCmcStepper } from '@/features/home/useCmcStepper';
import { useCastMutation } from '@/features/home/useCastMutation';
import { styles } from '@/screens/home/styles';

const MIN_CMC = 0;
const MAX_CMC = 20;
const MIN_MULTI_COUNT = 1;
const MAX_MULTI_COUNT = 10;
const ABSOLUTE_FILL_STYLE = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { cards } = useHistoryStore();
  const { settings } = useSettingsStore();

  const { t, locale } = useI18n();

  const [historyVisible, setHistoryVisible] = useState(false);

  const {
    cmc,
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
    handleTypeSelect,
    incrementMultiCount,
    decrementMultiCount,
    typeIndex,
  } = useCmcStepper();

  const { currentBgData, dominantColor, bgFadeAnim, heroImageScale } = useHeroBackground(
    cardType as CardType,
    typeIndex
  );

  const fadeIn = useRef(new Animated.Value(0)).current;
  const castScale = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const { isPending: castPending, handleCast: triggerCast } = useCastMutation({
    cmc,
    cardType,
    multiCount,
    excludeFunny: settings.excludeFunnySets,
    lang: locale,
    isMultiCard: Boolean(currentTypeConfig.multiCard),
  });

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

  const typeLabel = currentTypeConfig.multiCard
    ? t.cardTypes[currentTypeConfig.id as keyof typeof t.cardTypes].replace(
        /^\d+/,
        String(multiCount)
      )
    : t.cardTypes[currentTypeConfig.id as keyof typeof t.cardTypes];
  const typeDesc =
    t.cardTypeDescriptions[currentTypeConfig.id as keyof typeof t.cardTypeDescriptions];

  const handleCast = () => {
    triggerCast(castScale, spinAnim);
  };

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
          <Animated.View
            style={[styles.bgImageWrap, { transform: [{ scale: heroImageScale }] }]}
            testID="hero-art"
            accessibilityLabel={currentBgData.artUrl}
          >
            <Image
              source={{ uri: currentBgData.artUrl }}
              style={styles.bgImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </Animated.View>

          <View style={[styles.safeAreaCover, { height: topCoverHeight }]}>
            <LinearGradient
              colors={['#000000', 'rgba(0,0,0,0.92)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
              locations={[0, 0.45, 0.75, 1]}
              style={ABSOLUTE_FILL_STYLE}
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
            style={[
              styles.typeRow,
              {
                opacity: typeOpacity,
                transform: [{ translateY: typeTranslateY }, { translateX: swipeSlide }],
              },
            ]}
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
                  <Minus
                    size={18}
                    color={multiCount <= MIN_MULTI_COUNT ? Colors.textMuted : Colors.gold}
                  />
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
                  <Plus
                    size={18}
                    color={multiCount >= MAX_MULTI_COUNT ? Colors.textMuted : Colors.gold}
                  />
                </Pressable>
              </View>
              <Text style={styles.multiCardLabel}>{t.home.fetchingCards(multiCount)}</Text>
            </View>
          )}

          <Animated.View style={[styles.castButtonWrap, { transform: [{ scale: castScale }] }]}>
            <Pressable
              onPress={handleCast}
              disabled={castPending}
              style={({ pressed }) => [
                styles.castButton,
                pressed && styles.castButtonPressed,
                castPending && styles.castButtonDisabled,
              ]}
              testID="cast-button"
            >
              {castPending ? (
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
            style={({ pressed }) => [styles.historyButton, pressed && styles.historyButtonPressed]}
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
