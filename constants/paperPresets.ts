import type { PaperPreset, PrinterPreferences } from '@/types';

export interface PaperPresetSpec {
  id: PaperPreset;
  paperWidth: 58 | 80;
  /** Printable dots per line, used as the raster image width */
  dotsPerLine: number;
  /** Font A characters per line, used for receipt text wrapping */
  charsPerLine: number;
  /** Short label for the settings toggle */
  label: string;
}

export const PAPER_PRESETS: Record<PaperPreset, PaperPresetSpec> = {
  '58mm': { id: '58mm', paperWidth: 58, dotsPerLine: 384, charsPerLine: 32, label: '58' },
  '80mm': { id: '80mm', paperWidth: 80, dotsPerLine: 576, charsPerLine: 48, label: '80' },
  // 80mm paper on 180 dpi heads (e.g. Epson TM-H6000 series): 512 dots, 42 columns
  '80mm_180dpi': { id: '80mm_180dpi', paperWidth: 80, dotsPerLine: 512, charsPerLine: 42, label: '80·512' },
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
