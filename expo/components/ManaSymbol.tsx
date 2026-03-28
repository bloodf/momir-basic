import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ManaSymbolProps {
  symbol: string;
  size?: number;
}

function getSymbolCode(symbol: string): string {
  return symbol.replace(/[{}]/g, '').toUpperCase();
}

function getScryfallSvgUri(code: string): string {
  const encoded = encodeURIComponent(code);
  return `https://svgs.scryfall.io/card-symbols/${encoded}.svg`;
}

export const ManaSymbol = memo(function ManaSymbol({ symbol, size = 20 }: ManaSymbolProps) {
  const code = getSymbolCode(symbol);
  const uri = getScryfallSvgUri(code);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="disk"
      />
    </View>
  );
});

export function parseManaCost(manaCost: string): string[] {
  const matches = manaCost.match(/\{[^}]+\}/g);
  return matches ?? [];
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
