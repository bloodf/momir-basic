import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { getSymbolSvgUrl } from '@/constants/manaSymbols';

interface OracleTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

type Chunk =
  | { kind: 'word'; value: string }
  | { kind: 'symbol'; code: string }
  | { kind: 'break'; value?: undefined };

function tokenize(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach((paragraph, pIdx) => {
    if (pIdx > 0) chunks.push({ kind: 'break' });

    const regex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(paragraph)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = paragraph.slice(lastIndex, match.index);
        const words = textBefore.split(/(\s+)/);
        words.forEach(w => {
          if (w.length > 0) chunks.push({ kind: 'word', value: w });
        });
      }
      chunks.push({ kind: 'symbol', code: match[1] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < paragraph.length) {
      const remaining = paragraph.slice(lastIndex);
      const words = remaining.split(/(\s+)/);
      words.forEach(w => {
        if (w.length > 0) chunks.push({ kind: 'word', value: w });
      });
    }
  });

  return chunks;
}

export const OracleText = memo(function OracleText({
  text,
  fontSize = 14,
  color = Colors.textPrimary,
}: OracleTextProps) {
  const chunks = useMemo(() => tokenize(text), [text]);
  const symbolSize = fontSize + 2;

  const paragraphs: Chunk[][] = useMemo(() => {
    const result: Chunk[][] = [[]];
    chunks.forEach(c => {
      if (c.kind === 'break') {
        result.push([]);
      } else {
        result[result.length - 1].push(c);
      }
    });
    return result;
  }, [chunks]);

  return (
    <View style={styles.container}>
      {paragraphs.map((para, pIdx) => (
        <View key={pIdx} style={styles.paragraph}>
          {para.map((chunk, cIdx) => {
            if (chunk.kind === 'symbol') {
              return (
                <Image
                  key={cIdx}
                  source={{ uri: getSymbolSvgUrl(chunk.code) }}
                  style={[styles.symbolImage, { width: symbolSize, height: symbolSize, marginTop: (fontSize * 1.5 - symbolSize) / 2 }]}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              );
            }
            return (
              <Text
                key={cIdx}
                style={{ fontSize, color, lineHeight: fontSize * 1.5 }}
              >
                {chunk.value}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  paragraph: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  symbolImage: {
    marginHorizontal: 1,
  },
});
