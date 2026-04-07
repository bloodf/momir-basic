import type { PrinterCapabilities, PrinterTransport, QrErrorCorrection } from '../../../types';
import {
  EscPosRenderer,
  PrintDocument,
  parseManaCost,
  buildScryfallUrl,
  MAX_COLUMN_58MM,
  MAX_COLUMN_80MM,
} from './escpos';

export interface CardReceiptOptions {
  printArt: boolean;
  printQR: boolean;
  cut: boolean;
  paperWidth: 58 | 80;
  qrSize?: number;                    // 1..16, default 8
  qrErrorCorrection?: QrErrorCorrection; // default 'L'
}

export interface CardReceiptCardData {
  name: string;
  manaCost: string;
  type: string;
  oracleText: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  imageUrl: string;
  setCode: string;
  scryfallId: string;
  /** Pre-rasterized 1-bit ESC/POS bitmap for art (base64). If present, used instead of imageUrl. */
  artBitmapBase64?: string;
  artWidthPx?: number;
  artHeightPx?: number;
  backFaceData?: {
    name: string;
    manaCost?: string;
    type: string;
    oracleText?: string;
    flavorText?: string;
    power?: string;
    toughness?: string;
    imageUrl?: string;
    /** Pre-rasterized 1-bit ESC/POS bitmap for back face art (base64). */
    artBitmapBase64?: string;
    artWidthPx?: number;
    artHeightPx?: number;
  };
}

export class CardReceiptDocument implements PrintDocument {
  private card: CardReceiptCardData;
  private options: CardReceiptOptions;

  constructor(card: CardReceiptCardData, options?: Partial<CardReceiptOptions>) {
    this.card = card;
    this.options = {
      printArt: options?.printArt ?? true,
      printQR: options?.printQR ?? true,
      cut: options?.cut ?? false,
      paperWidth: options?.paperWidth ?? 58,
      qrSize: options?.qrSize ?? 8,
      qrErrorCorrection: options?.qrErrorCorrection ?? 'L',
    };
  }

  async render(renderer: EscPosRenderer, capabilities: PrinterCapabilities): Promise<void> {
    renderer.reset();
    renderer.setCapabilities(capabilities);

    const maxWidth = this.options.paperWidth === 80
      ? MAX_COLUMN_80MM
      : MAX_COLUMN_58MM;

    await this.renderCardFace(renderer, capabilities, maxWidth, this.card, false);

    if (this.card.backFaceData) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.setBold(true);
      renderer.addText('BACK FACE');
      renderer.feedLine();
      renderer.setBold(false);
      renderer.feedLine();
      await this.renderCardFace(renderer, capabilities, maxWidth, this.card.backFaceData, true);
    }

    renderer.feedLine();
    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    renderer.addText(`Set: ${this.card.setCode}`);
    renderer.feedLine();

    if (this.options.cut && capabilities.supportCut) {
      renderer.cutPaper(true);
    }
  }

  private async renderCardFace(
    renderer: EscPosRenderer,
    capabilities: PrinterCapabilities,
    maxWidth: number,
    faceData: CardReceiptCardData | CardReceiptCardData['backFaceData'],
    isBackFace: boolean
  ): Promise<void> {
    const face = faceData as CardReceiptCardData;
    const backFace = isBackFace ? faceData as CardReceiptCardData['backFaceData'] : undefined;

    renderer.setAlignment('center');
    renderer.setBold(true);
    renderer.addText(backFace?.name ?? face.name);
    renderer.feedLine();

    const manaCost = backFace?.manaCost ?? face.manaCost;
    const manaTokens = parseManaCost(manaCost);
    if (manaTokens) {
      renderer.setBold(false);
      renderer.addText(`[${manaTokens}]`);
      renderer.feedLine();
    }

    renderer.setBold(false);
    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    const typeLine = backFace?.type ?? face.type;
    renderer.addText(typeLine);
    renderer.feedLine();

    renderer.printSeparator('-', maxWidth);

    const oracleText = backFace?.oracleText ?? face.oracleText;
    if (oracleText) {
      renderer.setAlignment('left');
      renderer.printText(oracleText, maxWidth);
    }

    const flavorText = backFace?.flavorText ?? face.flavorText;
    if (flavorText) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.addText(`"${flavorText}"`);
      renderer.feedLine();
    }

    const power = backFace?.power ?? face.power;
    const toughness = backFace?.toughness ?? face.toughness;
    if (power !== undefined && toughness !== undefined) {
      renderer.feedLine();
      renderer.setAlignment('right');
      renderer.setBold(true);
      renderer.addText(`${power}/${toughness}`);
      renderer.feedLine();
      renderer.setBold(false);
    }

    const imageUrl = isBackFace ? (backFace?.imageUrl ?? face.imageUrl) : face.imageUrl;
    const artBitmap = isBackFace ? (backFace?.artBitmapBase64 ?? face.artBitmapBase64) : face.artBitmapBase64;
    const artW = isBackFace ? (backFace?.artWidthPx ?? face.artWidthPx) : face.artWidthPx;
    const artH = isBackFace ? (backFace?.artHeightPx ?? face.artHeightPx) : face.artHeightPx;
    if (this.options.printArt && capabilities.supportImage && artBitmap && artW && artH) {
      renderer.feedLine();
      renderer.printImage(artBitmap, artW, artH);
    } else if (this.options.printArt && capabilities.supportImage && imageUrl) {
      renderer.feedLine();
      renderer.printImage(imageUrl, 200, 170);
    } else if (this.options.printArt && !capabilities.supportImage) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.addText('[Art: unavailable]');
      renderer.feedLine();
    }

    if (!isBackFace && this.options.printQR && capabilities.supportQR) {
      renderer.feedLine();
      renderer.setAlignment('center');
      const scryfallUrl = buildScryfallUrl(
        undefined,
        this.card.setCode,
        this.card.scryfallId
      );
      renderer.printQRCode(
        scryfallUrl,
        this.options.qrSize ?? 8,
        this.options.qrErrorCorrection ?? 'L'
      );
    }
  }

  getCard(): CardReceiptCardData {
    return this.card;
  }

  getOptions(): CardReceiptOptions {
    return { ...this.options };
  }
}

export interface DiagnosticsDocumentOptions {
  paperWidth: 58 | 80;
}

export class DiagnosticsDocument implements PrintDocument {
  private appName: string;
  private platform: string;
  private transport: PrinterTransport;
  private paperWidth: 58 | 80;
  private timestamp: string;

  constructor(
    appName: string,
    platform: string,
    transport: PrinterTransport,
    paperWidth: 58 | 80,
    timestamp: string
  ) {
    this.appName = appName;
    this.platform = platform;
    this.transport = transport;
    this.paperWidth = paperWidth;
    this.timestamp = timestamp;
  }

  async render(renderer: EscPosRenderer, capabilities: PrinterCapabilities): Promise<void> {
    renderer.reset();
    renderer.setCapabilities(capabilities);

    const maxWidth = this.paperWidth === 80
      ? MAX_COLUMN_80MM
      : MAX_COLUMN_58MM;

    renderer.setAlignment('center');
    renderer.setBold(true);
    renderer.addText('PRINTER DIAGNOSTICS');
    renderer.feedLine();
    renderer.setBold(false);

    renderer.printSeparator('=', maxWidth);

    renderer.setAlignment('left');
    renderer.addText(`App: ${this.appName}`);
    renderer.feedLine();

    renderer.addText(`Platform: ${this.platform}`);
    renderer.feedLine();

    renderer.addText(`Transport: ${this.transport}`);
    renderer.feedLine();

    renderer.addText(`Paper: ${this.paperWidth}mm`);
    renderer.feedLine();

    renderer.printSeparator('-', maxWidth);

    renderer.addText(`Image: ${capabilities.supportImage ? 'YES' : 'NO'}`);
    renderer.feedLine();

    renderer.addText(`QR Code: ${capabilities.supportQR ? 'YES' : 'NO'}`);
    renderer.feedLine();

    renderer.addText(`Cut Paper: ${capabilities.supportCut ? 'YES' : 'NO'}`);
    renderer.feedLine();

    renderer.addText(`Text: ${capabilities.supportText ? 'YES' : 'NO'}`);
    renderer.feedLine();

    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    renderer.addText(`Timestamp:`);
    renderer.feedLine();
    renderer.addText(this.timestamp);
    renderer.feedLine();

    renderer.printSeparator('=', maxWidth);

    if (capabilities.supportImage) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.printImage('', 100, 100);
    }

    if (capabilities.supportQR) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.printQRCode('https://github.com/bloodf/momir-basic', 6);
    }

    renderer.feedLine();
    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    renderer.addText('END DIAGNOSTICS');
    renderer.feedLine();

    if (capabilities.supportCut) {
      renderer.cutPaper(true);
    }
  }

  getAppName(): string {
    return this.appName;
  }

  getPlatform(): string {
    return this.platform;
  }

  getTransport(): PrinterTransport {
    return this.transport;
  }

  getPaperWidth(): 58 | 80 {
    return this.paperWidth;
  }

  getTimestamp(): string {
    return this.timestamp;
  }
}
