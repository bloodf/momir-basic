import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getSymbolSvgUrl } from '@/constants/manaSymbols';

interface ManaSymbolProps {
  symbol: string;
  size?: number;
}

export const ManaSymbol = memo(function ManaSymbol({ symbol, size = 20 }: ManaSymbolProps) {
  const code = symbol.replace(/[{}]/g, '').trim();
  const uri = getSymbolSvgUrl(code);

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
