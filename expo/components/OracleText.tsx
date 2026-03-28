import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { getManaUnicode, getManaColor, isKnownSymbol, MANA_FONT_FAMILY } from '@/constants/manaSymbols';

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

export const OracleText = memo(function OracleText({
  text,
  fontSize = 14,
  color = Colors.textPrimary,
}: OracleTextProps) {
  const paragraphs = useMemo(() => parseOracleText(text), [text]);
  const lineH = fontSize * 1.6;
  const symbolFontSize = fontSize + 1;

  return (
    <View style={styles.container}>
      {paragraphs.map((segments, pIdx) => (
        <Text key={pIdx} style={[styles.paragraph, { fontSize, color, lineHeight: lineH }]}>
          {segments.map((seg, sIdx) => {
            if (seg.type === 'symbol') {
              if (isKnownSymbol(seg.value)) {
                return (
                  <Text
                    key={sIdx}
                    style={[
                      styles.manaChar,
                      {
                        fontSize: symbolFontSize,
                        color: getManaColor(seg.value),
                        lineHeight: lineH,
                        fontFamily: Platform.OS === 'web' ? 'Mana' : MANA_FONT_FAMILY,
                      },
                    ]}
                  >
                    {getManaUnicode(seg.value)}
                  </Text>
                );
              }
              return (
                <Text key={sIdx} style={[styles.fallbackSymbol, { fontSize: fontSize - 1, lineHeight: lineH }]}>
                  {`{${seg.value}}`}
                </Text>
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
  manaChar: {
    fontWeight: 'normal' as const,
  },
  fallbackSymbol: {
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
});
