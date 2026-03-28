import type { PrinterCapabilities, PrinterTransport } from '../../../types';
import {
  EscPosRenderer,
  PrintDocument,
  parseManaCost,
  buildScryfallUrl,
  buildQrUrl,
  MAX_COLUMN_58MM,
  MAX_COLUMN_80MM,
} from './escpos';

export interface CardReceiptOptions {
  printArt: boolean;
  printQR: boolean;
  cut: boolean;
  paperWidth: 58 | 80;
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
    };
  }

  async render(renderer: EscPosRenderer, capabilities: PrinterCapabilities): Promise<void> {
    renderer.reset();
    
    const maxWidth = this.options.paperWidth === 80 
      ? MAX_COLUMN_80MM 
      : MAX_COLUMN_58MM;

    renderer.setAlignment('center');
    renderer.setBold(true);
    renderer.addText(this.card.name);
    renderer.feedLine();

    const manaTokens = parseManaCost(this.card.manaCost);
    if (manaTokens) {
      renderer.setBold(false);
      renderer.addText(`[${manaTokens}]`);
      renderer.feedLine();
    }

    renderer.setBold(false);
    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    renderer.addText(this.card.type);
    renderer.feedLine();

    renderer.printSeparator('-', maxWidth);

    if (this.card.oracleText) {
      renderer.setAlignment('left');
      renderer.printText(this.card.oracleText, maxWidth);
    }

    if (this.card.flavorText) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.addText(`"${this.card.flavorText}"`);
      renderer.feedLine();
    }

    if (this.card.power !== undefined && this.card.toughness !== undefined) {
      renderer.feedLine();
      renderer.setAlignment('right');
      renderer.setBold(true);
      renderer.addText(`${this.card.power}/${this.card.toughness}`);
      renderer.feedLine();
      renderer.setBold(false);
    }

    if (this.options.printArt && capabilities.supportImage) {
      renderer.feedLine();
      renderer.printImage(this.card.imageUrl, 200, 170);
    } else if (this.options.printArt && !capabilities.supportImage) {
      renderer.feedLine();
      renderer.setAlignment('center');
      renderer.addText('[Art: unavailable]');
      renderer.feedLine();
    }

    if (this.options.printQR && capabilities.supportQR) {
      renderer.feedLine();
      renderer.setAlignment('center');
      const scryfallUrl = buildScryfallUrl(
        undefined,
        this.card.setCode,
        this.card.scryfallId
      );
      const qrUrl = buildQrUrl(scryfallUrl);
      renderer.printQRCode(qrUrl, 8);
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
      const testQrUrl = buildQrUrl('https://rork.com');
      renderer.printQRCode(testQrUrl, 6);
    }

    renderer.feedLine();
    renderer.printSeparator('-', maxWidth);

    renderer.setAlignment('center');
    renderer.addText('END DIAGNOSTICS');
    renderer.feedLine();

    renderer.cutPaper(true);
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
