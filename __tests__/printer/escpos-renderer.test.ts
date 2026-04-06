import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  EscPosRenderer,
  parseManaCost,
  buildScryfallUrl,
  buildQrUrl,
  MAX_COLUMN_58MM,
  MAX_COLUMN_80MM,
} from '../../services/printer/render';

describe('EscPosRenderer', () => {
  let renderer: EscPosRenderer;

  beforeEach(() => {
    renderer = new EscPosRenderer();
  });

  describe('text commands', () => {
    it('renders text commands', () => {
      renderer.addText('Hello World');
      renderer.feedLine();
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(2);
      
      const text = new TextDecoder().decode(chunks[0]);
      expect(text).toBe('Hello World');
    });

    it('renders line feeds', () => {
      renderer.addText('Line 1');
      renderer.feedLine();
      renderer.addText('Line 2');
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(3);
    });

    it('wraps long text', () => {
      const longText = 'This is a very long line of text that should be wrapped to fit within the paper width';
      renderer.printText(longText, 20);
      
      const chunks = renderer.getChunks();
      const text = chunks.map(c => new TextDecoder().decode(c)).join('');
      
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.length > 0) {
          expect(line.length).toBeLessThanOrEqual(20);
        }
      }
    });
  });

  describe('alignment', () => {
    it('sets left alignment', () => {
      renderer.setAlignment('left');
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });

    it('sets center alignment', () => {
      renderer.setAlignment('center');
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });

    it('sets right alignment', () => {
      renderer.setAlignment('right');
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });
  });

  describe('bold text', () => {
    it('enables bold', () => {
      renderer.setBold(true);
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });

    it('disables bold', () => {
      renderer.setBold(false);
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });
  });

  describe('QR code', () => {
    it('renders QR code command', () => {
      renderer.printQRCode('https://example.com', 8);
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBeGreaterThan(0);
    });

    it('handles QR size bounds', () => {
      renderer.printQRCode('test', 0);
      renderer.printQRCode('test', 20);
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(2);
    });
  });

  describe('image', () => {
    it('throws error on empty base64', () => {
      expect(() => {
        renderer.printImage('', 100, 100);
      }).toThrow('Image printing requires valid raster bitmap data; received empty base64');
    });

    it('renders with base64 data', () => {
      renderer.printImage('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 1, 1);

      const chunks = renderer.getChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('cut paper', () => {
    it('renders cut paper command (full)', () => {
      renderer.cutPaper(false);
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBeGreaterThan(0);
    });

    it('renders cut paper command (partial)', () => {
      renderer.cutPaper(true);
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(1);
    });
  });

  describe('separator', () => {
    it('prints separator with default char', () => {
      renderer.printSeparator();
      
      const chunks = renderer.getChunks();
      const text = new TextDecoder().decode(chunks[0]);
      expect(text).toContain('-');
    });

    it('prints separator with custom char', () => {
      renderer.printSeparator('=');
      
      const chunks = renderer.getChunks();
      const text = new TextDecoder().decode(chunks[0]);
      expect(text).toContain('=');
    });

    it('respects maxWidth', () => {
      renderer.printSeparator('-', 10);
      
      const chunks = renderer.getChunks();
      const text = new TextDecoder().decode(chunks[0]);
      expect(text.length).toBe(10);
    });
  });

  describe('header', () => {
    it('prints centered bold header', () => {
      renderer.printHeader('TEST HEADER', 32);
      
      const chunks = renderer.getChunks();
      expect(chunks.length).toBe(5);
    });
  });
});

describe('58mm vs 80mm width', () => {
  let renderer: EscPosRenderer;

  beforeEach(() => {
    renderer = new EscPosRenderer();
  });

  it('uses correct max column width for 58mm', () => {
    const maxWidth = renderer.getMaxColumnWidth(58);
    expect(maxWidth).toBe(MAX_COLUMN_58MM);
    expect(maxWidth).toBe(32);
  });

  it('uses correct max column width for 80mm', () => {
    const maxWidth = renderer.getMaxColumnWidth(80);
    expect(maxWidth).toBe(MAX_COLUMN_80MM);
    expect(maxWidth).toBe(48);
  });

  it('wraps text correctly for 58mm', () => {
    const longText = 'This is a very long line that should wrap differently on narrow paper';
    renderer.printText(longText, MAX_COLUMN_58MM);
    
    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.length > 0) {
        expect(line.length).toBeLessThanOrEqual(MAX_COLUMN_58MM);
      }
    }
  });

  it('wraps text correctly for 80mm', () => {
    const longText = 'This is a very long line that should wrap differently on narrow paper';
    renderer.printText(longText, MAX_COLUMN_80MM);
    
    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.length > 0) {
        expect(line.length).toBeLessThanOrEqual(MAX_COLUMN_80MM);
      }
    }
  });
});

describe('parseManaCost', () => {
  it('parses single mana symbol', () => {
    expect(parseManaCost('{R}')).toBe('R');
  });

  it('parses multiple mana symbols', () => {
    expect(parseManaCost('{2}{G}{U}')).toBe('2 G U');
  });

  it('parses hybrid mana', () => {
    expect(parseManaCost('{W/U}')).toBe('W/U');
  });

  it('parses colorless mana', () => {
    expect(parseManaCost('{X}{4}')).toBe('X 4');
  });

  it('handles empty string', () => {
    expect(parseManaCost('')).toBe('');
  });

  it('handles undefined', () => {
    expect(parseManaCost(undefined as any)).toBe('');
  });
});

describe('buildScryfallUrl', () => {
  it('uses provided scryfallUri when available', () => {
    const url = buildScryfallUrl('https://scryfall.com/card/gn3/123', 'LEA', '12345');
    expect(url).toBe('https://scryfall.com/card/gn3/123');
  });

  it('builds URL from set code and collector number when no scryfallUri', () => {
    const url = buildScryfallUrl(undefined, 'LEA', '123');
    expect(url).toBe('https://scryfall.com/card/lea/123');
  });

  it('normalizes set code to lowercase', () => {
    const url = buildScryfallUrl(undefined, 'LEA', '456');
    expect(url).toBe('https://scryfall.com/card/lea/456');
  });
});

describe('buildQrUrl', () => {
  it('builds QR code API URL', () => {
    const qrUrl = buildQrUrl('https://example.com/card');
    expect(qrUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
    expect(qrUrl).toContain('size=144x144');
    expect(qrUrl).toContain('data=https%3A%2F%2Fexample.com%2Fcard');
  });

  it('encodes special characters', () => {
    const qrUrl = buildQrUrl('https://example.com/card?id=123&set=ABC');
    expect(qrUrl).toContain('data=');
  });
});
