import React from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Check, Printer, Download, AlertTriangle, WifiOff, Loader } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type {
  PrintOutcomeBanner,
  PrinterConnectionState,
} from '@/features/print-preview/usePrintPreview';
import { styles } from './styles';

interface PrintFooterProps {
  isDevMode: boolean;
  printerConnection: PrinterConnectionState;
  isSaving: boolean;
  isQueueing: boolean;
  isPrintActionDisabled: boolean;
  saved: boolean;
  printBtnScale: Animated.Value;
  printOutcome: PrintOutcomeBanner | null;
  onPrint: () => void;
  onCancel: () => void;
  insetsBottom: number;
  cancelLabel: string;
  devPrintLabel: string;
  printLabel: string;
  savedToGalleryLabel: string;
}

export function PrintFooter({
  isDevMode,
  printerConnection,
  isSaving,
  isQueueing,
  isPrintActionDisabled,
  saved,
  printBtnScale,
  printOutcome,
  onPrint,
  onCancel,
  insetsBottom,
  cancelLabel,
  devPrintLabel,
  printLabel,
  savedToGalleryLabel,
}: PrintFooterProps) {
  const footerBanner = !isDevMode ? (
    printerConnection === 'checking' ? (
      <View style={styles.checkingPrinterBanner}>
        <Loader size={14} color={Colors.textMuted} />
        <Text style={styles.checkingPrinterText}>Checking printer connection...</Text>
      </View>
    ) : printerConnection === 'disconnected' ? (
      <View style={styles.disconnectedBanner}>
        <WifiOff size={14} color={Colors.error} />
        <Text style={styles.disconnectedBannerText}>
          Printer disconnected — reconnect in Settings
        </Text>
      </View>
    ) : printerConnection === 'no_printer' ? (
      <View style={styles.noPrinterBanner} testID="queue-status-badge">
        <Printer size={14} color={Colors.gold} />
        <Text style={styles.noPrinterBannerText}>
          No printer selected — tap to choose in Settings
        </Text>
      </View>
    ) : null
  ) : null;

  const showFooter =
    isDevMode ||
    printerConnection === 'connected' ||
    printerConnection === 'disconnected' ||
    printerConnection === 'no_printer' ||
    printerConnection === 'checking';

  return (
    <>
      {saved && (
        <Animated.View
          style={[styles.successOverlay, { opacity: printBtnScale }]}
          pointerEvents="none"
        >
          <View style={styles.successBubble}>
            <Check size={28} color="#fff" />
            <Text style={styles.successText}>{savedToGalleryLabel}</Text>
          </View>
        </Animated.View>
      )}

      {printOutcome && (
        <View
          style={[
            styles.printOutcomeBanner,
            printOutcome.type === 'success'
              ? styles.printOutcomeSuccess
              : printOutcome.type === 'uncertain'
                ? styles.printOutcomeUncertain
                : printOutcome.type === 'queued'
                  ? styles.printOutcomeQueued
                  : styles.printOutcomeFailed,
          ]}
          testID="print-outcome-badge"
        >
          {printOutcome.type === 'success' && <Check size={16} color={Colors.success} />}
          {printOutcome.type === 'uncertain' && <AlertTriangle size={16} color={Colors.gold} />}
          {printOutcome.type === 'failed' && <AlertTriangle size={16} color={Colors.error} />}
          {printOutcome.type === 'queued' && <Loader size={16} color={Colors.textSecondary} />}
          <Text
            style={[
              styles.printOutcomeText,
              printOutcome.type === 'success'
                ? styles.printOutcomeTextSuccess
                : printOutcome.type === 'uncertain'
                  ? styles.printOutcomeTextUncertain
                  : printOutcome.type === 'queued'
                    ? styles.printOutcomeTextQueued
                    : styles.printOutcomeTextFailed,
            ]}
          >
            {printOutcome.message}
          </Text>
        </View>
      )}

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insetsBottom, 16) }]}>
          {footerBanner}
          <View style={styles.footerActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnOutline,
                pressed && styles.footerPressed,
              ]}
            >
              <Text style={styles.footerBtnOutlineText}>{cancelLabel}</Text>
            </Pressable>
            <Animated.View
              style={[styles.footerBtnWrap, { transform: [{ scale: printBtnScale }] }]}
            >
              <Pressable
                onPress={onPrint}
                disabled={isPrintActionDisabled}
                style={({ pressed }) => [
                  styles.footerBtn,
                  isPrintActionDisabled
                    ? styles.footerBtnDisabled
                    : isDevMode
                      ? styles.footerBtnDev
                      : styles.footerBtnPrimary,
                  pressed && styles.footerPressed,
                ]}
                testID="confirm-print"
              >
                {isSaving || isQueueing ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    {isDevMode ? (
                      <Download
                        size={17}
                        color={isPrintActionDisabled ? Colors.textMuted : Colors.background}
                      />
                    ) : (
                      <Printer
                        size={17}
                        color={isPrintActionDisabled ? Colors.textMuted : Colors.background}
                      />
                    )}
                    <Text
                      style={
                        isPrintActionDisabled
                          ? styles.footerBtnDisabledText
                          : styles.footerBtnPrimaryText
                      }
                    >
                      {isDevMode ? devPrintLabel : printLabel}
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      )}
    </>
  );
}
