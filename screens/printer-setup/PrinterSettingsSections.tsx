import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { DitheredImage } from '@/components/DitheredImage';
import type { PrinterPreferences } from '@/types';

import { styles } from '../printerSetup.styles';
import { DITHER_OPTIONS, QR_EC_OPTIONS, SAMPLE_ART_URL } from './constants';

interface PrinterSettingsSectionsProps {
  printer: PrinterPreferences;
  updatePrinter: (partial: Partial<PrinterPreferences>) => void;
}

export function PrinterSettingsSections({ printer, updatePrinter }: PrinterSettingsSectionsProps) {
  return (
    <>
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Image Pre-processing</Text>

        <View style={styles.previewFrame}>
          <DitheredImage
            imageUrl={SAMPLE_ART_URL}
            widthPx={192}
            algorithm={printer.imageDither}
            brightness={printer.imageBrightness}
            contrast={printer.imageContrast}
            threshold={printer.imageThreshold}
            maxHeightPx={240}
          />
        </View>

        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Algorithm</Text>
          <View style={styles.chipGroup}>
            {DITHER_OPTIONS.map(({ label, value }) => (
              <Pressable
                key={value}
                onPress={() => updatePrinter({ imageDither: value })}
                style={({ pressed }) => [
                  styles.chip,
                  printer.imageDither === value && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[styles.chipText, printer.imageDither === value && styles.chipTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.settingsLabel}>Brightness</Text>
            <Text style={styles.sliderValue}>{printer.imageBrightness.toFixed(2)}x</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() =>
                updatePrinter({
                  imageBrightness: Math.max(
                    0.5,
                    parseFloat((printer.imageBrightness - 0.05).toFixed(2))
                  ),
                })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperTrack}>
              <View
                style={[
                  styles.stepperFill,
                  { width: `${((printer.imageBrightness - 0.5) / 1.0) * 100}%` },
                ]}
              />
            </View>
            <Pressable
              onPress={() =>
                updatePrinter({
                  imageBrightness: Math.min(
                    1.5,
                    parseFloat((printer.imageBrightness + 0.05).toFixed(2))
                  ),
                })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.settingsLabel}>Contrast</Text>
            <Text style={styles.sliderValue}>{printer.imageContrast.toFixed(2)}x</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() =>
                updatePrinter({
                  imageContrast: Math.max(
                    0.5,
                    parseFloat((printer.imageContrast - 0.05).toFixed(2))
                  ),
                })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperTrack}>
              <View
                style={[
                  styles.stepperFill,
                  { width: `${((printer.imageContrast - 0.5) / 1.0) * 100}%` },
                ]}
              />
            </View>
            <Pressable
              onPress={() =>
                updatePrinter({
                  imageContrast: Math.min(
                    1.5,
                    parseFloat((printer.imageContrast + 0.05).toFixed(2))
                  ),
                })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.sliderLabelRow}>
            <Text
              style={[
                styles.settingsLabel,
                (printer.imageDither === 'floyd' || printer.imageDither === 'bayer') &&
                  styles.settingsLabelDimmed,
              ]}
            >
              Threshold
            </Text>
            <Text style={styles.sliderValue}>{printer.imageThreshold}</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() =>
                updatePrinter({ imageThreshold: Math.max(0, printer.imageThreshold - 1) })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperTrack}>
              <View
                style={[styles.stepperFill, { width: `${(printer.imageThreshold / 255) * 100}%` }]}
              />
            </View>
            <Pressable
              onPress={() =>
                updatePrinter({ imageThreshold: Math.min(255, printer.imageThreshold + 1) })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.settingsLabel}>Max Art Height</Text>
            <Text style={styles.sliderValue}>{printer.imageMaxHeightPx}px</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() =>
                updatePrinter({ imageMaxHeightPx: Math.max(200, printer.imageMaxHeightPx - 20) })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperTrack}>
              <View
                style={[
                  styles.stepperFill,
                  { width: `${((printer.imageMaxHeightPx - 200) / 440) * 100}%` },
                ]}
              />
            </View>
            <Pressable
              onPress={() =>
                updatePrinter({ imageMaxHeightPx: Math.min(640, printer.imageMaxHeightPx + 20) })
              }
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>QR Code</Text>

        <View style={styles.settingsRow}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.settingsLabel}>Module Size</Text>
            <Text style={styles.sliderValue}>{printer.qrSize}</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => updatePrinter({ qrSize: Math.max(1, printer.qrSize - 1) })}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperTrack}>
              <View
                style={[styles.stepperFill, { width: `${((printer.qrSize - 1) / 15) * 100}%` }]}
              />
            </View>
            <Pressable
              onPress={() => updatePrinter({ qrSize: Math.min(16, printer.qrSize + 1) })}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperButtonPressed,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Error Correction</Text>
          <View style={styles.chipGroup}>
            {QR_EC_OPTIONS.map(({ label, value }) => (
              <Pressable
                key={value}
                onPress={() => updatePrinter({ qrErrorCorrection: value })}
                style={({ pressed }) => [
                  styles.chip,
                  printer.qrErrorCorrection === value && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    printer.qrErrorCorrection === value && styles.chipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </>
  );
}
