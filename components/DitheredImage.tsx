import React, { useState, useEffect, memo } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import type { ImageStyle } from 'react-native';
import { rasterizeCardArtForPrint } from '@/utils/printerImage';
import type { DitherAlgorithm } from '@/types';

interface DitheredImageProps {
  imageUrl: string;
  widthPx: number;
  algorithm?: DitherAlgorithm;
  brightness?: number;
  contrast?: number;
  threshold?: number;
  maxHeightPx?: number;
  style?: ImageStyle;
}

export const DitheredImage = memo(function DitheredImage({
  imageUrl,
  widthPx,
  algorithm,
  brightness,
  contrast,
  threshold,
  maxHeightPx,
  style,
}: DitheredImageProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviewUri(null);
    setPreviewSize(null);

    rasterizeCardArtForPrint(imageUrl, widthPx, {
      algorithm: algorithm as 'floyd' | 'bayer' | 'threshold' | 'none' | undefined,
      brightness,
      contrast,
      threshold,
      maxHeightPx,
    })
      .then((result) => {
        if (cancelled) return;
        setPreviewUri(result.previewDataUri);
        setPreviewSize({ width: result.widthPx, height: result.heightPx });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Rasterization failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, widthPx, algorithm, brightness, contrast, threshold, maxHeightPx]);

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color="#888" />
      </View>
    );
  }

  if (error || !previewUri || !previewSize) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.errorText}>{error ?? 'Preview unavailable'}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: previewUri }}
      style={[{ width: previewSize.width, height: previewSize.height }, style]}
      contentFit="fill"
    />
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  errorText: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    padding: 8,
  },
});
