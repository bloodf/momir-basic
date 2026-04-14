import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import { PrintManaCost } from '@/components/PrintManaCost';
import { PrintOracleText } from '@/components/PrintOracleText';
import { DitheredImage } from '@/components/DitheredImage';
import type { DitherAlgorithm } from '@/types';
import { styles } from './styles';

export interface DisplayFace {
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  artCropUrl?: string;
  normalImageUrl?: string;
}

interface PrinterSettings {
  paperWidth?: number;
  printMode?: string;
  printArt?: boolean;
  printQR?: boolean;
  printFlavorText?: boolean;
  imageDither?: DitherAlgorithm;
  imageBrightness?: number;
  imageContrast?: number;
  imageThreshold?: number;
  imageMaxHeightPx?: number;
}

interface ReceiptContentProps {
  displayFace: DisplayFace | null;
  receiptRef: React.RefObject<View | null>;
  receiptWidth: number;
  artWidth: number;
  artHeight: number;
  receiptOpacity: Animated.Value;
  receiptSlide: Animated.Value;
  hasStats: boolean;
  qrUrl: string;
  showArt: boolean;
  showQR: boolean;
  showFlavor: boolean;
  isImageOnly: boolean;
  printerSettings: PrinterSettings;
}

export function ReceiptContent({
  displayFace,
  receiptRef,
  receiptWidth,
  artWidth,
  artHeight,
  receiptOpacity,
  receiptSlide,
  hasStats,
  qrUrl,
  showArt,
  showQR,
  showFlavor,
  isImageOnly,
  printerSettings,
}: ReceiptContentProps) {
  return (
    <Animated.View style={{ opacity: receiptOpacity, transform: [{ translateY: receiptSlide }] }}>
      <View ref={receiptRef} collapsable={false} style={[styles.receipt, { width: receiptWidth }]}>
        {isImageOnly ? (
          <View style={styles.imageOnlyWrap}>
            <Image
              source={{ uri: displayFace?.normalImageUrl || displayFace?.artCropUrl }}
              style={[
                styles.imageOnlyArt,
                { width: receiptWidth - 32, height: (receiptWidth - 32) * 1.4 },
              ]}
              contentFit="contain"
              transition={200}
            />
          </View>
        ) : (
          <>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptCardName} numberOfLines={2}>
                {displayFace?.name}
              </Text>
              <PrintManaCost manaCost={displayFace?.manaCost ?? ''} size={16} gap={2} />
            </View>

            {showArt && (displayFace?.artCropUrl || displayFace?.normalImageUrl) && (
              <View style={[styles.receiptArtWrap, { width: artWidth, height: artHeight }]}>
                <DitheredImage
                  imageUrl={(displayFace.artCropUrl || displayFace.normalImageUrl) as string}
                  widthPx={printerSettings.paperWidth === 80 ? 576 : 384}
                  algorithm={printerSettings.imageDither ?? 'floyd'}
                  brightness={printerSettings.imageBrightness ?? 1.0}
                  contrast={printerSettings.imageContrast ?? 1.0}
                  threshold={printerSettings.imageThreshold ?? 128}
                  maxHeightPx={printerSettings.imageMaxHeightPx ?? 480}
                  style={styles.receiptArt}
                />
              </View>
            )}

            <Text style={styles.receiptTypeLine}>
              {(displayFace?.typeLine ?? '').replace('—', '\u2014')}
            </Text>

            {displayFace?.oracleText ? (
              <View style={styles.receiptOracleWrap}>
                <PrintOracleText text={displayFace.oracleText} fontSize={12} color="#000000" />
              </View>
            ) : null}

            {showFlavor && displayFace?.flavorText ? (
              <Text style={styles.receiptFlavor}>{displayFace.flavorText}</Text>
            ) : null}

            {hasStats && (
              <View style={styles.receiptStatsRow}>
                <Text style={styles.receiptStatValue}>
                  {displayFace?.power} / {displayFace?.toughness}
                </Text>
              </View>
            )}

            {showQR && (
              <View style={styles.receiptQrWrap}>
                <Image
                  source={{ uri: qrUrl }}
                  style={styles.receiptQr}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
}
