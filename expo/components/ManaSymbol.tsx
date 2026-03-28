import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { getManaUnicode, getManaColor, isKnownSymbol, MANA_FONT_FAMILY } from '@/constants/manaSymbols';

interface ManaSymbolProps {
  symbol: string;
  size?: number;
}

export const ManaSymbol = memo(function ManaSymbol({ symbol, size = 20 }: ManaSymbolProps) {
  const code = symbol.replace(/[{}]/g, '').trim();

  if (!isKnownSymbol(code)) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.55 }]}>{code}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text
        style={[
          styles.manaChar,
          {
            fontSize: size * 0.85,
            color: getManaColor(code),
            lineHeight: size,
            fontFamily: Platform.OS === 'web' ? 'Mana' : MANA_FONT_FAMILY,
          },
        ]}
      >
        {getManaUnicode(code)}
      </Text>
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
  manaChar: {
    textAlign: 'center' as const,
    fontWeight: 'normal' as const,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fallbackText: {
    color: '#AAA',
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
});
