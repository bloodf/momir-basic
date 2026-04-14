import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { showToast } from '@/components/Toast';
import { ErrorCategory, logger } from '@/utils/logger';
import { useI18n } from '@/stores/i18nStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { createAdapter } from '@/services/printer/adapters/factory';
import { rasterizeCardArtForPrint } from '@/utils/printerImage';
import type { Card } from '@/types';

export type PrinterConnectionState = 'checking' | 'connected' | 'disconnected' | 'no_printer';

export type PrintOutcomeBanner = {
  type: 'queued' | 'success' | 'uncertain' | 'failed';
  message: string;
};

interface UsePrintPreviewReturn {
  printerState: PrinterConnectionState;
  outcomeBanner: PrintOutcomeBanner | null;
  isPrinting: boolean;
  sendPrintJob: () => Promise<void>;
  dismissBanner: () => void;
}

/**
 * Hook encapsulating print preview state: printer connection verification,
 * print job execution, and outcome banner management.
 */
export function usePrintPreview(card: Card | null, isDoubleFaced: boolean): UsePrintPreviewReturn {
  const { settings } = useSettingsStore();
  const { t } = useI18n();

  const [printerState, setPrinterState] = useState<PrinterConnectionState>('checking');
  const [outcomeBanner, setOutcomeBanner] = useState<PrintOutcomeBanner | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  /**
   * checkPrinterConnection — verifies the preferred printer is physically connected.
   * Uses adapter.isConnected() to determine real state.
   */
  const checkPrinterConnection = useCallback(async () => {
    const prefId = settings.printer?.preferredPrinterId;
    if (!prefId) {
      setPrinterState('no_printer');
      return;
    }

    try {
      const adapter = createAdapter();
      const isConnected = await adapter.isConnected(prefId);
      setPrinterState(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      logger.debug(ErrorCategory.Printer, 'Printer connection verification failed', error);
      setPrinterState('disconnected');
    }
  }, [settings.printer?.preferredPrinterId]);

  useEffect(() => {
    if (!settings.devMode) {
      void checkPrinterConnection();
    }
  }, [settings.devMode, checkPrinterConnection]);

  const dismissBanner = useCallback(() => {
    setOutcomeBanner(null);
  }, []);

  /**
   * sendPrintJob — enqueues a card receipt print job and processes the queue.
   *
   * After processing, inspects the job state to determine the actual outcome:
   * - printed_confirmed: printer confirmed receipt
   * - sent_unknown: uncertain delivery (mid-write disconnect)
   * - failed_terminal | failed_retryable: printer/hardware error
   */
  const sendPrintJob = useCallback(async () => {
    if (!card) return;

    setOutcomeBanner(null);

    const preferredPrinterId = settings.printer?.preferredPrinterId;

    if (!preferredPrinterId) {
      setOutcomeBanner({ type: 'failed', message: t.printer.noPrinterSelected });
      showToast({ type: 'warning', title: 'No Printer', message: 'Please select a printer in Settings first.' });
      return;
    }

    try {
      const adapter = createAdapter();
      const isConnected = await adapter.isConnected(preferredPrinterId);
      if (!isConnected) {
        setOutcomeBanner({ type: 'failed', message: t.toast.printerReconnectMessage });
        showToast({ type: 'error', title: t.toast.printerReconnectTitle, message: t.toast.printerReconnectMessage });
        return;
      }
    } catch (error) {
      logger.warn(ErrorCategory.Printer, 'Print verification failed', error);
      setOutcomeBanner({ type: 'failed', message: t.printer.verificationFailed });
      return;
    }

    const scryfallUrl = card.scryfallUri || `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;

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
      setIsPrinting(true);

      const adapter = createAdapter();
      await adapter.connectPrinter(preferredPrinterId);

      const paperWidth = (settings.printer?.paperWidth ?? 58) as 58 | 80;
      const printMode = settings.printer?.printMode ?? 'full';
      const widthPx = paperWidth === 80 ? 576 : 384;

      if (printMode === 'image_only') {
        // IMAGE-ONLY MODE: Print rasterized card image(s)
        const frontCardUrl = card.normalImageUrl || card.artCropUrl;
        if (frontCardUrl) {
          const rasterized = await rasterizeCardArtForPrint(frontCardUrl, widthPx, {
            algorithm: settings.printer?.imageDither ?? 'floyd',
            brightness: settings.printer?.imageBrightness ?? 1.0,
            contrast: settings.printer?.imageContrast ?? 1.0,
            threshold: settings.printer?.imageThreshold ?? 128,
            maxHeightPx: settings.printer?.imageMaxHeightPx ?? 480,
          });
          await adapter.sendImage(rasterized.base64Png, rasterized.widthPx, rasterized.heightPx);
        } else {
          throw new Error('No card image available to print.');
        }
        // Print back face if double-faced
        if (isDoubleFaced && card.faces?.[1]) {
          const backFace = card.faces[1];
          const backImageUrl = backFace.image_uris?.normal ?? backFace.image_uris?.art_crop;
          if (backImageUrl) {
            const rasterizedBack = await rasterizeCardArtForPrint(backImageUrl, widthPx, {
              algorithm: settings.printer?.imageDither ?? 'floyd',
              brightness: settings.printer?.imageBrightness ?? 1.0,
              contrast: settings.printer?.imageContrast ?? 1.0,
              threshold: settings.printer?.imageThreshold ?? 128,
              maxHeightPx: settings.printer?.imageMaxHeightPx ?? 480,
            });
            await adapter.sendImage(rasterizedBack.base64Png, rasterizedBack.widthPx, rasterizedBack.heightPx);
          }
        }
      } else {
        // RECEIPT MODE: ESC/POS document via EscPosRenderer + sendRaw
        const { EscPosRenderer } = await import('@/services/printer/render/escpos');
        const { CardReceiptDocument } = await import('@/services/printer/render/document');

        const printArt = settings.printer?.printArt ?? true;
        const artUrl = card.artCropUrl || card.normalImageUrl;

        // Pre-rasterize front art if needed
        let artBitmapBase64: string | undefined;
        let artWidthPx: number | undefined;
        let artHeightPx: number | undefined;
        if (printArt && artUrl) {
          try {
            const rasterized = await rasterizeCardArtForPrint(artUrl, widthPx, {
              algorithm: settings.printer?.imageDither ?? 'floyd',
              brightness: settings.printer?.imageBrightness ?? 1.0,
              contrast: settings.printer?.imageContrast ?? 1.0,
              threshold: settings.printer?.imageThreshold ?? 128,
              maxHeightPx: settings.printer?.imageMaxHeightPx ?? 480,
            });
            artBitmapBase64 = rasterized.base64Bitmap;
            artWidthPx = rasterized.widthPx;
            artHeightPx = rasterized.heightPx;
          } catch (error) {
            logger.debug(ErrorCategory.Printer, 'Art rasterization failed', error);
          }
        }

        // Pre-rasterize back face art if needed
        let backArtBitmapBase64: string | undefined;
        let backArtWidthPx: number | undefined;
        let backArtHeightPx: number | undefined;
        if (printArt && isDoubleFaced && cardReceiptData.backFaceData?.imageUrl) {
          try {
            const rasterizedBack = await rasterizeCardArtForPrint(
              cardReceiptData.backFaceData.imageUrl,
              widthPx,
              {
                algorithm: settings.printer?.imageDither ?? 'floyd',
                brightness: settings.printer?.imageBrightness ?? 1.0,
                contrast: settings.printer?.imageContrast ?? 1.0,
                threshold: settings.printer?.imageThreshold ?? 128,
                maxHeightPx: settings.printer?.imageMaxHeightPx ?? 480,
              }
            );
            backArtBitmapBase64 = rasterizedBack.base64Bitmap;
            backArtWidthPx = rasterizedBack.widthPx;
            backArtHeightPx = rasterizedBack.heightPx;
          } catch (error) {
            logger.debug(ErrorCategory.Printer, 'Back art rasterization failed', error);
          }
        }

        const enrichedCardData = {
          ...cardReceiptData,
          artBitmapBase64,
          artWidthPx,
          artHeightPx,
          backFaceData: cardReceiptData.backFaceData
            ? {
                ...cardReceiptData.backFaceData,
                artBitmapBase64: backArtBitmapBase64,
                artWidthPx: backArtWidthPx,
                artHeightPx: backArtHeightPx,
              }
            : undefined,
        };

        const capabilities = {
          supportImage: true,
          supportQR: true,
          supportCut: false,
          supportText: true,
          paperWidth,
        };
        const renderer = new EscPosRenderer();
        const doc = new CardReceiptDocument(enrichedCardData, {
          printArt,
          printQR: settings.printer?.printQR ?? true,
          cut: false,
          paperWidth,
          qrSize: settings.printer?.qrSize ?? 8,
          qrErrorCorrection: settings.printer?.qrErrorCorrection ?? 'L',
        });
        await doc.render(renderer, capabilities);

        const chunks = renderer.getChunks();
        let totalLen = 0;
        for (const chunk of chunks) totalLen += chunk.length;
        const allBytes = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
          allBytes.set(chunk, offset);
          offset += chunk.length;
        }
        await adapter.sendRaw(allBytes);
      }

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setOutcomeBanner({ type: 'success', message: 'Card receipt printed successfully.' });
      showToast({ type: 'success', title: 'Print Complete', message: 'Your card receipt was printed successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed.';
      setOutcomeBanner({ type: 'failed', message });
      showToast({ type: 'error', title: 'Print Failed', message });
    } finally {
      setIsPrinting(false);
    }
  }, [card, settings, t, isDoubleFaced]);

  return {
    printerState,
    outcomeBanner,
    isPrinting,
    sendPrintJob,
    dismissBanner,
  };
}
