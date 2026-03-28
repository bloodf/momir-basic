import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Printer } from 'lucide-react-native';
import { ManaCost } from './ManaCost';
import Colors from '@/constants/colors';
import { Card } from '@/types';

interface CardListItemProps {
  card: Card;
  onPress: (card: Card) => void;
  showPrint?: boolean;
}

export const CardListItem = memo(function CardListItem({ card, onPress, showPrint = true }: CardListItemProps) {
  const router = useRouter();
  const handlePress = useCallback(() => onPress(card), [card, onPress]);

  const handlePrint = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/print-preview',
      params: { cardJson: JSON.stringify(card) },
    });
  }, [card, router]);

  const rarityColor = Colors.rarity[card.rarity] ?? Colors.textSecondary;
  const dateStr = new Date(card.fetchedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={`card-list-item-${card.id}`}
    >
      <Image
        source={{ uri: card.smallImageUrl || card.artCropUrl }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{card.printedName ?? card.name}</Text>
          <ManaCost manaCost={card.manaCost} size={14} gap={1} />
        </View>
        <Text style={styles.typeLine} numberOfLines={1}>{card.printedTypeLine ?? card.typeLine}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
          <Text style={styles.setName}>{card.setName}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
      </View>
      {card.power && card.toughness && (
        <View style={styles.ptBox}>
          <Text style={styles.ptText}>{card.power}/{card.toughness}</Text>
        </View>
      )}
      {showPrint && (
        <Pressable
          onPress={handlePrint}
          hitSlop={6}
          style={({ pressed }) => [styles.printBtn, pressed && styles.printBtnPressed]}
          testID={`print-card-${card.id}`}
        >
          <Printer size={15} color={Colors.gold} />
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  thumbnail: {
    width: 48,
    height: 36,
    borderRadius: 4,
    backgroundColor: Colors.inputBackground,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  typeLine: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  setName: {
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  ptBox: {
    backgroundColor: Colors.gold,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ptText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  printBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(232,105,45,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  printBtnPressed: {
    backgroundColor: 'rgba(232,105,45,0.2)',
  },
});
