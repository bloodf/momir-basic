import { useCallback, useEffect, useRef } from 'react';
import { Card, type PrinterPreferences } from '@/types';
import { ErrorCategory, logger } from '@/utils/logger';
import { createAdapter } from '@/services/printer/adapters/factory';
import { rasterizeCardArtForPrint } from '@/utils/printerImage';

interface UseAutoPrintOptions {
  card: Card | undefined;
  printerSettings: PrinterPreferences;
}

export function useAutoPrint({ card, printerSettings }: UseAutoPrintOptions) {
  const printedCardIds = useRef(new Set<string>());

  const autoPrintCardReceipt = useCallback(
    async (cardToPrint: Card) => {
      if (!printerSettings.autoPrint) return;
      if (!printerSettings.preferredPrinterId) return;

      const printMode = printerSettings.printMode ?? 'full';
      const paperWidth = (printerSettings.paperWidth ?? 58) as 58 | 80;
      const widthPx = paperWidth === 80 ? 576 : 384;
      const imageUrl = cardToPrint.normalImageUrl || cardToPrint.artCropUrl;
      const printArt = printerSettings.printArt ?? true;

      try {
        const adapter = createAdapter();
        await adapter.connectPrinter(printerSettings.preferredPrinterId);

        if (printMode === 'image_only') {
          if (imageUrl) {
            const rasterized = await rasterizeCardArtForPrint(imageUrl, widthPx, {
              algorithm: printerSettings.imageDither ?? 'floyd',
              brightness: printerSettings.imageBrightness ?? 1.0,
              contrast: printerSettings.imageContrast ?? 1.0,
              threshold: printerSettings.imageThreshold ?? 128,
              maxHeightPx: printerSettings.imageMaxHeightPx ?? 480,
            });
            await adapter.sendImage(rasterized.base64Png, rasterized.widthPx, rasterized.heightPx);
          }
        } else {
          const { EscPosRenderer } = await import('@/services/printer/render/escpos');
          const { CardReceiptDocument } = await import('@/services/printer/render/document');

          let artBitmapBase64: string | undefined;
          let artWidthPx: number | undefined;
          let artHeightPx: number | undefined;
          if (printArt && imageUrl) {
            try {
              const rasterized = await rasterizeCardArtForPrint(imageUrl, widthPx, {
                algorithm: printerSettings.imageDither ?? 'floyd',
                brightness: printerSettings.imageBrightness ?? 1.0,
                contrast: printerSettings.imageContrast ?? 1.0,
                threshold: printerSettings.imageThreshold ?? 128,
                maxHeightPx: printerSettings.imageMaxHeightPx ?? 480,
              });
              artBitmapBase64 = rasterized.base64Bitmap;
              artWidthPx = rasterized.widthPx;
              artHeightPx = rasterized.heightPx;
            } catch (error) {
              // Art rasterization failed — continue without art
              logger.debug(ErrorCategory.Printer, 'Art rasterization failed in autoPrint', error);
            }
          }

          const cardReceiptData = {
            name: cardToPrint.name,
            manaCost: cardToPrint.manaCost,
            type: cardToPrint.typeLine,
            oracleText: cardToPrint.oracleText,
            flavorText: cardToPrint.flavorText,
            power: cardToPrint.power,
            toughness: cardToPrint.toughness,
            imageUrl: imageUrl ?? '',
            setCode: cardToPrint.setCode,
            scryfallId: cardToPrint.id,
            artBitmapBase64,
            artWidthPx,
            artHeightPx,
          };

          const capabilities = {
            supportImage: true,
            supportQR: true,
            supportCut: false,
            supportText: true,
            paperWidth,
          };
          const renderer = new EscPosRenderer();
          const doc = new CardReceiptDocument(cardReceiptData, {
            printArt,
            printQR: printerSettings.printQR ?? true,
            cut: false,
            paperWidth,
            qrSize: printerSettings.qrSize ?? 8,
            qrErrorCorrection: printerSettings.qrErrorCorrection ?? 'L',
          });
          await doc.render(renderer, capabilities);

          const chunks = renderer.getChunks();
          let totalLen = 0;
          for (const chunk of chunks) totalLen += chunk.length;
          const allBytes = new Uint8Array(totalLen);
          let byteOffset = 0;
          for (const chunk of chunks) {
            allBytes.set(chunk, byteOffset);
            byteOffset += chunk.length;
          }
          await adapter.sendRaw(allBytes);
        }
      } catch (err) {
        logger.warn(
          ErrorCategory.Printer,
          'autoPrint failed',
          err instanceof Error ? err.message : err
        );
      }
    },
    [printerSettings]
  );

  useEffect(() => {
    if (!card?.id) return;
    if (printedCardIds.current.has(card.id)) return;
    printedCardIds.current.add(card.id);
    void autoPrintCardReceipt(card);
  }, [card?.id, autoPrintCardReceipt]);
}
