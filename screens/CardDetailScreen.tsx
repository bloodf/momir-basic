import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { X, Printer, RefreshCw, Maximize2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { ManaCost } from '@/components/ManaCost';
import { getCardFaceDisplayData } from '@/utils/cardFaces';
import { ErrorCategory, logger } from '@/utils/logger';
import { useSettingsStore } from '@/stores/settingsStore';
import { useI18n } from '@/stores/i18nStore';
import { useCardNavigation } from '@/features/card/useCardNavigation';
import { useCardPrintings } from '@/features/card/useCardPrintings';
import { useCardActions } from '@/features/card/useCardActions';
import { useAutoPrint } from './card-detail/useAutoPrint';
import { FullCardModal, ArtViewModal } from './card-detail/CardModals';
import { CardBody } from './card-detail/CardBody';
import { styles } from './card-detail/styles';

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ cardJson: string; multiCards?: string }>();
  const { height: screenHeight } = useWindowDimensions();
  const heroHeight = screenHeight * 0.48;
  const { settings } = useSettingsStore();
  const { t } = useI18n();

  const initialCards = useMemo<Card[]>(() => {
    try {
      if (params.multiCards) return JSON.parse(params.multiCards);
      if (params.cardJson) return [JSON.parse(params.cardJson)];
      return [];
    } catch (error) {
      logger.debug(ErrorCategory.Render, 'Card param parse failed', error);
      return [];
    }
  }, [params.cardJson, params.multiCards]);

  const {
    cards,
    setCards,
    currentIndex,
    activeFaceIndex,
    setActiveFaceIndex,
    cardEntryAnim,
    heroScale,
    card,
    isMulti,
    goNext,
    goPrev,
    handleToggleFace,
  } = useCardNavigation(initialCards);

  const printingsHook = useCardPrintings();

  const {
    handleShare: handleShareArt,
    handleDownload: handleDownloadArt,
    handleReroll,
    navigateToPrint,
    rerollPending,
  } = useCardActions({
    card,
    cardType: 'creature',
    currentIndex,
    activeFaceIndex,
    setCards,
    heroScale,
    cardEntryAnim,
    onPrint: () => {
      if (!card) return;
      if (process.env.EXPO_OS !== 'web')
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/print-preview',
        params: { cardJson: JSON.stringify(card) },
      });
    },
  });

  useAutoPrint({ card, printerSettings: settings.printer });

  const [showFullCard, setShowFullCard] = useState(false);
  const [showArtView, setShowArtView] = useState(false);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const artModalOpacity = useRef(new Animated.Value(0)).current;

  const togglePrintings = useCallback(async () => {
    if (!card) return;
    await printingsHook.togglePrintings(card.name);
  }, [card, printingsHook]);

  useEffect(() => {
    if (!card) return;
    setActiveFaceIndex(0);
    printingsHook.resetPrintings(card.id);
  }, [card?.id, printingsHook, setActiveFaceIndex, card]);

  const openFullCard = useCallback(() => {
    setShowFullCard(true);
    Animated.timing(modalOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [modalOpacity]);

  const closeFullCard = useCallback(() => {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowFullCard(false));
  }, [modalOpacity]);

  const openArtView = useCallback(() => {
    setShowArtView(true);
    Animated.timing(artModalOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [artModalOpacity]);

  const closeArtView = useCallback(() => {
    Animated.timing(artModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowArtView(false));
  }, [artModalOpacity]);

  if (!card) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{t.card.cardNotFound}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t.common.goBack}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayCard = getCardFaceDisplayData(card, activeFaceIndex);
  const hasMultipleFaces = (card.faces?.length ?? 0) > 1;
  const rarityColor = Colors.rarity[card.rarity] ?? Colors.textSecondary;
  const hasStats = displayCard.power !== undefined && displayCard.toughness !== undefined;
  const rarityLabel = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);
  const nextFaceLabel = activeFaceIndex === 0 ? t.card.face.back : t.card.face.front;

  const bodyTranslateY = cardEntryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollInner}
        bounces={false}
      >
        <Pressable onPress={openArtView} style={[styles.heroBanner, { height: heroHeight }]}>
          <View style={[styles.safeAreaCover, { height: Math.max(insets.top + 28, 60) }]}>
            <LinearGradient
              colors={['#000000', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
              locations={[0, 0.4, 0.72, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </View>

          <Animated.View style={[styles.heroImageWrap, { transform: [{ scale: heroScale }] }]}>
            <Image
              source={{ uri: displayCard.artCropUrl || displayCard.normalImageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>

          <LinearGradient
            colors={[
              'rgba(18,18,18,0)',
              'rgba(18,18,18,0.4)',
              'rgba(18,18,18,0.88)',
              Colors.background,
            ]}
            locations={[0, 0.4, 0.72, 1]}
            style={[styles.heroGradient, { height: heroHeight * 0.85 }]}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={styles.topBarButton}
              testID="close-card"
            >
              <X size={20} color="#fff" />
            </Pressable>
            {isMulti && (
              <View style={styles.pageChip}>
                <Text style={styles.pageChipText}>
                  {currentIndex + 1} / {cards.length}
                </Text>
              </View>
            )}
            <Pressable onPress={openFullCard} style={styles.topBarButton} testID="view-full-card">
              <Maximize2 size={17} color="#fff" />
            </Pressable>
          </View>

          <Animated.View style={[styles.heroContent, { opacity: cardEntryAnim }]}>
            <ManaCost manaCost={displayCard.manaCost} size={22} gap={3} />
            <Text style={styles.cardName} numberOfLines={2}>
              {displayCard.printedName ?? displayCard.name}
            </Text>
          </Animated.View>
        </Pressable>

        <CardBody
          displayCard={displayCard}
          card={card}
          rarityColor={rarityColor}
          rarityLabel={rarityLabel}
          hasStats={hasStats}
          cardDetailsLabel={t.card.cardDetails}
          setLabel={t.card.set}
          rarityLabelShort={t.card.rarity}
          numberLabel={t.card.number}
          artistLabel={t.card.artist}
          manaValueLabel={t.card.manaValue}
          printingsLabel={t.card.printings}
          loadingPrintingsLabel={t.card.loadingPrintings}
          printings={printingsHook.printings}
          printingsExpanded={printingsHook.printingsExpanded}
          printingsLoading={printingsHook.printingsLoading}
          printingsFetched={printingsHook.printingsFetched}
          chevronRotation={printingsHook.chevronRotation}
          onTogglePrintings={togglePrintings}
          isMulti={isMulti}
          currentIndex={currentIndex}
          cards={cards}
          goPrev={goPrev}
          goNext={goNext}
          prevLabel={t.common.prev}
          nextLabel={t.common.next}
          cardEntryAnim={cardEntryAnim}
          bodyTranslateY={bodyTranslateY}
        />
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={navigateToPrint}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionOutline,
            pressed && styles.actionPressed,
          ]}
          testID="print-card"
        >
          <Printer size={17} color={Colors.gold} />
          <Text style={styles.actionOutlineText}>{t.common.print}</Text>
        </Pressable>

        {hasMultipleFaces && (
          <Pressable
            onPress={handleToggleFace}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionOutline,
              pressed && styles.actionPressed,
            ]}
            testID="toggle-card-face"
          >
            <Text style={styles.actionOutlineText}>{nextFaceLabel}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleReroll}
          disabled={rerollPending}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionPrimary,
            pressed && styles.actionPressed,
          ]}
          testID="reroll-card"
        >
          {rerollPending ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <>
              <RefreshCw size={17} color={Colors.background} />
              <Text style={styles.actionPrimaryText}>{t.common.reroll}</Text>
            </>
          )}
        </Pressable>
      </View>

      <FullCardModal
        visible={showFullCard}
        displayCard={displayCard}
        card={card}
        opacity={modalOpacity}
        insets={insets}
        onClose={closeFullCard}
        artByLabel={displayCard.artist ? t.card.artBy(displayCard.artist) : ''}
      />

      <ArtViewModal
        visible={showArtView}
        displayCard={displayCard}
        opacity={artModalOpacity}
        insets={insets}
        onClose={closeArtView}
        onDownload={handleDownloadArt}
        onShare={handleShareArt}
        downloadLabel={t.common.download}
        shareLabel={t.common.share}
      />
    </View>
  );
}
