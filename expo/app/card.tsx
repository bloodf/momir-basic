import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  Animated,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  X,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Paintbrush,
  Hash,
  Layers,
  Download,
  Share2,
  Sword,
  Shield,
  ChevronDown,
  BookOpen,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { ManaCost } from '@/components/ManaCost';
import { OracleText } from '@/components/OracleText';
import { fetchRandomCard, fetchCardPrintings, CardPrinting } from '@/services/scryfall';
import { useHistory } from '@/providers/HistoryProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n } from '@/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.48;

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ cardJson: string; multiCards?: string }>();
  const { addCard } = useHistory();
  const { settings } = useSettings();
  const { t, locale } = useI18n();

  const initialCards = useMemo<Card[]>(() => {
    try {
      if (params.multiCards) return JSON.parse(params.multiCards);
      if (params.cardJson) return [JSON.parse(params.cardJson)];
    } catch (e) {
      console.log('[CardDetail] Parse error:', e);
    }
    return [];
  }, [params.cardJson, params.multiCards]);

  const [cards, setCards] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullCard, setShowFullCard] = useState(false);
  const [showArtView, setShowArtView] = useState(false);
  const [printingsExpanded, setPrintingsExpanded] = useState(false);
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [printingsLoading, setPrintingsLoading] = useState(false);
  const [printingsFetched, setPrintingsFetched] = useState(false);
  const chevronRotation = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const artModalOpacity = useRef(new Animated.Value(0)).current;
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

  const rerollMutation = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      const typeLine = card.typeLine.toLowerCase();
      let cardType: 'creature' | 'artifact' | 'enchantment' = 'creature';
      if (typeLine.includes('artifact')) cardType = 'artifact';
      else if (typeLine.includes('enchantment')) cardType = 'enchantment';
      return fetchRandomCard(cardType, card.cmc, settings.excludeFunnySets, 3, locale);
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
  });

  const handlePrint = useCallback(() => {
    if (!card) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/print-preview',
      params: { cardJson: JSON.stringify(card) },
    });
  }, [card, router]);

  const handleReroll = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rerollMutation.mutate();
  }, [rerollMutation]);

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

  const handleShareArt = useCallback(async () => {
    if (!card) return;
    try {
      await Share.share({
        message: `${card.printedName ?? card.name} — ${t.card.artBy(card.artist ?? t.card.unknownArtist)}\n${card.scryfallUri}`,
        url: card.artCropUrl,
      });
    } catch (e) {
      console.log('[CardDetail] Share error:', e);
    }
  }, [card, t]);

  const handleDownloadArt = useCallback(async () => {
    if (!card) return;
    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = card.artCropUrl;
        link.target = '_blank';
        link.download = `${card.name.replace(/[^a-zA-Z0-9]/g, '_')}_art.jpg`;
        link.click();
      } catch (e) {
        console.log('[CardDetail] Download error:', e);
      }
    } else {
      Alert.alert(t.card.downloadTitle, t.card.downloadNotAvailable);
    }
  }, [card, t]);

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

  const togglePrintings = useCallback(async () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();

    if (!printingsFetched && !printingsLoading) {
      setPrintingsLoading(true);
      try {
        const results = await fetchCardPrintings(card.name);
        setPrintings(results);
        setPrintingsFetched(true);
        console.log('[CardDetail] Fetched printings:', results.length);
      } catch (e) {
        console.log('[CardDetail] Printings error:', e);
      } finally {
        setPrintingsLoading(false);
      }
    }

    const expanding = !printingsExpanded;
    setPrintingsExpanded(expanding);

    Animated.parallel([
      Animated.timing(chevronRotation, {
        toValue: expanding ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [printingsExpanded, printingsFetched, printingsLoading, card.name, chevronRotation]);

  useEffect(() => {
    setPrintingsExpanded(false);
    setPrintings([]);
    setPrintingsFetched(false);
    chevronRotation.setValue(0);
  }, [card.id, chevronRotation]);

  const chevronSpin = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const rarityColor = Colors.rarity[card.rarity] ?? Colors.textSecondary;
  const hasStats = card.power !== undefined && card.toughness !== undefined;
  const rarityLabels: Record<string, string> = {
    common: t.card.rarityCommon,
    uncommon: t.card.rarityUncommon,
    rare: t.card.rarityRare,
    mythic: t.card.rarityMythic,
  };
  const rarityLabel = rarityLabels[card.rarity] ?? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);

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
        <Pressable onPress={openArtView} style={styles.heroBanner}>
          <View style={[styles.safeAreaCover, { height: Math.max(insets.top + 28, 60) }]}>
            <LinearGradient
              colors={['#000000', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
              locations={[0, 0.4, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <Animated.View style={[styles.heroImageWrap, { transform: [{ scale: heroScale }] }]}>
            <Image
              source={{ uri: card.artCropUrl || card.normalImageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>

          <LinearGradient
            colors={['rgba(18,18,18,0)', 'rgba(18,18,18,0.4)', 'rgba(18,18,18,0.88)', Colors.background]}
            locations={[0, 0.4, 0.72, 1]}
            style={styles.heroGradient}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={styles.topBarButton} testID="close-card">
              <X size={20} color="#fff" />
            </Pressable>
            {isMulti && (
              <View style={styles.pageChip}>
                <Text style={styles.pageChipText}>{currentIndex + 1} / {cards.length}</Text>
              </View>
            )}
            <Pressable onPress={openFullCard} style={styles.topBarButton} testID="view-full-card">
              <Maximize2 size={17} color="#fff" />
            </Pressable>
          </View>

          <Animated.View style={[styles.heroContent, { opacity: cardEntryAnim }]}>
            <ManaCost manaCost={card.manaCost} size={22} gap={3} />
            <Text style={styles.cardName} numberOfLines={2}>{card.printedName ?? card.name}</Text>
          </Animated.View>
        </Pressable>

        <Animated.View style={[styles.body, { opacity: cardEntryAnim, transform: [{ translateY: bodyTranslateY }] }]}>
          <View style={styles.typeAndPtRow}>
            <View style={[styles.typeCard, hasStats ? styles.typeCardWithPt : undefined]}>
              <Text style={styles.typeCardText}>{card.printedTypeLine ?? card.typeLine}</Text>
            </View>
            {hasStats && (
              <View style={styles.ptCompactCard}>
                <View style={styles.ptIconRow}>
                  <Sword size={13} color={Colors.gold} />
                  <Text style={styles.ptCompactValue}>{card.power}</Text>
                </View>
                <View style={styles.ptDivider} />
                <View style={styles.ptIconRow}>
                  <Shield size={13} color={Colors.gold} />
                  <Text style={styles.ptCompactValue}>{card.toughness}</Text>
                </View>
              </View>
            )}
          </View>

          {(card.printedText ?? card.oracleText) ? (
            <View style={styles.oracleSection}>
              <OracleText text={card.printedText ?? card.oracleText} fontSize={14.5} />
            </View>
          ) : null}

          {card.flavorText ? (
            <View style={styles.flavorSection}>
              <Text style={styles.flavorText}>{card.flavorText}</Text>
            </View>
          ) : null}

          <View style={styles.detailsCard}>
            <View style={styles.sectionHeaderRow}>
              <Layers size={13} color={Colors.gold} />
              <Text style={styles.sectionHeaderText}>{t.card.cardDetails}</Text>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t.card.set}</Text>
                <View style={styles.detailValueRow}>
                  <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                  <Text style={styles.detailValue} numberOfLines={1}>{card.setName}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t.card.rarity}</Text>
                <Text style={[styles.detailValue, { color: rarityColor }]}>{rarityLabel}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t.card.number}</Text>
                <View style={styles.detailValueRow}>
                  <Hash size={12} color={Colors.textMuted} />
                  <Text style={styles.detailValue}>{card.collectorNumber}</Text>
                  <Text style={styles.detailMeta}>{card.setCode}</Text>
                </View>
              </View>

              {card.artist ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t.card.artist}</Text>
                  <View style={styles.detailValueRow}>
                    <Paintbrush size={12} color={Colors.textMuted} />
                    <Text style={styles.detailValue} numberOfLines={1}>{card.artist}</Text>
                  </View>
                </View>
              ) : null}

              <View style={[styles.detailItem, styles.detailItemLast]}>
                <Text style={styles.detailLabel}>{t.card.manaValue}</Text>
                <Text style={styles.detailValue}>{card.cmc}</Text>
              </View>
            </View>
          </View>

          <Pressable onPress={togglePrintings} style={styles.printingsHeader}>
            <View style={styles.sectionHeaderRow}>
              <BookOpen size={13} color={Colors.gold} />
              <Text style={styles.sectionHeaderText}>{t.card.printings}</Text>
              {printingsFetched && (
                <View style={styles.printingsCountBadge}>
                  <Text style={styles.printingsCountText}>{printings.length}</Text>
                </View>
              )}
            </View>
            <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
              <ChevronDown size={16} color={Colors.textMuted} />
            </Animated.View>
          </Pressable>

          {printingsExpanded && (
            <View style={styles.printingsList}>
              {printingsLoading ? (
                <View style={styles.printingsLoadingWrap}>
                  <ActivityIndicator size="small" color={Colors.gold} />
                  <Text style={styles.printingsLoadingText}>{t.card.loadingPrintings}</Text>
                </View>
              ) : (
                printings.map((p) => {
                  const isCurrentSet = p.id === card.id;
                  const pRarityColor = Colors.rarity[p.rarity as keyof typeof Colors.rarity] ?? Colors.textSecondary;
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.printingItem,
                        isCurrentSet && styles.printingItemCurrent,
                      ]}
                    >
                      <View style={[styles.printingRarityDot, { backgroundColor: pRarityColor }]} />
                      <View style={styles.printingInfo}>
                        <Text style={[
                          styles.printingSetName,
                          isCurrentSet && styles.printingSetNameCurrent,
                        ]} numberOfLines={1}>{p.setName}</Text>
                        <Text style={styles.printingMeta}>#{p.collectorNumber} · {p.setCode}{p.releasedAt ? ` · ${p.releasedAt.slice(0, 4)}` : ''}</Text>
                      </View>
                      <Text style={[styles.printingRarityLabel, { color: pRarityColor }]}>
                        {p.rarity.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {isMulti && (
            <View style={styles.navRow}>
              <Pressable
                onPress={goPrev}
                disabled={currentIndex === 0}
                style={[styles.navButton, currentIndex === 0 && styles.navDisabled]}
              >
                <ChevronLeft size={18} color={currentIndex === 0 ? Colors.textMuted : Colors.gold} />
                <Text style={[styles.navText, currentIndex === 0 && styles.navTextDisabled]}>{t.common.prev}</Text>
              </Pressable>
              <Pressable
                onPress={goNext}
                disabled={currentIndex === cards.length - 1}
                style={[styles.navButton, currentIndex === cards.length - 1 && styles.navDisabled]}
              >
                <Text style={[styles.navText, currentIndex === cards.length - 1 && styles.navTextDisabled]}>{t.common.next}</Text>
                <ChevronRight size={18} color={currentIndex === cards.length - 1 ? Colors.textMuted : Colors.gold} />
              </Pressable>
            </View>
          )}

          <View style={{ height: 16 }} />
        </Animated.View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={handlePrint}
          style={({ pressed }) => [styles.actionBtn, styles.actionOutline, pressed && styles.actionPressed]}
          testID="print-card"
        >
          <Printer size={17} color={Colors.gold} />
          <Text style={styles.actionOutlineText}>{t.common.print}</Text>
        </Pressable>

        <Pressable
          onPress={handleReroll}
          disabled={rerollMutation.isPending}
          style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.actionPressed]}
          testID="reroll-card"
        >
          {rerollMutation.isPending ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <>
              <RefreshCw size={17} color={Colors.background} />
              <Text style={styles.actionPrimaryText}>{t.common.reroll}</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={showFullCard} transparent animationType="none" onRequestClose={closeFullCard}>
        <Animated.View style={[styles.modalWrap, { opacity: modalOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFullCard} />
          <View style={[styles.modalContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <Image
              source={{ uri: card.normalImageUrl || card.artCropUrl }}
              style={styles.modalImage}
              contentFit="contain"
              transition={200}
            />
            <Pressable onPress={closeFullCard} style={[styles.modalClose, { top: insets.top + 12 }]}>
              <X size={22} color="#fff" />
            </Pressable>
            <View style={styles.modalFooter}>
              <Text style={styles.modalName}>{card.printedName ?? card.name}</Text>
              <Text style={styles.modalMeta}>{card.setName} · #{card.collectorNumber}{card.artist ? ` · ${t.card.artBy(card.artist)}` : ''}</Text>
            </View>
          </View>
        </Animated.View>
      </Modal>

      <Modal visible={showArtView} transparent animationType="none" onRequestClose={closeArtView}>
        <Animated.View style={[styles.artModalWrap, { opacity: artModalOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeArtView} />
          <View style={[styles.artModalContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <Image
              source={{ uri: card.artCropUrl }}
              style={styles.artModalImage}
              contentFit="contain"
              transition={200}
            />
            <Pressable onPress={closeArtView} style={[styles.artModalClose, { top: insets.top + 12 }]}>
              <X size={22} color="#fff" />
            </Pressable>
            <View style={styles.artModalFooter}>
              <Text style={styles.artModalTitle}>{card.printedName ?? card.name}</Text>
              {card.artist && <Text style={styles.artModalArtist}>{t.card.artBy(card.artist)}</Text>}
              <View style={styles.artModalActions}>
                <Pressable onPress={handleDownloadArt} style={styles.artModalBtn}>
                  <Download size={18} color="#fff" />
                  <Text style={styles.artModalBtnText}>{t.common.download}</Text>
                </Pressable>
                <Pressable onPress={handleShareArt} style={styles.artModalBtn}>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.artModalBtnText}>{t.common.share}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 16,
  },
  heroBanner: {
    width: '100%',
    height: HERO_HEIGHT,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  safeAreaCover: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  heroImageWrap: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.85,
  },
  topBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topBarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  pageChip: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pageChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heroContent: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
    gap: 6,
  },
  cardName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#ffffff',
    lineHeight: 33,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  typeAndPtRow: {
    flexDirection: 'row' as const,
    gap: 8,
    alignItems: 'stretch',
  },
  typeCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center' as const,
  },
  typeCardWithPt: {
    alignItems: 'flex-start' as const,
  },
  typeCardText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ptCompactCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 100,
  },
  ptIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
  },
  ptCompactValue: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '900' as const,
  },
  ptDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(232,105,45,0.25)',
  },
  oracleSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  flavorSection: {
    backgroundColor: 'rgba(232,105,45,0.04)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(232,105,45,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flavorText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  detailGrid: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
  },
  detailItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailItemLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
    minWidth: 70,
  },
  detailValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  detailValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  detailMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    gap: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navDisabled: {
    opacity: 0.35,
  },
  navText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  navTextDisabled: {
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionOutline: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionOutlineText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  actionPrimary: {
    backgroundColor: Colors.gold,
  },
  actionPrimaryText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  modalImage: {
    width: SCREEN_WIDTH - 64,
    height: (SCREEN_WIDTH - 64) * 1.395,
    borderRadius: 14,
    maxHeight: SCREEN_HEIGHT * 0.68,
  },
  modalClose: {
    position: 'absolute' as const,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalFooter: {
    marginTop: 20,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 16,
  },
  modalName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  modalMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  artModalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },
  artModalContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
  },
  artModalImage: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.73,
    borderRadius: 10,
  },
  artModalClose: {
    position: 'absolute' as const,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  artModalFooter: {
    marginTop: 24,
    alignItems: 'center' as const,
    gap: 6,
  },
  artModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  artModalArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  artModalActions: {
    flexDirection: 'row' as const,
    gap: 16,
    marginTop: 16,
  },
  artModalBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  artModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  printingsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingRight: 14,
  },
  printingsCountBadge: {
    backgroundColor: 'rgba(232,105,45,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  printingsCountText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  printingsList: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
    marginTop: -4,
  },
  printingsLoadingWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 20,
  },
  printingsLoadingText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  printingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  printingItemCurrent: {
    backgroundColor: 'rgba(232,105,45,0.06)',
  },
  printingRarityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  printingInfo: {
    flex: 1,
    gap: 2,
  },
  printingSetName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  printingSetNameCurrent: {
    color: Colors.gold,
  },
  printingMeta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  printingRarityLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    width: 18,
    textAlign: 'center' as const,
  },
});
