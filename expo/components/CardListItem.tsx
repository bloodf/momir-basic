import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ManaCost } from './ManaCost';
import Colors from '@/constants/colors';
import { Card } from '@/types';

interface CardListItemProps {
  card: Card;
  onPress: (card: Card) => void;
}

export const CardListItem = memo(function CardListItem({ card, onPress }: CardListItemProps) {
  const handlePress = useCallback(() => onPress(card), [card, onPress]);

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
          <Text style={styles.name} numberOfLines={1}>{card.name}</Text>
          <ManaCost manaCost={card.manaCost} size={14} gap={1} />
        </View>
        <Text style={styles.typeLine} numberOfLines={1}>{card.typeLine}</Text>
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
});
