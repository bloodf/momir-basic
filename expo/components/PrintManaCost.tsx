import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { parseManaCost } from './ManaSymbol';

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
        return (
          <View key={`${code}-${i}`} style={[styles.badge, { minWidth: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.badgeText, { fontSize: size * 0.55, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
              {code}
            </Text>
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
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#222',
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
});
