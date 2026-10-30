import type { PaperPreset, PrinterPreferences } from '@/types';

export interface PaperPresetSpec {
  id: PaperPreset;
  paperWidth: 58 | 80;
  /** Printable dots per line, used as the raster image width */
  dotsPerLine: number;
  /** Font A characters per line, used for receipt text wrapping */
  charsPerLine: number;
  /** Print-head resolution, used to convert millimetres to dots */
  dpi: number;
  /** Short label for the settings toggle */
  label: string;
}

export const PAPER_PRESETS: Record<PaperPreset, PaperPresetSpec> = {
  '58mm': { id: '58mm', paperWidth: 58, dotsPerLine: 384, charsPerLine: 32, dpi: 203, label: '58' },
  '80mm': { id: '80mm', paperWidth: 80, dotsPerLine: 576, charsPerLine: 48, dpi: 203, label: '80' },
  // 80mm paper on 180 dpi heads (e.g. Epson TM-H6000 series): 512 dots, 42 columns
  '80mm_180dpi': { id: '80mm_180dpi', paperWidth: 80, dotsPerLine: 512, charsPerLine: 42, dpi: 180, label: '80·512' },
};

/** Order the settings toggle cycles through. */
export const PAPER_PRESET_ORDER: PaperPreset[] = ['58mm', '80mm', '80mm_180dpi'];

/**
 * Resolve the active paper preset. Settings saved before presets existed only
 * have paperWidth, so fall back to the matching 58mm/80mm preset.
 */
export function resolvePaperPreset(
  prefs: Partial<Pick<PrinterPreferences, 'paperPreset' | 'paperWidth'>>,
): PaperPresetSpec {
  if (prefs.paperPreset && PAPER_PRESETS[prefs.paperPreset]) {
    return PAPER_PRESETS[prefs.paperPreset];
  }
  return prefs.paperWidth === 80 ? PAPER_PRESETS['80mm'] : PAPER_PRESETS['58mm'];
}

/** The preset after `current` in PAPER_PRESET_ORDER, wrapping around. */
export function nextPaperPreset(current: PaperPreset): PaperPreset {
  const index = PAPER_PRESET_ORDER.indexOf(current);
  return PAPER_PRESET_ORDER[(index + 1) % PAPER_PRESET_ORDER.length];
}

/** Width of a Magic card; card-size prints stay inside this so the slip can be trimmed to fit a sleeve. */
export const CARD_WIDTH_MM = 63;

/** Font A character width in dots (12x24 on both 180 and 203 dpi heads). */
const FONT_A_WIDTH_DOTS = 12;

export interface PrintArea {
  /** Left margin in dots (GS L) */
  leftMarginDots: number;
  /** Printable width in dots (GS W); also the raster image width */
  widthDots: number;
  /** Font A characters that fit in widthDots */
  charsPerLine: number;
}

/**
 * Printable area for a preset. Card-size keeps the print within CARD_WIDTH_MM of the
 * paper's left edge, so the slip folds once to card width. The print head's area is
 * centred on the paper, leaving a blank margin on the left (~4 mm on 80mm paper) that
 * counts towards the card width. Paper narrower than a card (58mm) uses its full width.
 */
export function getPrintArea(preset: PaperPresetSpec, cardSize: boolean): PrintArea {
  if (!cardSize) {
    return { leftMarginDots: 0, widthDots: preset.dotsPerLine, charsPerLine: preset.charsPerLine };
  }
  const printableMm = (preset.dotsPerLine * 25.4) / preset.dpi;
  const paperMarginMm = Math.max(0, (preset.paperWidth - printableMm) / 2);
  // Raster widths must be whole bytes, so round down to a multiple of 8 dots
  const cardDots = Math.floor((((CARD_WIDTH_MM - paperMarginMm) * preset.dpi) / 25.4) / 8) * 8;
  const widthDots = Math.min(cardDots, preset.dotsPerLine);
  return {
    // Left-aligned: the unused strip is all on one side, so the slip folds once to card width
    leftMarginDots: 0,
    widthDots,
    charsPerLine: Math.min(preset.charsPerLine, Math.floor(widthDots / FONT_A_WIDTH_DOTS)),
  };
}
