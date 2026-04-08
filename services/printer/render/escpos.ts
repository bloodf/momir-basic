import { Buffer } from 'buffer';
import type { QrErrorCorrection } from '../../../types';

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Text alignment
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const ALIGN_RIGHT = [ESC, 0x61, 0x02];

// Bold
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];

// QR code
const QR_MODEL = [GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]; // Model 2

// Image (raster bit image)
const IMAGE_INIT = [ESC, 0x33, 0x00]; // Default line spacing

// Cut paper
const CUT_PAPER = [GS, 0x56, 0x00]; // Full cut
const CUT_PAPER_PARTIAL = [GS, 0x56, 0x01]; // Partial cut

// Paper widths
export const PAPER_WIDTH_58MM = 58;
export const PAPER_WIDTH_80MM = 80;
export const MAX_COLUMN_58MM = 32;
export const MAX_COLUMN_80MM = 48;

/**
 * Printer capabilities for rendering decisions
 */
export interface PrinterCapabilities {
  supportImage: boolean;
  supportQR: boolean;
  supportCut: boolean;
  supportText: boolean;
  paperWidth: 58 | 80;
  maxColumnWidth?: number;
  encoding?: string;
}

/**
 * Interface for print documents that can be rendered by EscPosRenderer
 */
export interface PrintDocument {
  render(renderer: EscPosRenderer, capabilities: PrinterCapabilities): Promise<void>;
}

/**
 * Renders PrintDocument objects to ESC/POS byte commands
 */
export class EscPosRenderer {
  private chunks: Uint8Array[] = [];
  private capabilities: PrinterCapabilities | null = null;

  /**
   * Set printer capabilities for validation.
   * When capabilities are set, operations like printImage, printQRCode, and cutPaper
   * will throw if the printer does not support them.
   */
  setCapabilities(caps: PrinterCapabilities | null): void {
    this.capabilities = caps;
  }

  /**
   * Get the current capabilities
   */
  getCapabilities(): PrinterCapabilities | null {
    return this.capabilities;
  }

  private requireCapability(feature: 'image' | 'qr' | 'cut'): void {
    if (!this.capabilities) return;

    switch (feature) {
      case 'image':
        if (!this.capabilities.supportImage) {
          throw new Error('Printer does not support image printing (capability: supportImage=false)');
        }
        break;
      case 'qr':
        if (!this.capabilities.supportQR) {
          throw new Error('Printer does not support QR code printing (capability: supportQR=false)');
        }
        break;
      case 'cut':
        if (!this.capabilities.supportCut) {
          throw new Error('Printer does not support paper cut (capability: supportCut=false)');
        }
        break;
    }
  }

  /**
   * Get the rendered byte chunks
   */
  getChunks(): Uint8Array[] {
    return this.chunks;
  }

  /**
   * Reset the renderer state
   */
  reset(): void {
    this.chunks = [];
  }

  /**
   * Add raw bytes to the output
   */
  private addBytes(bytes: number[]): void {
    this.chunks.push(new Uint8Array(bytes));
  }

  /**
   * Add a string as UTF-8 bytes
   */
  addText(text: string): void {
    const encoder = new TextEncoder();
    this.chunks.push(encoder.encode(text));
  }

  /**
   * Add a line feed (newline)
   */
  feedLine(): void {
    this.addBytes([LF]);
  }

  /**
   * Set text alignment
   */
  setAlignment(alignment: 'left' | 'center' | 'right'): void {
    switch (alignment) {
      case 'left':
        this.addBytes(ALIGN_LEFT);
        break;
      case 'center':
        this.addBytes(ALIGN_CENTER);
        break;
      case 'right':
        this.addBytes(ALIGN_RIGHT);
        break;
    }
  }

  /**
   * Set bold text on/off
   */
  setBold(on: boolean): void {
    this.addBytes(on ? BOLD_ON : BOLD_OFF);
  }

  /**
   * Print text with automatic line wrapping
   */
  printText(text: string, maxWidth: number): void {
    const lines = this.wrapText(text, maxWidth);
    for (const line of lines) {
      this.addText(line);
      this.feedLine();
    }
  }

  /**
   * Print a centered header line (bold)
   */
  printHeader(text: string, maxWidth: number): void {
    this.setAlignment('center');
    this.setBold(true);
    this.addText(this.centerText(text, maxWidth));
    this.feedLine();
    this.setBold(false);
  }

  /**
   * Print a separator line
   */
  printSeparator(char: string = '-', maxWidth?: number): void {
    if (maxWidth) {
      this.addText(char.repeat(maxWidth));
    } else {
      this.addText(char.repeat(32));
    }
    this.feedLine();
  }

  /**
   * Print QR code using ESC/POS QR commands.
   * Requires QR capability to be supported by the printer.
   */
  printQRCode(data: string, size: number = 8, errorCorrection: QrErrorCorrection = 'L'): void {
    this.requireCapability('qr');

    const qrSize = Math.min(Math.max(size, 1), 16);
    const ecMap: Record<QrErrorCorrection, number> = {
      L: 0x30,
      M: 0x31,
      Q: 0x32,
      H: 0x33,
    };
    const ecByte = ecMap[errorCorrection] ?? 0x30;

    const bytes: number[] = [];

    // Model 2
    bytes.push(...QR_MODEL);

    // Size
    bytes.push(...[GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, qrSize]);

    // Error correction level
    bytes.push(...[GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte]);

    // Store data
    const dataBytes = new TextEncoder().encode(data);
    const dataLen = dataBytes.length + 3;
    bytes.push(...[GS, 0x28, 0x6b, dataLen % 256, Math.floor(dataLen / 256), 0x31, 0x50, 0x30]);
    bytes.push(...dataBytes);

    // Print
    bytes.push(...[GS, 0x28, 0x6b, 0x02, 0x00, 0x31, 0x51, 0x00]);

    this.addBytes(bytes);
  }

  /**
   * Print a raster bit image from base64-encoded bitmap data.
   * Requires the base64 to be a valid bitmap (1-bit dithered format expected).
   * Throws if no valid image data is provided.
   */
  printImage(base64: string, width: number, height: number): void {
    this.requireCapability('image');

    if (!base64 || base64.length === 0) {
      throw new Error('Image printing requires valid raster bitmap data; received empty base64');
    }

    let imageData: Uint8Array;
    try {
      imageData = Uint8Array.from(Buffer.from(base64, 'base64'));
      if (imageData.length === 0) {
        throw new Error('Empty image data');
      }
    } catch {
      throw new Error('Image printing requires valid base64-encoded raster bitmap; decode failed');
    }

    // Image print command: ESC * m n1 n2
    // m = 0: 8-dot single-density
    // n1 n2 = width in bytes (LSB, MSB)
    const bytesPerLine = Math.ceil(width / 8);
    const n1 = bytesPerLine % 256;
    const n2 = Math.floor(bytesPerLine / 256);

    // Initialize image with default line spacing
    this.addBytes([ESC, 0x33, 0x18]);

    // Print raster image mode 0 (8-dot single-density)
    this.addBytes([ESC, 0x2a, 0x00, n1, n2]);

    // Output image data rows, respecting printer's line spacing
    // Chunk per row to stay within transport MTU limits
    const rowsPerChunk = 4;
    for (let y = 0; y < height; y++) {
      const rowStart = y * bytesPerLine;
      const rowEnd = Math.min(rowStart + bytesPerLine, imageData.length);
      if (rowStart < imageData.length) {
        const rowData = imageData.slice(rowStart, rowEnd);
        this.chunks.push(new Uint8Array(rowData));
      } else {
        // Pad short rows with zeros
        this.chunks.push(new Uint8Array(bytesPerLine));
      }

      // Feed after each row group to prevent buffer overflow on limited printers
      if ((y + 1) % rowsPerChunk === 0) {
        this.addBytes([LF]);
      }
    }

    this.feedLine();
  }

  /**
   * Cut the paper using ESC/POS cut command.
   * Requires cut capability to be supported by the printer.
   */
  cutPaper(partial: boolean = false): void {
    this.requireCapability('cut');
    this.addBytes(partial ? CUT_PAPER_PARTIAL : CUT_PAPER);
  }

  /**
   * Get max column width based on paper width
   */
  getMaxColumnWidth(paperWidth: 58 | 80): number {
    return paperWidth === 80 ? MAX_COLUMN_80MM : MAX_COLUMN_58MM;
  }

  /**
   * Wrap text to fit within maxWidth, preserving word boundaries
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          // Handle words longer than maxWidth
          if (word.length > maxWidth) {
            let remaining = word;
            while (remaining.length > maxWidth) {
              lines.push(remaining.substring(0, maxWidth));
              remaining = remaining.substring(maxWidth);
            }
            currentLine = remaining;
          } else {
            currentLine = word;
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  }

  /**
   * Center text within a field width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
}

/**
 * Parse mana cost string to plain text tokens
 * Input: "{2}{G}" Output: "2 G"
 */
export function parseManaCost(manaCost: string): string {
  if (!manaCost) return '';
  
  const tokens: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(manaCost)) !== null) {
    tokens.push(match[1]);
  }
  
  return tokens.join(' ');
}

/**
 * Build Scryfall URL for a card
 */
export function buildScryfallUrl(
  scryfallUri: string | undefined,
  setCode: string,
  collectorNumber: string
): string {
  if (scryfallUri) {
    return scryfallUri;
  }
  return `https://scryfall.com/card/${setCode.toLowerCase()}/${collectorNumber}`;
}

export function buildQrUrl(scryfallUrl: string): string {
  const encoded = encodeURIComponent(scryfallUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encoded}&bgcolor=FFFFFF&color=000000&margin=0`;
}
