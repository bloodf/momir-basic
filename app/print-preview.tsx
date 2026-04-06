import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { X, Printer, Download, Check, AlertTriangle, WifiOff, Loader } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useSettings } from '@/providers/SettingsProvider';
import { showToast } from '@/components/Toast';
import { useI18n } from '@/i18n';
import { PrintManaCost } from '@/components/PrintManaCost';
import { PrintOracleText } from '@/components/PrintOracleText';
import { createAdapter } from '../services/printer/adapters/factory';
import { buildQrUrl } from '../services/printer/render/escpos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECEIPT_WIDTH = SCREEN_WIDTH - 32;
const ART_WIDTH = RECEIPT_WIDTH - 32;
const ART_HEIGHT = ART_WIDTH * 0.85;
const QR_PREVIEW_SIZE = 144;

type PrinterConnectionState = 'checking' | 'connected' | 'disconnected' | 'no_printer';

type PrintOutcomeBanner = {
  type: 'queued' | 'success' | 'uncertain' | 'failed';
  message: string;
};

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

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isQueueing, setIsQueueing] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [printOutcome, setPrintOutcome] = useState<PrintOutcomeBanner | null>(null);

  // Printer connection state
  const [printerConnection, setPrinterConnection] = useState<PrinterConnectionState>('checking');

  // Active face index for dual-faced cards (0 = front, 1 = back)
  const [activeFaceIndex, setActiveFaceIndex] = useState<number>(0);

  const card = useMemo<Card | null>(() => {
    try {
      if (params.cardJson) return JSON.parse(params.cardJson);
    } catch {
      // Card parse error — handled by null return
    }
    return null;
  }, [params.cardJson]);

  // Determine if card is double-faced
  const isDoubleFaced = (card?.faces?.length ?? 0) > 1;

  // Get the appropriate face data for display
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

  /**
   * verifyPrinterConnection — checks if the preferred printer is physically connected.
   * This uses the adapter.isConnected() call to determine real state.
   */
  const verifyPrinterConnection = useCallback(async () => {
    const prefId = settings.printer?.preferredPrinterId;
    if (!prefId) {
      setPrinterConnection('no_printer');
      return;
    }

    try {
      const adapter = createAdapter();
      const isConnected = await adapter.isConnected(prefId);
      setPrinterConnection(isConnected ? 'connected' : 'disconnected');
    } catch {
      setPrinterConnection('disconnected');
    }
  }, [settings.printer?.preferredPrinterId]);

  useEffect(() => {
    if (!settings.devMode) {
      void verifyPrinterConnection();
    }
  }, [settings.devMode, verifyPrinterConnection]);

  const showSuccessFlash = useCallback(() => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(printBtnScale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(printBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [printBtnScale]);

  const handleDevPrint = useCallback(async () => {
    if (!card || !receiptRef.current) return;
    if (Platform.OS as string === 'web') {
      showToast({ type: 'info', title: t.printPreview.notAvailable, message: t.printPreview.devPrintNotSupported });
      return;
    }

    setIsSaving(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'error', title: t.printPreview.permissionDenied, message: t.printPreview.galleryAccessRequired });
        setIsSaving(false);
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const asset = await MediaLibrary.createAssetAsync(uri);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showSuccessFlash();
    } catch {
      showToast({ type: 'error', title: t.printPreview.saveFailed, message: t.printPreview.saveFailedMsg });
    } finally {
      setIsSaving(false);
    }
  }, [card, showSuccessFlash, t]);

  /**
   * handlePrint — enqueues a card receipt print job and processes the queue.
   *
   * After processing, inspects the job state to determine the actual outcome:
   * - printed_confirmed: printer confirmed receipt
   * - sent_unknown: uncertain delivery (mid-write disconnect) — operator must reconcile
   * - failed_terminal | failed_retryable: printer/hardware error
   *
   * The UI is updated to reflect the real outcome, not an assumed success.
   */
  const handlePrint = useCallback(async () => {
    if (!card) return;
    const scryfallUrl = card.scryfallUri || `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;

    Animated.sequence([
      Animated.timing(printBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(printBtnScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setPrintOutcome(null);

    if (settings.devMode) {
      void handleDevPrint();
      return;
    }

    const preferredPrinterId = settings.printer?.preferredPrinterId;

    if (!preferredPrinterId) {
        setPrintOutcome({ type: 'failed', message: t.printer.noPrinterSelected });
      showToast({ type: 'warning', title: 'No Printer', message: 'Please select a printer in Settings first.' });
      return;
    }

    // Verify physical connection before attempting print
    try {
      const adapter = createAdapter();
      const isConnected = await adapter.isConnected(preferredPrinterId);
      if (!isConnected) {
        setPrintOutcome({ type: 'failed', message: t.toast.printerReconnectMessage });
        showToast({ type: 'error', title: t.toast.printerReconnectTitle, message: t.toast.printerReconnectMessage });
        return;
      }
    } catch {
      setPrintOutcome({ type: 'failed', message: t.printer.verificationFailed });
      return;
    }

    const cardReceiptData = {
      name: card.name,
      manaCost: card.manaCost,
      type: card.typeLine,
      oracleText: card.oracleText,
      flavorText: card.flavorText,
      power: card.power,
      toughness: card.toughness,
      imageUrl: card.normalImageUrl || card.artCropUrl,
      setCode: card.setCode,
      scryfallId: card.id,
      backFaceData: isDoubleFaced && card.faces?.[1] ? {
        name: card.faces[1].name ?? card.name,
        manaCost: card.faces[1].manaCost,
        type: card.faces[1].typeLine ?? card.typeLine,
        oracleText: card.faces[1].oracleText,
        flavorText: card.faces[1].flavorText,
        power: card.faces[1].power,
        toughness: card.faces[1].toughness,
        imageUrl: card.faces[1].image_uris?.normal ?? card.faces[1].image_uris?.art_crop,
      } : undefined,
    };

    try {
      setIsQueueing(true);

      const adapter = createAdapter();
      // preferredPrinterId is a registry DB key — adapter.connectPrinter handles address lookup
      await adapter.connectPrinter(preferredPrinterId);

      const paperWidth = (settings.printer?.paperWidth ?? 58) as 58 | 80;
      const printMode = settings.printer?.printMode ?? 'full';
      const imageUrl = cardReceiptData.imageUrl;
      const widthPx = paperWidth === 80 ? 576 : 384;

      if (printMode === 'image_only') {
        // FULL CARD MODE: Print the full card face image(s)
        const frontCardUrl = card.normalImageUrl || card.artCropUrl;
        if (frontCardUrl) {
          await adapter.sendImage(frontCardUrl, widthPx, 0);
        } else {
          throw new Error('No card image available to print.');
        }
        // Print back face if double-faced
        if (isDoubleFaced && card.faces?.[1]) {
          const backFace = card.faces[1];
          const backImageUrl = backFace.image_uris?.normal ?? backFace.image_uris?.art_crop;
          if (backImageUrl) {
            await adapter.sendImage(backImageUrl, widthPx, 0);
          }
        }
      } else {
        // RECEIPT MODE: ESC/POS with split calls matching preview order
        // Name+Mana → Art → Type → Oracle → Flavor → Stats → QR
        const printArt = settings.printer?.printArt ?? true;
        const printQR = settings.printer?.printQR ?? true;
        const printFlavor = settings.printer?.printFlavorText ?? true;
        const artUrl = card.artCropUrl || card.normalImageUrl;
        const maxCols = paperWidth === 80 ? 48 : 32;
        const sep = '='.repeat(maxCols) + '\n';

        // --- PART 1: Header (name + mana on same line) ---
        const manaCost = cardReceiptData.manaCost || '';
        const nameLine = manaCost
          ? `${cardReceiptData.name} ${manaCost}`
          : cardReceiptData.name;

        const headerText = [
          '\x1B\x40',          // Init
          '\x1B\x61\x01',      // Center
          '\x1B\x45\x01',      // Bold
          nameLine + '\n',
          '\x1B\x45\x00',      // Bold off
          sep,
        ].join('');

        await adapter.sendText(headerText);

        // --- PART 2: Art crop image ---
        if (printArt && artUrl) {
          try {
            await adapter.sendImage(artUrl, widthPx, 0);
          } catch {
            // Image failed — continue
          }
        }

        // --- PART 3: Body (type → oracle → flavor → stats) ---
        const wrapText = (text: string, width: number): string => {
          const words = text.split(' ');
          const lines: string[] = [];
          let line = '';
          for (const word of words) {
            if (line.length + word.length + 1 > width) {
              lines.push(line);
              line = word;
            } else {
              line = line ? `${line} ${word}` : word;
            }
          }
          if (line) lines.push(line);
          return lines.join('\n') + '\n';
        };

        const body: string[] = [
          '\x1B\x61\x01',      // Center
          cardReceiptData.type + '\n',
          sep,
        ];

        if (cardReceiptData.oracleText) {
          body.push('\x1B\x61\x00'); // Left
          body.push(wrapText(cardReceiptData.oracleText, maxCols));
        }

        if (printFlavor && cardReceiptData.flavorText) {
          body.push('\n\x1B\x61\x01'); // Center
          body.push(`"${cardReceiptData.flavorText}"\n`);
        }

        if (cardReceiptData.power !== undefined && cardReceiptData.toughness !== undefined) {
          body.push('\n\x1B\x61\x02'); // Right
          body.push('\x1B\x45\x01');   // Bold
          body.push(`${cardReceiptData.power}/${cardReceiptData.toughness}\n`);
          body.push('\x1B\x45\x00');
        }

        await adapter.sendText(body.join(''));

        // --- PART 4: QR code ---
        if (printQR) {
          try {
            await adapter.sendQRCode(scryfallUrl, QR_PREVIEW_SIZE);
          } catch {
            // QR failed — continue
          }
        }

        // --- BACK FACE: Print back of double-faced card ---
        if (isDoubleFaced && cardReceiptData.backFaceData) {
          const back = cardReceiptData.backFaceData;
          await adapter.sendText('\n' + sep);
          await adapter.sendText('--- BACK FACE ---\n');
          await adapter.sendText(sep);

          // Back face header
          const backManaCost = back.manaCost || '';
          const backNameLine = backManaCost
            ? `${back.name} ${backManaCost}`
            : back.name;

          const backHeaderText = [
            '\x1B\x40',
            '\x1B\x61\x01',
            '\x1B\x45\x01',
            backNameLine + '\n',
            '\x1B\x45\x00',
            sep,
          ].join('');

          await adapter.sendText(backHeaderText);

          // Back face art
          if (printArt && back.imageUrl) {
            try {
              await adapter.sendImage(back.imageUrl, widthPx, 0);
            } catch {
              // Image failed — continue
            }
          }

          // Back face body
          const backBody: string[] = [
            '\x1B\x61\x01',
            back.type + '\n',
            sep,
          ];

          if (back.oracleText) {
            backBody.push('\x1B\x61\x00');
            backBody.push(wrapText(back.oracleText, maxCols));
          }

          if (printFlavor && back.flavorText) {
            backBody.push('\n\x1B\x61\x01');
            backBody.push(`"${back.flavorText}"\n`);
          }

          if (back.power !== undefined && back.toughness !== undefined) {
            backBody.push('\n\x1B\x61\x02');
            backBody.push('\x1B\x45\x01');
            backBody.push(`${back.power}/${back.toughness}\n`);
            backBody.push('\x1B\x45\x00');
          }

          await adapter.sendText(backBody.join(''));
        }

        // --- PART 5: Footer ---
        await adapter.sendText('\n\n\n');
      }

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPrintOutcome({ type: 'success', message: 'Card receipt printed successfully.' });
      showToast({ type: 'success', title: 'Print Complete', message: 'Your card receipt was printed successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed.';
      setPrintOutcome({ type: 'failed', message });
      showToast({ type: 'error', title: 'Print Failed', message });
    } finally {
      setIsQueueing(false);
    }
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

  const hasStats = displayFace?.power !== undefined && displayFace?.toughness !== undefined;
  const scryfallUrl = card.scryfallUri || `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;
  const qrUrl = buildQrUrl(scryfallUrl);

  const isDevMode = settings.devMode;
  const printMode = settings.printer?.printMode ?? 'full';
  const isImageOnly = printMode === 'image_only';
  const showArt = settings.printer?.printArt ?? true;
  const showQR = settings.printer?.printQR ?? true;
  const showFlavor = settings.printer?.printFlavorText ?? true;

  const canPrint = printerConnection === 'connected' || isDevMode;

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
              <Text style={[styles.faceToggleText, activeFaceIndex === 0 && styles.faceToggleTextActive]}>
                Front
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFaceIndex(1)}
              style={[styles.faceToggleBtn, activeFaceIndex === 1 && styles.faceToggleBtnActive]}
            >
              <Text style={[styles.faceToggleText, activeFaceIndex === 1 && styles.faceToggleTextActive]}>
                Back
              </Text>
            </Pressable>
          </View>
        )}

        <Animated.View style={{ opacity: receiptOpacity, transform: [{ translateY: receiptSlide }] }}>
          <View ref={receiptRef} collapsable={false} style={styles.receipt}>
            {isImageOnly ? (
              <View style={styles.imageOnlyWrap}>
                <Image
                  source={{ uri: displayFace?.normalImageUrl || displayFace?.artCropUrl }}
                  style={styles.imageOnlyArt}
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

                {showArt && (
                  <View style={styles.receiptArtWrap}>
                    <Image
                      source={{ uri: displayFace?.artCropUrl || displayFace?.normalImageUrl }}
                      style={styles.receiptArt}
                      contentFit="cover"
                      transition={200}
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
                  <Text style={styles.receiptFlavor}>
                    {displayFace.flavorText}
                  </Text>
                ) : null}

                {hasStats && (
                  <View style={styles.receiptStatsRow}>
                    <Text style={styles.receiptStatValue}>{displayFace?.power} / {displayFace?.toughness}</Text>
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

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {isDevMode
              ? t.printPreview.devModeInfo
              : isImageOnly
                ? 'Prints the full card face image only.'
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
        <Animated.View style={[styles.successOverlay, { opacity: printBtnScale }]} pointerEvents="none">
          <View style={styles.successBubble}>
            <Check size={28} color="#fff" />
            <Text style={styles.successText}>{t.printPreview.savedToGallery}</Text>
          </View>
        </Animated.View>
      )}

      {printOutcome && (
        <View
          style={[
            styles.printOutcomeBanner,
            printOutcome.type === 'success' ? styles.printOutcomeSuccess :
            printOutcome.type === 'uncertain' ? styles.printOutcomeUncertain :
            printOutcome.type === 'queued' ? styles.printOutcomeQueued :
            styles.printOutcomeFailed,
          ]}
          testID="print-outcome-badge"
        >
          {printOutcome.type === 'success' && <Check size={16} color={Colors.success} />}
          {printOutcome.type === 'uncertain' && <AlertTriangle size={16} color={Colors.gold} />}
          {printOutcome.type === 'failed' && <AlertTriangle size={16} color={Colors.error} />}
          {printOutcome.type === 'queued' && <Loader size={16} color={Colors.textSecondary} />}
          <Text style={[
            styles.printOutcomeText,
            printOutcome.type === 'success' ? styles.printOutcomeTextSuccess :
            printOutcome.type === 'uncertain' ? styles.printOutcomeTextUncertain :
            printOutcome.type === 'queued' ? styles.printOutcomeTextQueued :
            styles.printOutcomeTextFailed,
          ]}>{printOutcome.message}</Text>
        </View>
      )}

      {!isDevMode && printerConnection === 'checking' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.checkingPrinterBanner}>
            <Loader size={14} color={Colors.textMuted} />
            <Text style={styles.checkingPrinterText}>Checking printer connection...</Text>
          </View>
        </View>
      )}

      {!isDevMode && printerConnection === 'disconnected' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.disconnectedBanner}>
            <WifiOff size={14} color={Colors.error} />
            <Text style={styles.disconnectedBannerText}>Printer disconnected — reconnect in Settings</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.footerBtn, styles.footerBtnOutline, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerBtnOutlineText}>{t.common.cancel}</Text>
          </Pressable>
          <Animated.View style={[styles.footerBtnWrap, { transform: [{ scale: printBtnScale }] }]}>
            <Pressable
              onPress={handlePrint}
              disabled={true}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnDisabled,
                pressed && styles.footerPressed,
              ]}
              testID="confirm-print"
            >
              <Printer size={17} color={Colors.textMuted} />
              <Text style={styles.footerBtnDisabledText}>Print Card</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {!isDevMode && printerConnection === 'no_printer' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.noPrinterBanner} testID="queue-status-badge">
            <Printer size={14} color={Colors.gold} />
            <Text style={styles.noPrinterBannerText}>No printer selected — tap to choose in Settings</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.footerBtn, styles.footerBtnOutline, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerBtnOutlineText}>{t.common.cancel}</Text>
          </Pressable>
          <Animated.View style={[styles.footerBtnWrap, { transform: [{ scale: printBtnScale }] }]}>
            <Pressable
              onPress={handlePrint}
              disabled={true}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnDisabled,
                pressed && styles.footerPressed,
              ]}
              testID="confirm-print"
            >
              <Printer size={17} color={Colors.textMuted} />
              <Text style={styles.footerBtnDisabledText}>Print Card</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {(isDevMode || printerConnection === 'connected') && (
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
              disabled={isSaving || isQueueing}
              style={({ pressed }) => [
                styles.footerBtn,
                isDevMode ? styles.footerBtnDev : styles.footerBtnPrimary,
                pressed && styles.footerPressed,
                (isSaving || isQueueing) && styles.footerBtnDisabled,
              ]}
              testID="confirm-print"
            >
              {isSaving || isQueueing ? (
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
      )}
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
    paddingHorizontal: 16,
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
  faceToggle: {
    flexDirection: 'row' as const,
    marginBottom: 12,
    gap: 8,
  },
  faceToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faceToggleBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  faceToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  faceToggleTextActive: {
    color: Colors.background,
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
  imageOnlyWrap: {
    alignItems: 'center' as const,
  },
  imageOnlyArt: {
    width: RECEIPT_WIDTH - 32,
    height: (RECEIPT_WIDTH - 32) * 1.4,
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
  receiptStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptQrWrap: {
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  receiptQr: {
    width: QR_PREVIEW_SIZE,
    height: QR_PREVIEW_SIZE,
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
  printOutcomeBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printOutcomeSuccess: {
    backgroundColor: 'rgba(34,204,102,0.08)',
    borderColor: Colors.success,
  },
  printOutcomeUncertain: {
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderColor: Colors.gold,
  },
  printOutcomeQueued: {
    backgroundColor: 'rgba(91,155,213,0.08)',
    borderColor: '#5B9BD5',
  },
  printOutcomeFailed: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderColor: Colors.error,
  },
  printOutcomeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  printOutcomeTextSuccess: {
    color: Colors.success,
  },
  printOutcomeTextUncertain: {
    color: Colors.gold,
  },
  printOutcomeTextQueued: {
    color: Colors.textSecondary,
  },
  printOutcomeTextFailed: {
    color: Colors.error,
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
  checkingPrinterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(91,155,213,0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  checkingPrinterText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  disconnectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  disconnectedBannerText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  noPrinterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(232,105,45,0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  noPrinterBannerText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '500' as const,
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
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerBtnDisabledText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
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
