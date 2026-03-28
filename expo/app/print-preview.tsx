import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { X, Printer, Download, Check, Sword, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n } from '@/i18n';
import { PrintManaCost } from '@/components/PrintManaCost';
import { PrintOracleText } from '@/components/PrintOracleText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECEIPT_WIDTH = SCREEN_WIDTH - 48;
const ART_WIDTH = RECEIPT_WIDTH - 32;
const ART_HEIGHT = ART_WIDTH * 0.85;

export default function PrintPreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ cardJson: string }>();
  const { settings } = useSettings();
  const { t } = useI18n();

  const receiptRef = useRef<View>(null);
  const receiptSlide = useRef(new Animated.Value(40)).current;
  const receiptOpacity = useRef(new Animated.Value(0)).current;
  const printBtnScale = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const card = useMemo<Card | null>(() => {
    try {
      if (params.cardJson) return JSON.parse(params.cardJson);
    } catch (e) {
      console.log('[PrintPreview] Parse error:', e);
    }
    return null;
  }, [params.cardJson]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(receiptSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(receiptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [receiptSlide, receiptOpacity]);

  const showSuccessFlash = useCallback(() => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  }, [successOpacity]);

  const handleDevPrint = useCallback(async () => {
    if (!card || !receiptRef.current) return;
    if (Platform.OS as string === 'web') {
      Alert.alert(t.printPreview.notAvailable, t.printPreview.devPrintNotSupported);
      return;
    }

    setIsSaving(true);
    console.log('[PrintPreview] Dev mode: capturing receipt...');

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.printPreview.permissionDenied, t.printPreview.galleryAccessRequired);
        setIsSaving(false);
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('[PrintPreview] Captured to:', uri);

      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('[PrintPreview] Saved to gallery:', asset.uri);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showSuccessFlash();
    } catch (err) {
      console.log('[PrintPreview] Dev print error:', err);
      Alert.alert(t.printPreview.saveFailed, t.printPreview.saveFailedMsg);
    } finally {
      setIsSaving(false);
    }
  }, [card, showSuccessFlash, t]);

  const handlePrint = useCallback(() => {
    if (!card) return;

    Animated.sequence([
      Animated.timing(printBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(printBtnScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (settings.devMode) {
      void handleDevPrint();
      return;
    }

    if (!settings.printerConnected) {
      Alert.alert(t.printPreview.noPrinter, t.printPreview.noPrinterMsg);
      return;
    }

    Alert.alert(
      t.printPreview.printing,
      `${t.printPreview.sendingToPrinter(card.name, settings.printer.name)}\n\n${t.printPreview.bluetoothRequired}`,
    );
  }, [card, settings, printBtnScale, handleDevPrint, t]);

  if (!card) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{t.card.noCardData}</Text>
          <Pressable onPress={() => router.back()} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>{t.common.goBack}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasStats = card.power !== undefined && card.toughness !== undefined;
  const scryfallUrl = card.scryfallUri || `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(scryfallUrl)}&bgcolor=FFFFFF&color=000000&margin=0`;

  const isDevMode = settings.devMode;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} testID="close-preview">
          <X size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.printPreview.title}</Text>
          {isDevMode && (
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>{t.printPreview.devMode}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.previewLabel}>
          {isDevMode ? t.printPreview.devModeLabel : t.printPreview.thermalReceipt(settings.printer.paperWidth ?? 58)}
        </Text>

        <Animated.View style={{ opacity: receiptOpacity, transform: [{ translateY: receiptSlide }] }}>
          <View ref={receiptRef} collapsable={false} style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptCardName} numberOfLines={2}>
                {card.name}
              </Text>
              <PrintManaCost manaCost={card.manaCost} size={16} gap={2} />
            </View>

            <View style={styles.receiptArtWrap}>
              <Image
                source={{ uri: card.artCropUrl || card.normalImageUrl }}
                style={styles.receiptArt}
                contentFit="cover"
                transition={200}
              />
            </View>

            <Text style={styles.receiptTypeLine}>
              {card.typeLine.replace('—', '\u2014')}
            </Text>

            {card.oracleText ? (
              <View style={styles.receiptOracleWrap}>
                <PrintOracleText text={card.oracleText} fontSize={12} color="#000000" />
              </View>
            ) : null}

            {card.flavorText ? (
              <Text style={styles.receiptFlavor}>
                {card.flavorText}
              </Text>
            ) : null}

            {hasStats && (
              <View style={styles.receiptStatsRow}>
                <View style={styles.receiptStatItem}>
                  <Sword size={12} color="#000000" />
                  <Text style={styles.receiptStatValue}>{card.power}</Text>
                </View>
                <Text style={styles.receiptStatSlash}>/</Text>
                <View style={styles.receiptStatItem}>
                  <Shield size={12} color="#000000" />
                  <Text style={styles.receiptStatValue}>{card.toughness}</Text>
                </View>
              </View>
            )}

            <View style={styles.receiptQrWrap}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.receiptQr}
                contentFit="contain"
                transition={200}
              />
            </View>
          </View>
        </Animated.View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {isDevMode
              ? t.printPreview.devModeInfo
              : t.printPreview.thermalInfo(settings.printer.paperWidth ?? 58)
            }
          </Text>
          {card.artist && (
            <Text style={styles.infoArtist}>{t.printPreview.artBy(card.artist)}</Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {saved && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]} pointerEvents="none">
          <View style={styles.successBubble}>
            <Check size={28} color="#fff" />
            <Text style={styles.successText}>{t.printPreview.savedToGallery}</Text>
          </View>
        </Animated.View>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.footerBtn, styles.footerBtnOutline, pressed && styles.footerPressed]}
        >
          <Text style={styles.footerBtnOutlineText}>{t.common.cancel}</Text>
        </Pressable>
        <Animated.View style={[styles.footerBtnWrap, { transform: [{ scale: printBtnScale }] }]}>
          <Pressable
            onPress={handlePrint}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.footerBtn,
              isDevMode ? styles.footerBtnDev : styles.footerBtnPrimary,
              pressed && styles.footerPressed,
              isSaving && styles.footerBtnDisabled,
            ]}
            testID="confirm-print"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                {isDevMode ? (
                  <Download size={17} color={Colors.background} />
                ) : (
                  <Printer size={17} color={Colors.background} />
                )}
                <Text style={styles.footerBtnPrimaryText}>
                  {isDevMode ? t.printPreview.saveToGallery : t.printPreview.printCard}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerBtnPlaceholder: {
    width: 40,
  },
  headerCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  devBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  devBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  receipt: {
    width: RECEIPT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  receiptHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  receiptCardName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 22,
  },
  receiptArtWrap: {
    width: ART_WIDTH,
    height: ART_HEIGHT,
    backgroundColor: '#E0E0E0',
    marginBottom: 14,
    overflow: 'hidden' as const,
  },
  receiptArt: {
    width: '100%',
    height: '100%',
  },
  receiptTypeLine: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center' as const,
    marginBottom: 14,
    lineHeight: 20,
  },
  receiptOracleWrap: {
    marginBottom: 12,
  },
  receiptFlavor: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#444444',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontStyle: 'italic' as const,
    lineHeight: 18,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    paddingTop: 10,
  },
  receiptStatsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    alignSelf: 'flex-end' as const,
  },
  receiptStatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
  },
  receiptStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptStatSlash: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptQrWrap: {
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  receiptQr: {
    width: 100,
    height: 100,
  },
  infoSection: {
    marginTop: 16,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  infoArtist: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  successBubble: {
    backgroundColor: 'rgba(76, 175, 80, 0.92)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  footer: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  footerBtnWrap: {
    flex: 1,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  footerPressed: {
    opacity: 0.75,
  },
  footerBtnOutline: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerBtnOutlineText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  footerBtnPrimary: {
    backgroundColor: Colors.gold,
  },
  footerBtnDev: {
    backgroundColor: '#4CAF50',
  },
  footerBtnDisabled: {
    opacity: 0.6,
  },
  footerBtnPrimaryText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  errorBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
