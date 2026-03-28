export const MANA_FONT_FAMILY = 'Mana';

const MANA_UNICODE_MAP: Record<string, string> = {
  'W': '\ue600',
  'U': '\ue601',
  'B': '\ue602',
  'R': '\ue603',
  'G': '\ue604',
  '0': '\ue605',
  '1': '\ue606',
  '2': '\ue607',
  '3': '\ue608',
  '4': '\ue609',
  '5': '\ue60a',
  '6': '\ue60b',
  '7': '\ue60c',
  '8': '\ue60d',
  '9': '\ue60e',
  '10': '\ue60f',
  '11': '\ue610',
  '12': '\ue611',
  '13': '\ue612',
  '14': '\ue613',
  '15': '\ue614',
  '16': '\ue62a',
  '17': '\ue62b',
  '18': '\ue62c',
  '19': '\ue62d',
  '20': '\ue62e',
  'X': '\ue615',
  'Y': '\ue616',
  'Z': '\ue617',
  'S': '\ue619',
  'C': '\ue904',
  'E': '\ue907',
  'T': '\ue61a',
  'Q': '\ue61b',
  'P': '\ue618',
  'H': '\ue618',
  'CHAOS': '\ue61d',
  'W/U': '\ue600',
  'W/B': '\ue600',
  'U/B': '\ue601',
  'U/R': '\ue601',
  'B/R': '\ue602',
  'B/G': '\ue602',
  'R/W': '\ue603',
  'R/G': '\ue603',
  'G/W': '\ue604',
  'G/U': '\ue604',
  'W/P': '\ue600',
  'U/P': '\ue601',
  'B/P': '\ue602',
  'R/P': '\ue603',
  'G/P': '\ue604',
  '2/W': '\ue607',
  '2/U': '\ue607',
  '2/B': '\ue607',
  '2/R': '\ue607',
  '2/G': '\ue607',
  'HW': '\ue600',
  'HR': '\ue603',
};

const SYMBOL_COLOR_MAP: Record<string, string> = {
  'W': '#fffbd5',
  'U': '#aae0fa',
  'B': '#cab2a0',
  'R': '#f9aa8f',
  'G': '#9bd3ae',
  'C': '#cbc2bf',
  'T': '#AAA',
  'Q': '#AAA',
  'X': '#AAA',
  'Y': '#AAA',
  'Z': '#AAA',
  'S': '#ddd',
  'E': '#f0c040',
  'P': '#cab2a0',
  'H': '#cab2a0',
  'CHAOS': '#f0c040',
};

export function getManaUnicode(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[{}]/g, '').trim();
  return MANA_UNICODE_MAP[upper] ?? upper;
}

export function getManaColor(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[{}]/g, '').trim();

  if (upper.includes('/')) {
    const first = upper.split('/')[0];
    return SYMBOL_COLOR_MAP[first] ?? '#AAA';
  }

  if (SYMBOL_COLOR_MAP[upper]) return SYMBOL_COLOR_MAP[upper];

  if (/^\d+$/.test(upper)) return '#AAA';

  return '#AAA';
}

export function isKnownSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase().replace(/[{}]/g, '').trim();
  return upper in MANA_UNICODE_MAP;
}
