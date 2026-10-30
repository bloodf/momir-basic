import { EscPosRenderer, toPrinterText } from '@/services/printer/render/escpos';
import { CardReceiptDocument } from '@/services/printer/render/document';
import type { PrinterCapabilities } from '@/types';

const bytesOf = (renderer: EscPosRenderer) => renderer.getChunks().flatMap((chunk) => Array.from(chunk));

const indexOfSequence = (haystack: number[], needle: number[]) =>
  haystack.findIndex((_, i) => needle.every((byte, j) => haystack[i + j] === byte));

describe('printQRCode', () => {
  // CRITICAL REGRESSION TEST: GS ( k 02 00 31 51 00 was rejected, so no QR code printed
  it('ends with the spec print command GS ( k 03 00 31 51 30', () => {
    const renderer = new EscPosRenderer();

    renderer.printQRCode('https://scryfall.com/card/iko/9');

    expect(bytesOf(renderer).slice(-8)).toEqual([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
  });
});

describe('toPrinterText', () => {
  // CRITICAL REGRESSION TEST: UTF-8 em-dashes printed as garbage in the PC437 code page
  it('maps typographic punctuation to ASCII', () => {
    expect(toPrinterText('Creature — Fox')).toBe('Creature - Fox');
    expect(toPrinterText('Choose one —\n• Draw a card…')).toBe('Choose one -\n* Draw a card...');
    expect(toPrinterText('“It’s mine.”')).toBe('"It\'s mine."');
  });

  it('strips accents and expands ligatures', () => {
    expect(toPrinterText('Jötun Grunt')).toBe('Jotun Grunt');
    expect(toPrinterText('Lim-Dûl’s Vault')).toBe("Lim-Dul's Vault");
    expect(toPrinterText('Æther Vial')).toBe('AEther Vial');
  });

  it('keeps ESC/POS control bytes and replaces unprintable characters', () => {
    expect(toPrinterText('\x1b\x61\x01Bold')).toBe('\x1b\x61\x01Bold');
    expect(toPrinterText('水')).toBe('?');
  });

  it('produces only single-byte output through addText', () => {
    const renderer = new EscPosRenderer();

    renderer.addText('Creature — Fox');

    expect(bytesOf(renderer)).toEqual(Array.from(new TextEncoder().encode('Creature - Fox')));
  });
});

describe('CardReceiptDocument QR URL', () => {
  const capabilities: PrinterCapabilities = {
    supportImage: false,
    supportQR: true,
    supportCut: false,
    supportText: true,
    paperWidth: 80,
  };
  const card = {
    name: 'Flourishing Fox',
    manaCost: '{W}',
    type: 'Creature — Fox',
    oracleText: '',
    imageUrl: '',
    setCode: 'IKO',
    scryfallId: '7a7a48bb-5a47-4210-bb98-ef9208942303',
  };
  const render = async (scryfallUrl?: string) => {
    const renderer = new EscPosRenderer();
    await new CardReceiptDocument({ ...card, scryfallUrl }, { printArt: false, printQR: true }).render(renderer, capabilities);
    return bytesOf(renderer);
  };

  // CRITICAL REGRESSION TEST: the QR encoded scryfall.com/card/<set>/<uuid>, which 404s
  it('encodes the card page URL when given', async () => {
    const url = 'https://scryfall.com/card/iko/9/flourishing-fox';
    const bytes = await render(url);

    expect(indexOfSequence(bytes, Array.from(new TextEncoder().encode(url)))).toBeGreaterThan(-1);
  });
});
