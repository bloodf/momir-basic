import { PAPER_PRESETS, getPrintArea, nextPaperPreset, resolvePaperPreset } from '@/constants/paperPresets';
import {
  CardReceiptDocument,
  EscPosRenderer,
  type PrinterCapabilities,
} from '@/services/printer/render';

describe('resolvePaperPreset', () => {
  it('uses the saved preset when present', () => {
    expect(resolvePaperPreset({ paperPreset: '80mm_180dpi', paperWidth: 80 })).toMatchObject({
      dotsPerLine: 512,
      charsPerLine: 42,
    });
  });

  it('falls back to paperWidth for settings saved before presets existed', () => {
    expect(resolvePaperPreset({ paperWidth: 80 }).id).toBe('80mm');
    expect(resolvePaperPreset({ paperWidth: 58 }).id).toBe('58mm');
    expect(resolvePaperPreset({}).id).toBe('58mm');
  });

  it('keeps the existing 58mm and 80mm geometry', () => {
    expect(PAPER_PRESETS['58mm']).toMatchObject({ dotsPerLine: 384, charsPerLine: 32 });
    expect(PAPER_PRESETS['80mm']).toMatchObject({ dotsPerLine: 576, charsPerLine: 48 });
  });
});

describe('nextPaperPreset', () => {
  it('cycles through every preset and wraps around', () => {
    expect(nextPaperPreset('58mm')).toBe('80mm');
    expect(nextPaperPreset('80mm')).toBe('80mm_180dpi');
    expect(nextPaperPreset('80mm_180dpi')).toBe('58mm');
  });
});

describe('CardReceiptDocument charsPerLine', () => {
  const capabilities: PrinterCapabilities = {
    supportImage: false,
    supportQR: false,
    supportCut: false,
    supportText: true,
    paperWidth: 80,
  };
  const card = {
    name: 'Verbose Oracle',
    manaCost: '{2}{U}',
    type: 'Creature — Sphinx',
    oracleText:
      'Flying. Whenever Verbose Oracle deals combat damage to a player, draw a card, then scry two, then each opponent mills three cards.',
    imageUrl: '',
    setCode: 'TST',
    scryfallId: 'abc',
  };

  const renderLines = async (charsPerLine?: number) => {
    const renderer = new EscPosRenderer();
    const doc = new CardReceiptDocument(card, { paperWidth: 80, printArt: false, printQR: false, charsPerLine });
    await doc.render(renderer, capabilities);
    const text = renderer.getChunks().map((chunk) => new TextDecoder().decode(chunk)).join('');
    // Drop ESC/POS control bytes so only printable line content is measured
    return text.split('\n').map((line) => line.replace(/[\x00-\x1f]./g, '').replace(/[\x00-\x1f]/g, ''));
  };

  // CRITICAL REGRESSION TEST: 48-column layout wrapped mid-line on 512-dot printers
  it('wraps receipt text to the preset column count', async () => {
    const lines = await renderLines(42);

    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(42);
    expect(Math.max(...lines.map((line) => line.length))).toBeGreaterThan(32);
  });

  it('defaults to 48 columns on 80mm paper without a preset', async () => {
    const lines = await renderLines(undefined);

    expect(Math.max(...lines.map((line) => line.length))).toBeGreaterThan(42);
    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(48);
  });
});

describe('getPrintArea', () => {
  it('uses the full paper when card-size is off', () => {
    expect(getPrintArea(PAPER_PRESETS['80mm_180dpi'], false)).toEqual({
      leftMarginDots: 0,
      widthDots: 512,
      charsPerLine: 42,
    });
  });

  it('left-aligns a 63 mm column on 80mm paper so the slip folds once', () => {
    // 512 dots at 180 dpi = 72.25 mm printable, so a ~3.9 mm paper margin on the left:
    // 63 - 3.9 = 59.1 mm = 418 dots, rounded down to whole bytes
    expect(getPrintArea(PAPER_PRESETS['80mm_180dpi'], true)).toEqual({
      leftMarginDots: 0,
      widthDots: 416,
      charsPerLine: 34,
    });
    // 576 dots at 203 dpi = 72.07 mm printable: 63 - 3.96 = 59.04 mm = 471 dots
    expect(getPrintArea(PAPER_PRESETS['80mm'], true)).toEqual({
      leftMarginDots: 0,
      widthDots: 464,
      charsPerLine: 38,
    });
  });

  it('keeps 58mm paper at full width since it is narrower than a card', () => {
    expect(getPrintArea(PAPER_PRESETS['58mm'], true)).toEqual(getPrintArea(PAPER_PRESETS['58mm'], false));
  });
});

describe('CardReceiptDocument printArea', () => {
  const card = {
    name: 'Lightning Bolt',
    manaCost: '{R}',
    type: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    imageUrl: '',
    setCode: 'LEA',
    scryfallId: '12345',
  };
  const capabilities: PrinterCapabilities = {
    supportImage: false,
    supportQR: false,
    supportCut: false,
    supportText: true,
    paperWidth: 80,
  };
  const firstChunk = async (printArea?: { leftMarginDots: number; widthDots: number }) => {
    const renderer = new EscPosRenderer();
    await new CardReceiptDocument(card, { paperWidth: 80, printArt: false, printQR: false, printArea }).render(renderer, capabilities);
    return Array.from(renderer.getChunks()[0]);
  };

  it('sets GS L / GS W before any content', async () => {
    // left 36 = 0x24, width 440 = 0x01b8
    expect(await firstChunk({ leftMarginDots: 36, widthDots: 440 })).toEqual([
      0x1d, 0x4c, 0x24, 0x00,
      0x1d, 0x57, 0xb8, 0x01,
    ]);
  });

  it('sends no print-area commands when no area is given', async () => {
    expect((await firstChunk()).slice(0, 2)).not.toEqual([0x1d, 0x4c]);
  });
});
