import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { ErrorCategory, logger } from '@/utils/logger';
import { useI18n } from '@/stores/i18nStore';
import { buildQrUrl } from '@/services/printer/render/escpos';
import { usePrintPreview } from '@/features/print-preview/usePrintPreview';
import { useReceiptCapture } from '@/features/print-preview/useReceiptCapture';
import { styles } from './print-preview/styles';
import { ReceiptContent } from './print-preview/ReceiptContent';
import { PrintFooter } from './print-preview/PrintFooter';

export default function PrintPreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ cardJson: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const receiptWidth = screenWidth - 32;
  const artWidth = receiptWidth - 32;
  const artHeight = artWidth * 0.85;
  const { settings } = useSettingsStore();
  const { t } = useI18n();

  const receiptRef = useRef<View>(null);
  const receiptSlide = useRef(new Animated.Value(40)).current;
  const receiptOpacity = useRef(new Animated.Value(0)).current;
  const printBtnScale = useRef(new Animated.Value(1)).current;

  const [saved, setSaved] = useState<boolean>(false);
  const [activeFaceIndex, setActiveFaceIndex] = useState<number>(0);

  const card = useMemo<Card | null>(() => {
    try {
      if (params.cardJson) return JSON.parse(params.cardJson);
    } catch (error) {
      logger.debug(ErrorCategory.Render, 'Card param parse failed', error);
    }
    return null;
  }, [params.cardJson]);

  const isDoubleFaced = (card?.faces?.length ?? 0) > 1;

  const {
    printerState: printerConnection,
    outcomeBanner: printOutcome,
    isPrinting: isQueueing,
    sendPrintJob,
  } = usePrintPreview(card, isDoubleFaced);

  const { isSaving, saveToGallery } = useReceiptCapture(receiptRef);

  const displayFace = useMemo(() => {
    if (!card) return null;
    if (!isDoubleFaced) return card;
    const face = card.faces?.[activeFaceIndex];
    if (!face) return card;
    return {
      ...card,
      name: face.name ?? card.name,
      manaCost: face.manaCost ?? card.manaCost,
      typeLine: face.typeLine ?? card.typeLine,
      oracleText: face.oracleText ?? card.oracleText,
      flavorText: face.flavorText ?? card.flavorText,
      power: face.power ?? card.power,
      toughness: face.toughness ?? card.toughness,
      artCropUrl: face.image_uris?.art_crop ?? card.artCropUrl,
      normalImageUrl: face.image_uris?.normal ?? card.normalImageUrl,
    };
  }, [card, activeFaceIndex, isDoubleFaced]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(receiptSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(receiptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [receiptSlide, receiptOpacity]);

  const showSuccessFlash = useCallback(() => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(printBtnScale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(printBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [printBtnScale]);

  const handlePrint = useCallback(async () => {
    if (!card) return;

    Animated.sequence([
      Animated.timing(printBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(printBtnScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    if (settings.devMode) {
      await saveToGallery();
      showSuccessFlash();
      return;
    }

    await sendPrintJob();
  }, [card, printBtnScale, saveToGallery, sendPrintJob, settings.devMode, showSuccessFlash]);

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

  const hasStats = displayFace?.power !== undefined && displayFace?.toughness !== undefined;
  const scryfallUrl =
    card.scryfallUri ||
    `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;
  const qrUrl = buildQrUrl(scryfallUrl);

  const isDevMode = settings.devMode;
  const printMode = settings.printer?.printMode ?? 'full';
  const isImageOnly = printMode === 'image_only';
  const showArt = settings.printer?.printArt ?? true;
  const showQR = settings.printer?.printQR ?? true;
  const showFlavor = settings.printer?.printFlavorText ?? true;

  const canPrint = printerConnection === 'connected' || isDevMode;
  const isPrintActionDisabled = isSaving || isQueueing || !canPrint;

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
          {isDevMode
            ? t.printPreview.devModeLabel
            : isImageOnly
              ? 'FULL CARD IMAGE'
              : t.printPreview.thermalReceipt(settings.printer.paperWidth ?? 58)}
        </Text>

        {isDoubleFaced && (
          <View style={styles.faceToggle}>
            <Pressable
              onPress={() => setActiveFaceIndex(0)}
              style={[styles.faceToggleBtn, activeFaceIndex === 0 && styles.faceToggleBtnActive]}
            >
              <Text
                style={[
                  styles.faceToggleText,
                  activeFaceIndex === 0 && styles.faceToggleTextActive,
                ]}
              >
                Front
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFaceIndex(1)}
              style={[styles.faceToggleBtn, activeFaceIndex === 1 && styles.faceToggleBtnActive]}
            >
              <Text
                style={[
                  styles.faceToggleText,
                  activeFaceIndex === 1 && styles.faceToggleTextActive,
                ]}
              >
                Back
              </Text>
            </Pressable>
          </View>
        )}

        <ReceiptContent
          displayFace={displayFace}
          receiptRef={receiptRef}
          receiptWidth={receiptWidth}
          artWidth={artWidth}
          artHeight={artHeight}
          receiptOpacity={receiptOpacity}
          receiptSlide={receiptSlide}
          hasStats={hasStats}
          qrUrl={qrUrl}
          showArt={showArt}
          showQR={showQR}
          showFlavor={showFlavor}
          isImageOnly={isImageOnly}
          printerSettings={settings.printer ?? {}}
        />

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {isDevMode
              ? t.printPreview.devModeInfo
              : isImageOnly
                ? 'Prints the full card face image only.'
                : t.printPreview.thermalInfo(settings.printer.paperWidth ?? 58)}
          </Text>
          {card.artist && (
            <Text style={styles.infoArtist}>{t.printPreview.artBy(card.artist)}</Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <PrintFooter
        isDevMode={isDevMode}
        printerConnection={printerConnection}
        isSaving={isSaving}
        isQueueing={isQueueing}
        isPrintActionDisabled={isPrintActionDisabled}
        saved={saved}
        printBtnScale={printBtnScale}
        printOutcome={printOutcome}
        onPrint={handlePrint}
        onCancel={() => router.back()}
        insetsBottom={insets.bottom}
        cancelLabel={t.common.cancel}
        devPrintLabel={t.printPreview.saveToGallery}
        printLabel={t.printPreview.printCard}
        savedToGalleryLabel={t.printPreview.savedToGallery}
      />
    </View>
  );
}
