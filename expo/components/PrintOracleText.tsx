import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface PrintOracleTextProps {
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

function getScryfallSvgUri(symbol: string): string {
  const code = symbol.replace(/[{}]/g, '').toUpperCase();
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`;
}

export const PrintOracleText = memo(function PrintOracleText({
  text,
  fontSize = 13,
  color = '#000000',
}: PrintOracleTextProps) {
  const paragraphs = useMemo(() => parseOracleText(text), [text]);
  const symbolSize = fontSize + 1;

  return (
    <View style={styles.container}>
      {paragraphs.map((segments, pIdx) => (
        <Text key={pIdx} style={[styles.paragraph, { fontSize, color, lineHeight: fontSize * 1.55 }]}>
          {segments.map((seg, sIdx) => {
            if (seg.type === 'symbol') {
              return (
                <View
                  key={sIdx}
                  style={[styles.symbolWrap, { width: symbolSize, height: symbolSize }]}
                >
                  <Image
                    source={{ uri: getScryfallSvgUri(seg.value) }}
                    style={{ width: symbolSize, height: symbolSize }}
                    contentFit="contain"
                    cachePolicy="disk"
                  />
                </View>
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
    gap: 6,
  },
  paragraph: {
    flexWrap: 'wrap',
  },
  symbolWrap: {
    marginHorizontal: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
