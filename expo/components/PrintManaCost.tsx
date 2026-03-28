import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { parseManaCost } from './ManaSymbol';
import { getManaUnicode, getManaColor, isKnownSymbol, MANA_FONT_FAMILY } from '@/constants/manaSymbols';

interface PrintManaCostProps {
  manaCost: string;
  size?: number;
  gap?: number;
}

export const PrintManaCost = memo(function PrintManaCost({ manaCost, size = 18, gap = 3 }: PrintManaCostProps) {
  const symbols = parseManaCost(manaCost);
  if (symbols.length === 0) return null;

  return (
    <View style={[styles.container, { gap }]}>
      {symbols.map((s, i) => {
        const code = s.replace(/[{}]/g, '').trim();
        if (isKnownSymbol(code)) {
          return (
            <Text
              key={`${code}-${i}`}
              style={{
                fontSize: size * 0.85,
                color: getManaColor(code),
                lineHeight: size,
                fontFamily: Platform.OS === 'web' ? 'Mana' : MANA_FONT_FAMILY,
                fontWeight: 'normal' as const,
                textAlign: 'center' as const,
                width: size,
                height: size,
              }}
            >
              {getManaUnicode(code)}
            </Text>
          );
        }
        return (
          <View key={`${code}-${i}`} style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.fallbackText, { fontSize: size * 0.55 }]}>{code}</Text>
          </View>
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
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fallbackText: {
    color: '#666',
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
});
