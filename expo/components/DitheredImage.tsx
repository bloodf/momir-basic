import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Rect, Defs, Pattern, Circle } from 'react-native-svg';

interface DitheredImageProps {
  uri: string;
  width: number;
  height: number;
  animated?: boolean;
  scanlineSpeed?: number;
}

export const DitheredImage = React.memo(function DitheredImage({
  uri,
  width,
  height,
  animated = false,
  scanlineSpeed = 2000,
}: DitheredImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const scanlineAnim = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (animated && imageLoaded) {
      scanlineAnim.setValue(0);
      revealAnim.setValue(0);

      Animated.parallel([
        Animated.timing(revealAnim, {
          toValue: 1,
          duration: scanlineSpeed,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(scanlineAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
            Animated.timing(scanlineAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: false,
            }),
          ]),
          { iterations: Math.ceil(scanlineSpeed / 800) }
        ),
      ]).start();
    }
  }, [animated, imageLoaded, scanlineAnim, revealAnim, scanlineSpeed]);

  const onLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const clipHeight = animated
    ? revealAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, height],
      })
    : height;

  const scanlineY = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.placeholder, { width, height }]} />

      <Animated.View style={[styles.imageWrap, { width, height: clipHeight, overflow: 'hidden' as const }]}>
        <Image
          source={{ uri }}
          style={[styles.image, { width, height }]}
          contentFit="cover"
          onLoad={onLoad}
          transition={0}
        />

        <View style={[StyleSheet.absoluteFill, styles.grayscaleOverlay]} />

        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="ditherDots" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <Circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.15)" />
              <Circle cx="3" cy="3" r="0.6" fill="rgba(0,0,0,0.1)" />
            </Pattern>
            <Pattern id="ditherLines" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
              <Rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.06)" />
              <Rect x="1" y="1" width="1" height="1" fill="rgba(0,0,0,0.06)" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#ditherDots)" />
          <Rect x="0" y="0" width={width} height={height} fill="url(#ditherLines)" />
        </Svg>

        <View style={[StyleSheet.absoluteFill, styles.contrastBoost]} />
      </Animated.View>

      {animated && (
        <Animated.View
          style={[
            styles.scanline,
            {
              width,
              transform: [{ translateY: scanlineY as unknown as number }],
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: '#E0E0E0',
  },
  placeholder: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    backgroundColor: '#E8E8E8',
  },
  imageWrap: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  image: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  grayscaleOverlay: {
    backgroundColor: 'rgba(128,128,128,0.08)',
    ...(Platform.OS === 'web'
      ? { mixBlendMode: 'saturation' as never, backgroundColor: 'gray', opacity: 0.85 }
      : {}),
  },
  contrastBoost: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    ...(Platform.OS === 'web'
      ? { mixBlendMode: 'multiply' as never, backgroundColor: 'rgba(255,255,255,0.1)' }
      : {}),
  },
  scanline: {
    position: 'absolute' as const,
    left: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
