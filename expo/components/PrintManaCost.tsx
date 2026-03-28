import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { parseManaCost } from './ManaSymbol';

interface PrintManaCostProps {
  manaCost: string;
  size?: number;
  gap?: number;
}

function getScryfallSvgUri(symbol: string): string {
  const code = symbol.replace(/[{}]/g, '').toUpperCase();
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`;
}

export const PrintManaCost = memo(function PrintManaCost({ manaCost, size = 18, gap = 3 }: PrintManaCostProps) {
  const symbols = parseManaCost(manaCost);
  if (symbols.length === 0) return null;

  return (
    <View style={[styles.container, { gap }]}>
      {symbols.map((s, i) => {
        const code = s.replace(/[{}]/g, '').toUpperCase();
        const uri = getScryfallSvgUri(code);
        return (
          <Image
            key={`${code}-${i}`}
            source={{ uri }}
            style={{ width: size, height: size }}
            contentFit="contain"
            cachePolicy="disk"
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
