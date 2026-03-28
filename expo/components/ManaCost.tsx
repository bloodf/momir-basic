import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ManaSymbol, parseManaCost } from './ManaSymbol';

interface ManaCostProps {
  manaCost: string;
  size?: number;
  gap?: number;
}

export const ManaCost = memo(function ManaCost({ manaCost, size = 20, gap = 3 }: ManaCostProps) {
  const symbols = parseManaCost(manaCost);
  if (symbols.length === 0) return null;

  return (
    <View style={[styles.container, { gap }]}>
      {symbols.map((s, i) => (
        <ManaSymbol key={`${s}-${i}`} symbol={s} size={size} />
      ))}
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
