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
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { X, Printer, Download, Check, Zap, Wifi, FileText, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n } from '@/i18n';
import { PrintManaCost } from '@/components/PrintManaCost';
import { PrintOracleText } from '@/components/PrintOracleText';
import { showToast } from '@/components/Toast';
import { DitheredImage } from '@/components/DitheredImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECEIPT_WIDTH = SCREEN_WIDTH - 32;
const ART_WIDTH = RECEIPT_WIDTH - 32;
const ART_HEIGHT = ART_WIDTH * 0.85;

const PRINT_STEPS = [
  { key: 'prepare', icon: 'file', duration: 1000 },
  { key: 'dither', icon: 'zap', duration: 1400 },
  { key: 'connect', icon: 'wifi', duration: 800 },
  { key: 'send', icon: 'printer', duration: 2200 },
  { key: 'feed', icon: 'feed', duration: 800 },
  { key: 'done', icon: 'check', duration: 600 },
] as const;

const TOTAL_PRINT_DURATION = PRINT_STEPS.reduce((sum, s) => sum + s.duration, 0);

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
  const successScale = useRef(new Animated.Value(0.5)).current;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const printerBounce = useRef(new Animated.Value(0)).current;
  const printingProgress = useRef(new Animated.Value(0)).current;
  const receiptFeedHeight = useRef(new Animated.Value(0)).current;
  const scanlinePos = useRef(new Animated.Value(0)).current;
  const stepTextOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const paperWiggle = useRef(new Animated.Value(0)).current;
  const completedScale = useRef(new Animated.Value(0)).current;
  const completedOpacity = useRef(new Animated.Value(0)).current;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [isPrintingAnim, setIsPrintingAnim] = useState<boolean>(false);
  const [printStep, setPrintStep] = useState<number>(0);
  const [printComplete, setPrintComplete] = useState<boolean>(false);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  useEffect(() => {
    return () => {
      if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
      stepTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const showSuccessFlash = useCallback(() => {
    setSaved(true);
    successScale.setValue(0.5);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(successScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]).start(() => setSaved(false));
    }, 2000);
  }, [successOpacity, successScale]);

  const handleDevPrint = useCallback(async () => {
    if (!card || !receiptRef.current) return;
    if (Platform.OS as string === 'web') {
      showToast({ type: 'info', title: t.printPreview.notAvailable, message: t.printPreview.devPrintNotSupported });
      return;
    }

    setIsSaving(true);
    console.log('[PrintPreview] Dev mode: capturing receipt...');

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'error', title: t.toast.permissionDenied, message: t.printPreview.galleryAccessRequired });
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
      showToast({ type: 'error', title: t.toast.saveFailed, message: t.printPreview.saveFailedMsg });
    } finally {
      setIsSaving(false);
    }
  }, [card, showSuccessFlash, t]);

  const getStepLabel = useCallback((step: number): string => {
    switch (step) {
      case 0: return t.printPreview.preparingPrint;
      case 1: return t.printPreview.oneBitMode;
      case 2: return t.printPreview.connectingPrinter ?? t.printPreview.sendingData;
      case 3: return t.printPreview.sendingData;
      case 4: return t.printPreview.feedingPaper;
      case 5: return t.printPreview.printComplete;
      default: return t.printPreview.printing;
    }
  }, [t]);

  const getStepIcon = useCallback((step: number) => {
    switch (step) {
      case 0: return <FileText size={16} color={Colors.gold} />;
      case 1: return <Zap size={16} color={Colors.gold} />;
      case 2: return <Wifi size={16} color={Colors.gold} />;
      case 3: return <Printer size={16} color={Colors.gold} />;
      case 4: return <Printer size={16} color={Colors.gold} />;
      case 5: return <CheckCircle size={16} color="#4CAF50" />;
      default: return <Printer size={16} color={Colors.gold} />;
    }
  }, []);

  const startPrintingAnimation = useCallback(() => {
    setIsPrintingAnim(true);
    setPrintStep(0);
    setPrintComplete(false);
    printingProgress.setValue(0);
    receiptFeedHeight.setValue(0);
    scanlinePos.setValue(0);
    overlayOpacity.setValue(0);
    printerBounce.setValue(0);
    completedScale.setValue(0);
    completedOpacity.setValue(0);

    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(printerBounce, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();

    if (Platform.OS !== 'web') {
      let hapticCount = 0;
      hapticIntervalRef.current = setInterval(() => {
        hapticCount++;
        if (hapticCount % 3 === 0) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 280);
    }

    const wiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(paperWiggle, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(paperWiggle, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(paperWiggle, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(400),
      ]),
    );

    let totalDuration = 0;
    stepTimersRef.current = [];

    PRINT_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setPrintStep(index);
        Animated.sequence([
          Animated.timing(stepTextOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(stepTextOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        if (index === 3) {
          wiggleLoop.start();
        }
      }, totalDuration);
      stepTimersRef.current.push(timer);
      totalDuration += step.duration;
    });

    Animated.timing(printingProgress, {
      toValue: 1,
      duration: TOTAL_PRINT_DURATION - 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    const scanlineLoop = Animated.loop(
      Animated.timing(scanlinePos, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );

    const scanlineTimer = setTimeout(() => {
      scanlineLoop.start();
    }, PRINT_STEPS[0].duration + PRINT_STEPS[1].duration);
    stepTimersRef.current.push(scanlineTimer);

    const feedTimer = setTimeout(() => {
      Animated.timing(receiptFeedHeight, {
        toValue: 1,
        duration: PRINT_STEPS[3].duration + PRINT_STEPS[4].duration,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    }, PRINT_STEPS[0].duration + PRINT_STEPS[1].duration + PRINT_STEPS[2].duration);
    stepTimersRef.current.push(feedTimer);

    const completeTimer = setTimeout(() => {
      pulseLoop.stop();
      wiggleLoop.stop();
      scanlineLoop.stop();
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      pulseAnim.setValue(1);
      paperWiggle.setValue(0);

      setPrintComplete(true);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Animated.parallel([
        Animated.spring(completedScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
        Animated.timing(completedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setIsPrintingAnim(false);
          setPrintStep(0);
          setPrintComplete(false);
          showSuccessFlash();
        });
      }, 1800);
    }, TOTAL_PRINT_DURATION);
    stepTimersRef.current.push(completeTimer);
  }, [
    printingProgress, receiptFeedHeight, scanlinePos, overlayOpacity,
    printerBounce, pulseAnim, paperWiggle, stepTextOpacity,
    completedScale, completedOpacity, showSuccessFlash,
  ]);

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
      showToast({ type: 'warning', title: t.toast.noPrinter, message: t.toast.noPrinterMessage });
      return;
    }

    startPrintingAnimation();
  }, [card, settings, printBtnScale, handleDevPrint, t, startPrintingAnimation]);

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

  const printerEnterY = printerBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });
  const printerEnterOpacity = printerBounce.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });
  const feedHeightInterp = receiptFeedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const scanlinePosInterp = scanlinePos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });
  const wiggleTranslate = paperWiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-0.5, 0, 0.5],
  });

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

        {!isDevMode && (
          <View style={styles.ditherBadge}>
            <Zap size={12} color={Colors.gold} />
            <Text style={styles.ditherBadgeText}>{t.printPreview.ditheredPreview}</Text>
          </View>
        )}

        <Animated.View style={{ opacity: receiptOpacity, transform: [{ translateY: receiptSlide }] }}>
          <View ref={receiptRef} collapsable={false} style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptCardName} numberOfLines={2}>
                {card.printedName ?? card.name}
              </Text>
              <PrintManaCost manaCost={card.manaCost} size={16} gap={2} />
            </View>

            <View style={styles.receiptArtWrap}>
              {isDevMode ? (
                <Image
                  source={{ uri: card.artCropUrl || card.normalImageUrl }}
                  style={styles.receiptArt}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <DitheredImage
                  uri={card.artCropUrl || card.normalImageUrl}
                  width={ART_WIDTH}
                  height={ART_HEIGHT}
                />
              )}
            </View>

            <Text style={styles.receiptTypeLine}>
              {(card.printedTypeLine ?? card.typeLine).replace('—', '\u2014')}
            </Text>

            {(card.printedText ?? card.oracleText) ? (
              <View style={styles.receiptOracleWrap}>
                <PrintOracleText text={card.printedText ?? card.oracleText} fontSize={12} color="#000000" />
              </View>
            ) : null}

            {card.flavorText ? (
              <Text style={styles.receiptFlavor}>
                {card.flavorText}
              </Text>
            ) : null}

            {hasStats && (
              <View style={styles.receiptStatsRow}>
                <Text style={styles.receiptStatValue}>{card.power} / {card.toughness}</Text>
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

      {isPrintingAnim && (
        <Animated.View style={[styles.printingOverlay, { opacity: overlayOpacity }]}>
          <View style={styles.printingModal}>
            <Animated.View style={[
              styles.printerIconSection,
              {
                transform: [
                  { translateY: printerEnterY },
                  { scale: pulseAnim },
                ],
                opacity: printerEnterOpacity,
              },
            ]}>
              <View style={styles.printerBody}>
                <View style={styles.printerTop}>
                  <View style={styles.printerSlot} />
                </View>
                <View style={styles.printerFace}>
                  <Printer size={28} color={Colors.gold} />
                </View>

                <Animated.View style={[
                  styles.paperFeedWrap,
                  { transform: [{ translateX: wiggleTranslate }] },
                ]}>
                  <Animated.View style={[styles.paperFeed, { height: feedHeightInterp }]}>
                    <View style={styles.paperContent}>
                      <View style={styles.paperLine} />
                      <View style={[styles.paperLine, { width: '75%' }]} />
                      <View style={styles.paperImageBlock}>
                        <Animated.View style={[
                          styles.paperScanline,
                          { transform: [{ translateY: scanlinePosInterp }] },
                        ]} />
                      </View>
                      <View style={[styles.paperLine, { width: '85%' }]} />
                      <View style={[styles.paperLine, { width: '60%' }]} />
                      <View style={[styles.paperLine, { width: '70%' }]} />
                    </View>
                  </Animated.View>
                </Animated.View>
              </View>
            </Animated.View>

            <Text style={styles.printingLabel}>
              {printComplete ? t.printPreview.printComplete : `${t.printPreview.printing}...`}
            </Text>
            <Text style={styles.printingCardName} numberOfLines={1}>
              {card?.printedName ?? card?.name}
            </Text>

            <Animated.View style={[styles.stepRow, { opacity: stepTextOpacity }]}>
              {getStepIcon(printStep)}
              <Text style={[
                styles.printingStepLabel,
                printComplete && styles.printingStepLabelDone,
              ]}>
                {getStepLabel(printStep)}
              </Text>
            </Animated.View>

            <View style={styles.printingBarTrack}>
              <Animated.View
                style={[
                  styles.printingBarFill,
                  {
                    width: printingProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                  printComplete && styles.printingBarFillDone,
                ]}
              />
            </View>

            <View style={styles.stepsTimeline}>
              {PRINT_STEPS.map((step, i) => (
                <View key={step.key} style={styles.stepTimelineItem}>
                  <View style={[
                    styles.stepDot,
                    i < printStep && styles.stepDotCompleted,
                    i === printStep && styles.stepDotActive,
                    printComplete && i <= printStep && styles.stepDotCompleted,
                  ]} />
                  {i < PRINT_STEPS.length - 1 && (
                    <View style={[
                      styles.stepConnector,
                      i < printStep && styles.stepConnectorActive,
                    ]} />
                  )}
                </View>
              ))}
            </View>

            {printComplete && (
              <Animated.View style={[
                styles.completedBadge,
                {
                  transform: [{ scale: completedScale }],
                  opacity: completedOpacity,
                },
              ]}>
                <Check size={18} color="#fff" />
                <Text style={styles.completedText}>{t.printPreview.printComplete}</Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {saved && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]} pointerEvents="none">
          <Animated.View style={[styles.successBubble, { transform: [{ scale: successScale }] }]}>
            <Check size={28} color="#fff" />
            <Text style={styles.successText}>{t.printPreview.savedToGallery}</Text>
          </Animated.View>
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
            disabled={isSaving || isPrintingAnim}
            style={({ pressed }) => [
              styles.footerBtn,
              isDevMode ? styles.footerBtnDev : styles.footerBtnPrimary,
              pressed && styles.footerPressed,
              (isSaving || isPrintingAnim) && styles.footerBtnDisabled,
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  ditherBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,105,45,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  ditherBadgeText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '600' as const,
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
  printingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 20,
  },
  printingModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: 'center' as const,
    width: SCREEN_WIDTH - 56,
    gap: 12,
  },
  printerIconSection: {
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  printerBody: {
    alignItems: 'center' as const,
    width: 120,
  },
  printerTop: {
    width: 100,
    height: 14,
    backgroundColor: '#3a3a3a',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  printerSlot: {
    width: 50,
    height: 3,
    backgroundColor: '#2a2a2a',
    borderRadius: 1.5,
  },
  printerFace: {
    width: 100,
    height: 52,
    backgroundColor: '#333',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#444',
    borderTopWidth: 0,
  },
  paperFeedWrap: {
    width: 70,
    alignItems: 'center' as const,
    overflow: 'visible' as const,
    marginTop: -2,
  },
  paperFeed: {
    width: 66,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    overflow: 'hidden' as const,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  paperContent: {
    padding: 6,
    gap: 3,
    alignItems: 'flex-start' as const,
  },
  paperLine: {
    height: 2.5,
    width: '100%',
    backgroundColor: '#CCCCCC',
    borderRadius: 1,
  },
  paperImageBlock: {
    height: 40,
    width: '100%',
    backgroundColor: '#D8D8D8',
    borderRadius: 1,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  paperScanline: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(232,105,45,0.4)',
  },
  printingLabel: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  printingCardName: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  stepRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  printingStepLabel: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  printingStepLabelDone: {
    color: '#4CAF50',
  },
  printingBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.inputBackground,
    overflow: 'hidden' as const,
    marginTop: 2,
  },
  printingBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  printingBarFillDone: {
    backgroundColor: '#4CAF50',
  },
  stepsTimeline: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center' as const,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  stepTimelineItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.gold,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(232,105,45,0.3)',
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepConnector: {
    width: 16,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  stepConnectorActive: {
    backgroundColor: '#4CAF50',
  },
  completedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  completedText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  successBubble: {
    backgroundColor: 'rgba(76, 175, 80, 0.94)',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
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
