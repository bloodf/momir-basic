import React, { memo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';

interface SetSymbolProps {
  setCode: string;
  rarity: string;
  size?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#8A9EAF',
  rare: '#C9A44A',
  mythic: '#E8692D',
  special: '#7B5EA7',
  bonus: '#7B5EA7',
};

const svgCache = new Map<string, string>();

function getSetIconUrl(setCode: string): string {
  return `https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`;
}

function colorSvg(svgXml: string, color: string): string {
  let colored = svgXml;
  colored = colored.replace(/fill="[^"]*"/g, `fill="${color}"`);
  colored = colored.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  if (!colored.includes('fill=')) {
    colored = colored.replace(/<svg/, `<svg fill="${color}"`);
  }
  return colored;
}

function useSvgFetch(setCode: string): string | null {
  const [svgXml, setSvgXml] = useState<string | null>(() => {
    return svgCache.get(setCode.toLowerCase()) ?? null;
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const code = setCode.toLowerCase();
    const cached = svgCache.get(code);
    if (cached) {
      setSvgXml(cached);
      return;
    }

    let cancelled = false;
    const url = getSetIconUrl(code);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        if (!cancelled && mountedRef.current) {
          svgCache.set(code, text);
          setSvgXml(text);
        }
      })
      .catch(err => {
        console.log(`[SetSymbol] Failed to fetch SVG for ${code}:`, err.message);
      });

    return () => { cancelled = true; };
  }, [setCode]);

  return svgXml;
}

export const SetSymbol = memo(function SetSymbol({
  setCode,
  rarity,
  size = 18,
}: SetSymbolProps) {
  const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const svgXml = useSvgFetch(setCode);
  const hasGradient = rarity === 'rare' || rarity === 'mythic';

  if (!svgXml) {
    return <View style={{ width: size, height: size }} />;
  }

  const colored = colorSvg(svgXml, color);

  if (Platform.OS === 'web') {
    const encoded = encodeURIComponent(colored);
    const dataUri = `data:image/svg+xml,${encoded}`;
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        {hasGradient && (
          <View
            style={[
              styles.glowLayer,
              {
                width: size + 4,
                height: size + 4,
                borderRadius: (size + 4) / 2,
                backgroundColor: `${color}22`,
              },
            ]}
          />
        )}
        <Image
          source={{ uri: dataUri }}
          style={{ width: size, height: size }}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {hasGradient && (
        <View
          style={[
            styles.glowLayer,
            {
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              backgroundColor: `${color}22`,
            },
          ]}
        />
      )}
      <SvgXml xml={colored} width={size} height={size} />
    </View>
  );
});

export const SetSymbolWithStroke = memo(function SetSymbolWithStroke({
  setCode,
  rarity,
  size = 18,
}: SetSymbolProps) {
  const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const svgXml = useSvgFetch(setCode);
  const strokeSize = size + 2;

  if (!svgXml) {
    return <View style={{ width: strokeSize, height: strokeSize }} />;
  }

  const strokeColored = colorSvg(svgXml, '#000000');
  const fillColored = colorSvg(svgXml, color);

  if (Platform.OS === 'web') {
    const strokeEncoded = encodeURIComponent(strokeColored);
    const fillEncoded = encodeURIComponent(fillColored);
    return (
      <View style={[styles.strokeContainer, { width: strokeSize, height: strokeSize }]}>
        <Image
          source={{ uri: `data:image/svg+xml,${strokeEncoded}` }}
          style={{ width: strokeSize, height: strokeSize }}
          contentFit="contain"
        />
        <Image
          source={{ uri: `data:image/svg+xml,${fillEncoded}` }}
          style={[styles.iconOverlay, { width: size, height: size }]}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.strokeContainer, { width: strokeSize, height: strokeSize }]}>
      <SvgXml xml={strokeColored} width={strokeSize} height={strokeSize} />
      <View style={styles.iconOverlay}>
        <SvgXml xml={fillColored} width={size} height={size} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
  },
  strokeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
