import React, { memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Printer } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ManaCost } from './ManaCost';
import Colors from '@/constants/colors';
import { Card } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 8) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.395;

interface CardGridItemProps {
  card: Card;
  onPress: (card: Card) => void;
}

export const CardGridItem = memo(function CardGridItem({ card, onPress }: CardGridItemProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = useCallback(() => onPress(card), [card, onPress]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  }, [scaleAnim]);

  const handlePrint = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/print-preview',
      params: { cardJson: JSON.stringify(card) },
    });
  }, [card, router]);

  const rarityColor = Colors.rarity[card.rarity] ?? Colors.textSecondary;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`card-grid-item-${card.id}`}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: card.normalImageUrl || card.artCropUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          {card.power && card.toughness && (
            <View style={styles.ptBadge}>
              <Text style={styles.ptText}>{card.power}/{card.toughness}</Text>
            </View>
          )}
          <Pressable
            onPress={handlePrint}
            hitSlop={4}
            style={({ pressed }) => [styles.printBtn, pressed && styles.printBtnPressed]}
          >
            <Printer size={12} color={Colors.gold} />
          </Pressable>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{card.printedName ?? card.name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
            <Text style={styles.setName} numberOfLines={1}>{card.setName}</Text>
          </View>
          <ManaCost manaCost={card.manaCost} size={12} gap={1} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
  },
  imageWrap: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ptBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: Colors.gold,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ptText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  printBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.3)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  printBtnPressed: {
    backgroundColor: 'rgba(232,105,45,0.4)',
  },
  info: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 2,
    gap: 3,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rarityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  setName: {
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
});
