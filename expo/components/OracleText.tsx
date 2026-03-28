import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

interface OracleTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

interface TextSegment {
  type: 'text' | 'symbol';
  value: string;
}

function parseOracleText(text: string): TextSegment[][] {
  const paragraphs = text.split('\n');
  return paragraphs.map(paragraph => {
    const segments: TextSegment[] = [];
    const regex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(paragraph)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: paragraph.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'symbol', value: match[1] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < paragraph.length) {
      segments.push({ type: 'text', value: paragraph.slice(lastIndex) });
    }

    return segments;
  });
}

function getSymbolUri(symbol: string): string {
  const code = symbol.replace(/[{}]/g, '').toUpperCase();
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`;
}

export const OracleText = memo(function OracleText({
  text,
  fontSize = 14,
  color = Colors.textPrimary,
}: OracleTextProps) {
  const paragraphs = useMemo(() => parseOracleText(text), [text]);
  const symbolSize = fontSize + 2;
  const lineH = fontSize * 1.5;

  return (
    <View style={styles.container}>
      {paragraphs.map((segments, pIdx) => (
        <Text key={pIdx} style={[styles.paragraph, { fontSize, color, lineHeight: lineH }]}>
          {segments.map((seg, sIdx) => {
            if (seg.type === 'symbol') {
              return (
                <Image
                  key={sIdx}
                  source={{ uri: getSymbolUri(seg.value) }}
                  style={{ width: symbolSize, height: symbolSize, marginBottom: -3 }}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              );
            }
            return <Text key={sIdx}>{seg.value}</Text>;
          })}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  paragraph: {
    flexWrap: 'wrap',
  },

});
