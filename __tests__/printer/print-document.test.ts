import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CardReceiptDocument,
  DiagnosticsDocument,
  EscPosRenderer,
  PrinterCapabilities,
} from '../../services/printer/render';

const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 58,
};

const FULL_CAPABILITIES: PrinterCapabilities = {
  supportImage: true,
  supportQR: true,
  supportCut: true,
  supportText: true,
  paperWidth: 80,
};

describe('CardReceiptDocument', () => {
  let renderer: EscPosRenderer;

  beforeEach(() => {
    renderer = new EscPosRenderer();
  });

  it('renders correct structure for basic card', async () => {
    const card = {
      name: 'Lightning Bolt',
      manaCost: '{R}',
      type: 'Sorcery',
      oracleText: 'Lightning Bolt deals 3 damage to any target.',
      flavorText: undefined,
      power: undefined,
      toughness: undefined,
      imageUrl: 'https://example.com/bolt.jpg',
      setCode: 'LEA',
      scryfallId: '12345',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card);
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    expect(chunks.length).toBeGreaterThan(0);

    const text = chunks.map(c => new TextDecoder().decode(c)).join('');
    expect(text).toContain('Lightning Bolt');
    expect(text).toContain('Sorcery');
    expect(text).toContain('Lightning Bolt deals 3 damage');
    expect(text).toContain('LEA');
  });

  it('renders correct structure for creature card with stats', async () => {
    const card = {
      name: 'Grizzly Bears',
      manaCost: '{1}{G}',
      type: 'Creature — Bear',
      oracleText: 'Grizzly Bears deals 2 damage to any target.',
      flavorText: 'A loyal companion.',
      power: '2',
      toughness: '2',
      imageUrl: 'https://example.com/bears.jpg',
      setCode: 'M10',
      scryfallId: '67890',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card);
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('Grizzly Bears');
    expect(text).toContain('2/2');
    expect(text).toContain('A loyal companion.');
  });

  it('skips image when supportImage is false', async () => {
    const card = {
      name: 'Test Card',
      manaCost: '{1}',
      type: 'Creature',
      oracleText: 'Test text.',
      imageUrl: 'https://example.com/test.jpg',
      setCode: 'TSET',
      scryfallId: '99999',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card, { printArt: true });
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('[Art: unavailable]');
  });

  it('skips QR when supportQR is false', async () => {
    const card = {
      name: 'Test Card',
      manaCost: '{1}',
      type: 'Creature',
      oracleText: 'Test text.',
      imageUrl: 'https://example.com/test.jpg',
      setCode: 'TSET',
      scryfallId: '99999',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportQR: false,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card, { printQR: true });
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).not.toContain('api.qrserver.com');
  });

  it('respects printArt option', async () => {
    const card = {
      name: 'Test Card',
      manaCost: '{1}',
      type: 'Creature',
      oracleText: 'Test text.',
      imageUrl: 'https://example.com/test.jpg',
      setCode: 'TSET',
      scryfallId: '99999',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card, { printArt: false });
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).not.toContain('[Art: unavailable]');
  });

  it('respects paperWidth 80mm', async () => {
    const card = {
      name: 'Test Card',
      manaCost: '{1}',
      type: 'Creature',
      oracleText: 'Test text.',
      imageUrl: 'https://example.com/test.jpg',
      setCode: 'TSET',
      scryfallId: '99999',
    };

    const capabilities: PrinterCapabilities = {
      ...FULL_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card, { paperWidth: 80 });
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('respects cut option when supported', async () => {
    const card = {
      name: 'Test Card',
      manaCost: '{1}',
      type: 'Creature',
      oracleText: 'Test text.',
      imageUrl: 'https://example.com/test.jpg',
      setCode: 'TSET',
      scryfallId: '99999',
    };

    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new CardReceiptDocument(card, { cut: true });
    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe('DiagnosticsDocument', () => {
  let renderer: EscPosRenderer;

  beforeEach(() => {
    renderer = new EscPosRenderer();
  });

  it('renders correct structure', async () => {
    const capabilities: PrinterCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportImage: false,
    };

    const doc = new DiagnosticsDocument(
      'Rork App',
      'iOS',
      'ble',
      58,
      '2024-01-15T10:30:00Z'
    );

    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('PRINTER DIAGNOSTICS');
    expect(text).toContain('App: Rork App');
    expect(text).toContain('Platform: iOS');
    expect(text).toContain('Transport: ble');
    expect(text).toContain('Paper: 58mm');
    expect(text).toContain('2024-01-15T10:30:00Z');
  });

  it('renders capability status correctly', async () => {
    const capabilities: PrinterCapabilities = {
      supportImage: false,
      supportQR: true,
      supportCut: true,
      supportText: true,
      paperWidth: 58,
    };

    const doc = new DiagnosticsDocument(
      'Test App',
      'Android',
      'tcp',
      58,
      '2024-01-15T12:00:00Z'
    );

    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('Image: NO');
    expect(text).toContain('QR Code: YES');
    expect(text).toContain('Cut Paper: YES');
    expect(text).toContain('Text: YES');
  });

  it('handles disabled capabilities', async () => {
    const capabilities: PrinterCapabilities = {
      supportImage: false,
      supportQR: false,
      supportCut: false,
      supportText: true,
      paperWidth: 80,
    };

    const doc = new DiagnosticsDocument(
      'Test App',
      'Web',
      'classic',
      80,
      '2024-01-15T12:00:00Z'
    );

    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('Image: NO');
    expect(text).toContain('QR Code: NO');
    expect(text).toContain('Cut Paper: NO');
    expect(text).toContain('Text: YES');
    expect(text).toContain('Paper: 80mm');
  });

  it('respects paperWidth 80mm', async () => {
    const capabilities: PrinterCapabilities = {
      ...FULL_CAPABILITIES,
      supportImage: false,
    };

    const doc = new DiagnosticsDocument(
      'Test App',
      'iOS',
      'ble',
      80,
      '2024-01-15T12:00:00Z'
    );

    await doc.render(renderer, capabilities);

    const chunks = renderer.getChunks();
    const text = chunks.map(c => new TextDecoder().decode(c)).join('');

    expect(text).toContain('Paper: 80mm');
  });
});
