import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated } from 'react-native';
import {
  Layers,
  Hash,
  Paintbrush,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sword,
  Shield,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Card } from '@/types';
import type { CardPrinting } from '@/services/scryfall';
import type { CardFaceDisplayData } from '@/utils/cardFaces';
import { OracleText } from '@/components/OracleText';
import { styles } from './styles';

interface CardBodyProps {
  displayCard: CardFaceDisplayData;
  card: Card;
  rarityColor: string;
  rarityLabel: string;
  hasStats: boolean;
  cardDetailsLabel: string;
  setLabel: string;
  rarityLabelShort: string;
  numberLabel: string;
  artistLabel: string;
  manaValueLabel: string;
  printingsLabel: string;
  loadingPrintingsLabel: string;
  printings: CardPrinting[];
  printingsExpanded: boolean;
  printingsLoading: boolean;
  printingsFetched: boolean;
  chevronRotation: Animated.Value;
  onTogglePrintings: () => void;
  isMulti: boolean;
  currentIndex: number;
  cards: Card[];
  goPrev: () => void;
  goNext: () => void;
  prevLabel: string;
  nextLabel: string;
  cardEntryAnim: Animated.Value;
  bodyTranslateY: Animated.AnimatedInterpolation<number>;
}

export function CardBody({
  displayCard,
  card,
  rarityColor,
  rarityLabel,
  hasStats,
  cardDetailsLabel,
  setLabel,
  rarityLabelShort,
  numberLabel,
  artistLabel,
  manaValueLabel,
  printingsLabel,
  loadingPrintingsLabel,
  printings,
  printingsExpanded,
  printingsLoading,
  printingsFetched,
  chevronRotation,
  onTogglePrintings,
  isMulti,
  currentIndex,
  cards,
  goPrev,
  goNext,
  prevLabel,
  nextLabel,
  cardEntryAnim,
  bodyTranslateY,
}: CardBodyProps) {
  const chevronSpin = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[styles.body, { opacity: cardEntryAnim, transform: [{ translateY: bodyTranslateY }] }]}
    >
      <View style={styles.typeAndPtRow}>
        <View style={[styles.typeCard, hasStats ? styles.typeCardWithPt : undefined]}>
          <Text style={styles.typeCardText}>
            {displayCard.printedTypeLine ?? displayCard.typeLine}
          </Text>
        </View>
        {hasStats && (
          <View style={styles.ptCompactCard}>
            <View style={styles.ptIconRow}>
              <Sword size={13} color={Colors.gold} />
              <Text style={styles.ptCompactValue}>{displayCard.power}</Text>
            </View>
            <View style={styles.ptDivider} />
            <View style={styles.ptIconRow}>
              <Shield size={13} color={Colors.gold} />
              <Text style={styles.ptCompactValue}>{displayCard.toughness}</Text>
            </View>
          </View>
        )}
      </View>

      {(displayCard.printedText ?? displayCard.oracleText) ? (
        <View style={styles.oracleSection}>
          <OracleText
            text={displayCard.printedText ?? displayCard.oracleText ?? ''}
            fontSize={14.5}
          />
        </View>
      ) : null}

      {displayCard.flavorText ? (
        <View style={styles.flavorSection}>
          <Text style={styles.flavorText}>{displayCard.flavorText}</Text>
        </View>
      ) : null}

      <View style={styles.detailsCard}>
        <View style={styles.sectionHeaderRow}>
          <Layers size={13} color={Colors.gold} />
          <Text style={styles.sectionHeaderText}>{cardDetailsLabel}</Text>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{setLabel}</Text>
            <View style={styles.detailValueRow}>
              <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
              <Text style={styles.detailValue} numberOfLines={1}>
                {card.setName}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{rarityLabelShort}</Text>
            <Text style={[styles.detailValue, { color: rarityColor }]}>{rarityLabel}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{numberLabel}</Text>
            <View style={styles.detailValueRow}>
              <Hash size={12} color={Colors.textMuted} />
              <Text style={styles.detailValue}>{card.collectorNumber}</Text>
              <Text style={styles.detailMeta}>{card.setCode}</Text>
            </View>
          </View>

          {displayCard.artist ? (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{artistLabel}</Text>
              <View style={styles.detailValueRow}>
                <Paintbrush size={12} color={Colors.textMuted} />
                <Text style={styles.detailValue} numberOfLines={1}>
                  {displayCard.artist}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.detailItem, styles.detailItemLast]}>
            <Text style={styles.detailLabel}>{manaValueLabel}</Text>
            <Text style={styles.detailValue}>{card.cmc}</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={onTogglePrintings} style={styles.printingsHeader}>
        <View style={styles.sectionHeaderRow}>
          <BookOpen size={13} color={Colors.gold} />
          <Text style={styles.sectionHeaderText}>{printingsLabel}</Text>
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
              <Text style={styles.printingsLoadingText}>{loadingPrintingsLabel}</Text>
            </View>
          ) : (
            printings.map(p => {
              const isCurrentSet = p.id === card.id;
              const pRarityColor =
                Colors.rarity[p.rarity as keyof typeof Colors.rarity] ?? Colors.textSecondary;
              return (
                <View
                  key={p.id}
                  style={[styles.printingItem, isCurrentSet && styles.printingItemCurrent]}
                >
                  <View style={[styles.printingRarityDot, { backgroundColor: pRarityColor }]} />
                  <View style={styles.printingInfo}>
                    <Text
                      style={[
                        styles.printingSetName,
                        isCurrentSet && styles.printingSetNameCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {p.setName}
                    </Text>
                    <Text style={styles.printingMeta}>
                      #{p.collectorNumber} · {p.setCode}
                      {p.releasedAt ? ` · ${p.releasedAt.slice(0, 4)}` : ''}
                    </Text>
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
            <Text style={[styles.navText, currentIndex === 0 && styles.navTextDisabled]}>
              {prevLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={goNext}
            disabled={currentIndex === cards.length - 1}
            style={[styles.navButton, currentIndex === cards.length - 1 && styles.navDisabled]}
          >
            <Text
              style={[styles.navText, currentIndex === cards.length - 1 && styles.navTextDisabled]}
            >
              {nextLabel}
            </Text>
            <ChevronRight
              size={18}
              color={currentIndex === cards.length - 1 ? Colors.textMuted : Colors.gold}
            />
          </Pressable>
        </View>
      )}

      <View style={{ height: 16 }} />
    </Animated.View>
  );
}
