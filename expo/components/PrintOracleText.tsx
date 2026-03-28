import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface PrintOracleTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

interface TextSegment {
  type: 'text' | 'symbol';
  value: string;
}

const SYMBOL_LABELS: Record<string, string> = {
  'W': '{W}',
  'U': '{U}',
  'B': '{B}',
  'R': '{R}',
  'G': '{G}',
  'C': '{C}',
  'S': '{S}',
  'E': '{E}',
  'X': '{X}',
  'Y': '{Y}',
  'Z': '{Z}',
  'T': '{T}',
  'Q': '{Q}',
  'CHAOS': '{CHAOS}',
};

function getSymbolLabel(code: string): string {
  const upper = code.toUpperCase().trim();
  if (SYMBOL_LABELS[upper]) return SYMBOL_LABELS[upper];
  if (/^\d+$/.test(upper)) return `{${upper}}`;
  if (upper.includes('/')) return `{${upper}}`;
  return `{${code}}`;
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

export const PrintOracleText = memo(function PrintOracleText({
  text,
  fontSize = 13,
  color = '#000000',
}: PrintOracleTextProps) {
  const paragraphs = useMemo(() => parseOracleText(text), [text]);
  const lineH = fontSize * 1.55;

  return (
    <View style={styles.container}>
      {paragraphs.map((segments, pIdx) => (
        <Text key={pIdx} style={[styles.paragraph, { fontSize, color, lineHeight: lineH }]}>
          {segments.map((seg, sIdx) => {
            if (seg.type === 'symbol') {
              const label = getSymbolLabel(seg.value);
              return (
                <Text
                  key={sIdx}
                  style={{
                    fontSize: fontSize - 1,
                    lineHeight: lineH,
                    color: '#333',
                    fontWeight: '700' as const,
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  }}
                >
                  {label}
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
    gap: 6,
  },
  paragraph: {
    flexWrap: 'wrap',
  },
});
