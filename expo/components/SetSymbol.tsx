import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface SetSymbolProps {
  setCode: string;
  rarity: string;
  size?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#1a1a1a',
  uncommon: '#8A9EAF',
  rare: '#C9A44A',
  mythic: '#E8692D',
  special: '#7B5EA7',
  bonus: '#7B5EA7',
};

function getSetIconUrl(setCode: string): string {
  return `https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`;
}

export const SetSymbol = memo(function SetSymbol({
  setCode,
  rarity,
  size = 18,
}: SetSymbolProps) {
  const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const iconUrl = getSetIconUrl(setCode);
  const hasGradient = rarity === 'rare' || rarity === 'mythic';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {hasGradient && (
        <View
          style={[
            styles.glowLayer,
            {
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              backgroundColor: `${color}22`,
            },
          ]}
        />
      )}
      <Image
        source={{ uri: iconUrl }}
        style={[styles.icon, { width: size, height: size }]}
        contentFit="contain"
        tintColor={color}
        cachePolicy="memory-disk"
        recyclingKey={`set-${setCode}-${rarity}`}
      />
    </View>
  );
});

export const SetSymbolWithStroke = memo(function SetSymbolWithStroke({
  setCode,
  rarity,
  size = 18,
}: SetSymbolProps) {
  const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const iconUrl = getSetIconUrl(setCode);
  const strokeSize = size + 2;

  return (
    <View style={[styles.strokeContainer, { width: strokeSize, height: strokeSize }]}>
      <Image
        source={{ uri: iconUrl }}
        style={[styles.icon, { width: strokeSize, height: strokeSize }]}
        contentFit="contain"
        tintColor="#000000"
        cachePolicy="memory-disk"
        recyclingKey={`set-stroke-${setCode}`}
      />
      <Image
        source={{ uri: iconUrl }}
        style={[styles.iconOverlay, { width: size, height: size }]}
        contentFit="contain"
        tintColor={color}
        cachePolicy="memory-disk"
        recyclingKey={`set-fill-${setCode}-${rarity}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
  },
  icon: {},
  strokeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOverlay: {
    position: 'absolute',
  },
});
