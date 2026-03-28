import type { ScryfallCard } from '../../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  fetchRandomCard,
  fetchMultipleCards,
  searchCards,
  autocompleteCardName,
  fetchCardPrintings,
  fetchSets,
  parseAdvancedSyntax,
  fetchRandomBgCardForType,
} from '../../services/scryfall';

function createFakeScryfallCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'card-id-123',
    name: 'Test Card',
    mana_cost: '{2}{G}',
    type_line: 'Creature — Elf',
    oracle_text: 'When Test Card enters, draw a card.',
    flavor_text: 'Flavor text here.',
    power: '2',
    toughness: '2',
    scryfall_uri: 'https://scryfall.com/card/set/123',
    image_uris: {
      art_crop: 'https://cards.scryfall.io/art_crop/front/f/a/123.jpg',
      normal: 'https://cards.scryfall.io/normal/front/f/a/123.jpg',
      small: 'https://cards.scryfall.io/small/front/f/a/123.jpg',
    },
    set_name: 'Mock Set',
    set: 'MST',
    collector_number: '1',
    artist: 'Test Artist',
    rarity: 'rare',
    colors: ['G'],
    cmc: 3,
    lang: 'en',
    ...overrides,
  };
}

describe('Scryfall Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  describe('fetchRandomCard', () => {
    it('fetches a random card successfully', async () => {
      const fakeCard = createFakeScryfallCard();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeCard,
      });

      const result = await fetchRandomCard('creature', 3);

      expect(result.id).toBe('card-id-123');
      expect(result.name).toBe('Test Card');
      expect(result.manaCost).toBe('{2}{G}');
      expect(result.typeLine).toBe('Creature — Elf');
      expect(result.oracleText).toBe('When Test Card enters, draw a card.');
      expect(result.colors).toEqual(['G']);
      expect(result.cmc).toBe(3);
    });

    it('uses English when lang is undefined', async () => {
      const fakeCard = createFakeScryfallCard();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeCard,
      });

      await fetchRandomCard('creature', 3);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('fetches localized card when lang is not English', async () => {
      const englishCard = createFakeScryfallCard({ id: 'en-123' });
      const localizedCard = createFakeScryfallCard({
        id: 'pt-123',
        lang: 'pt',
        printed_name: 'Carta de Teste',
        mana_cost: undefined,
        card_faces: [
          {
            name: 'Carta de Teste',
            mana_cost: '{2}{G}',
            type_line: 'Criatura — Elfo',
            oracle_text: 'Quando Carta de Teste entra, compre um carta.',
          },
        ],
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => englishCard,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => localizedCard,
        });

      const result = await fetchRandomCard('creature', 3, true, 3, 'pt');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('pt-123');
    });

    it('falls back to English when localized version not found', async () => {
      const englishCard = createFakeScryfallCard({ id: 'en-123' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => englishCard,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 404,
        });

      const result = await fetchRandomCard('creature', 3, true, 3, 'pt');

      expect(result.id).toBe('en-123');
    });

    it('retries on 404 and throws when all retries exhausted', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchRandomCard('creature', 3, true, 3)).rejects.toThrow(
        'No creature found at CMC 3'
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('retries on 429 rate limit', async () => {
      const fakeCard = createFakeScryfallCard();
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => fakeCard,
        });

      const result = await fetchRandomCard('creature', 3);

      expect(result.id).toBe('card-id-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on non-retryable API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetchRandomCard('creature', 3)).rejects.toThrow(
        'Scryfall API error: 500'
      );
    });

    it('maps card_faces data correctly for split cards', async () => {
      const splitCard = createFakeScryfallCard({
        mana_cost: undefined,
        oracle_text: undefined,
        card_faces: [
          {
            name: 'Left Half',
            mana_cost: '{1}{W}',
            type_line: 'Instant',
            oracle_text: 'First half effect.',
            power: undefined,
            toughness: undefined,
          },
          {
            name: 'Right Half',
            mana_cost: '{2}{U}',
            type_line: 'Instant',
            oracle_text: 'Second half effect.',
          },
        ],
        image_uris: undefined,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => splitCard,
      });

      const result = await fetchRandomCard('instants', 0);

      expect(result.name).toBe('Test Card');
      expect(result.manaCost).toBe('{1}{W}');
      expect(result.oracleText).toBe('First half effect.');
    });

    it('defaults rarity to common for unknown rarity values', async () => {
      const card = createFakeScryfallCard({ rarity: 'funny' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => card,
      });

      const result = await fetchRandomCard('creature', 3);

      expect(result.rarity).toBe('common');
    });
  });

  describe('fetchMultipleCards', () => {
    it('fetches multiple cards sequentially', async () => {
      const card1 = createFakeScryfallCard({ id: 'card-1' });
      const card2 = createFakeScryfallCard({ id: 'card-2' });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => card1,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => card2,
        });

      const result = await fetchMultipleCards('creature', 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('card-1');
      expect(result[1].id).toBe('card-2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handles excludeFunny flag', async () => {
      const card = createFakeScryfallCard();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => card,
      });

      await fetchMultipleCards('creature', 1, false);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('game%3Apaper');
      expect(callUrl).not.toContain('-st%3Afunny');
    });
  });

  describe('searchCards', () => {
    it('returns search results with pagination', async () => {
      const data = {
        data: [createFakeScryfallCard({ id: 'result-1' })],
        total_cards: 50,
        has_more: true,
        next_page: 'https://api.scryfall.com/cards/search?page=2',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await searchCards('t:creature');

      expect(result.cards).toHaveLength(1);
      expect(result.totalCards).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextPageUrl).toBe('https://api.scryfall.com/cards/search?page=2');
    });

    it('returns empty result on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await searchCards('nonexistent-card-name-xyz');

      expect(result.cards).toHaveLength(0);
      expect(result.totalCards).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('retries on 429 rate limit', async () => {
      const data = {
        data: [createFakeScryfallCard()],
        total_cards: 1,
        has_more: false,
      };

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => data,
        });

      const result = await searchCards('t:creature');

      expect(result.cards).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('applies language filter when lang is not English', async () => {
      const data = {
        data: [createFakeScryfallCard()],
        total_cards: 1,
        has_more: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      await searchCards('t:creature', 1, 'pt');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('lang%3Apt');
    });

    it('throws on non-retryable API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(searchCards('t:creature')).rejects.toThrow(
        'Scryfall search error: 500'
      );
    });
  });

  describe('autocompleteCardName', () => {
    it('returns autocomplete suggestions', async () => {
      const data = { data: ['Ancient Dragon', 'Ancient Grudge'] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await autocompleteCardName('Ancient');

      expect(result).toEqual(['Ancient Dragon', 'Ancient Grudge']);
    });

    it('returns empty array for queries shorter than 2 chars', async () => {
      const result = await autocompleteCardName('A');

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await autocompleteCardName('Ancient');

      expect(result).toEqual([]);
    });
  });

  describe('fetchCardPrintings', () => {
    it('returns card printings', async () => {
      const data = {
        data: [
          {
            id: 'print-1',
            set_name: 'Alpha',
            set: 'LEA',
            collector_number: '1',
            rarity: 'rare',
            released_at: '1993-01-01',
            image_uris: { small: 'https://cards.scryfall.io/small/1.jpg' },
          },
          {
            id: 'print-2',
            set_name: 'Beta',
            set: 'LEB',
            collector_number: '1',
            rarity: 'rare',
            released_at: '1993-01-02',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await fetchCardPrintings('Test Card');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('print-1');
      expect(result[0].setCode).toBe('LEA');
      expect(result[0].releasedAt).toBe('1993-01-01');
      expect(result[1].imageUrl).toBe('');
    });

    it('returns empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchCardPrintings('Test Card');

      expect(result).toEqual([]);
    });

    it('handles card_faces image fallback', async () => {
      const data = {
        data: [
          {
            id: 'print-1',
            set_name: 'Test',
            set: 'TST',
            collector_number: '1',
            rarity: 'common',
            image_uris: undefined,
            card_faces: [
              { image_uris: { small: 'https://cards.scryfall.io/small/face.jpg' } },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await fetchCardPrintings('Test Card');

      expect(result[0].imageUrl).toBe('https://cards.scryfall.io/small/face.jpg');
    });
  });

  describe('fetchSets', () => {
    it('filters and sorts sets correctly', async () => {
      const data = {
        data: [
          { code: 'ZEN', name: 'Zendikar', set_type: 'expansion', released_at: '2020-01-01' },
          { code: 'JMP', name: 'Jumpstart', set_type: 'draft_innovation', released_at: '2020-06-01' },
          { code: 'SUS', name: 'Suspended', set_type: 'memorabilia', released_at: '2020-03-01' },
          { code: 'VMA', name: 'Vintage Masters', set_type: 'masters', released_at: '2014-01-01' },
          { code: 'CMD', name: 'Commander', set_type: 'commander', released_at: '2020-02-01' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await fetchSets();

      expect(result).toHaveLength(4);
      expect(result[0].code).toBe('JMP');
      expect(result[1].code).toBe('CMD');
      expect(result[2].code).toBe('ZEN');
      expect(result[3].code).toBe('VMA');
    });

    it('returns empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchSets();

      expect(result).toEqual([]);
    });

    it('handles missing released_at', async () => {
      const data = {
        data: [
          { code: 'XXX', name: 'No Date Set', set_type: 'core' },
          { code: 'YYY', name: 'With Date', set_type: 'core', released_at: '2020-01-01' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
      });

      const result = await fetchSets();

      expect(result).toHaveLength(2);
    });
  });

  describe('parseAdvancedSyntax', () => {
    it('expands R: (rarity) shortcuts', () => {
      expect(parseAdvancedSyntax('R:C')).toBe('r:common');
      expect(parseAdvancedSyntax('R:U')).toBe('r:uncommon');
      expect(parseAdvancedSyntax('R:R')).toBe('r:rare');
      expect(parseAdvancedSyntax('R:M')).toBe('r:mythic');
    });

    it('expands T: (type) shortcuts', () => {
      expect(parseAdvancedSyntax('T:C')).toBe('t:creature');
      expect(parseAdvancedSyntax('T:I')).toBe('t:instant');
      expect(parseAdvancedSyntax('T:S')).toBe('t:sorcery');
      expect(parseAdvancedSyntax('T:A')).toBe('t:artifact');
      expect(parseAdvancedSyntax('T:E')).toBe('t:enchantment');
      expect(parseAdvancedSyntax('T:P')).toBe('t:planeswalker');
      expect(parseAdvancedSyntax('T:L')).toBe('t:land');
    });

    it('expands F: (format) shortcuts', () => {
      expect(parseAdvancedSyntax('F:S')).toBe('f:standard');
      expect(parseAdvancedSyntax('F:M')).toBe('f:modern');
      expect(parseAdvancedSyntax('F:L')).toBe('f:legacy');
      expect(parseAdvancedSyntax('F:V')).toBe('f:vintage');
      expect(parseAdvancedSyntax('F:C')).toBe('f:commander');
      expect(parseAdvancedSyntax('F:P')).toBe('f:pioneer');
      expect(parseAdvancedSyntax('F:PA')).toBe('f:pauper');
    });

    it('handles A: (artist) with quotes', () => {
      expect(parseAdvancedSyntax('A:John')).toBe('a:"John"');
    });

    it('handles S: (set) lowercase', () => {
      expect(parseAdvancedSyntax('S:GRN')).toBe('s:grn');
    });

    it('parses mana cost shortcuts', () => {
      const result = parseAdvancedSyntax('2WW');

      expect(result).toContain('mv=4');
      expect(result).toContain('c:w');
    });

    it('handles mana cost with colorless', () => {
      const result = parseAdvancedSyntax('3C');

      expect(result).toContain('mv=4');
    });

    it('preserves non-shortcut text', () => {
      expect(parseAdvancedSyntax('t:creature c:w')).toBe('t:creature c:w');
      expect(parseAdvancedSyntax('is:commander')).toBe('is:commander');
    });

    it('handles mixed shortcuts and regular text', () => {
      const result = parseAdvancedSyntax('R:R T:C is:commander');

      expect(result).toContain('r:rare');
      expect(result).toContain('t:creature');
      expect(result).toContain('is:commander');
    });

    it('ignores invalid shortcuts', () => {
      const result = parseAdvancedSyntax('R:X T:invalid');

      expect(result).toContain('R:X');
      expect(result).toContain('T:invalid');
    });

    it('handles case insensitivity for shortcuts', () => {
      expect(parseAdvancedSyntax('r:c')).toBe('r:common');
      expect(parseAdvancedSyntax('t:i')).toBe('t:instant');
    });
  });

  describe('fetchRandomBgCardForType', () => {
    it('fetches background card data for a type', async () => {
      const card = createFakeScryfallCard({
        colors: ['W', 'U'],
        image_uris: {
          art_crop: 'https://cards.scryfall.io/art_crop/full.jpg',
          normal: 'https://cards.scryfall.io/normal/full.jpg',
          small: 'https://cards.scryfall.io/small/full.jpg',
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => card,
      });

      const result = await fetchRandomBgCardForType('creature');

      expect(result.artUrl).toBe('https://cards.scryfall.io/art_crop/full.jpg');
      expect(result.colors).toEqual(['W', 'U']);
    });

    it('returns empty on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchRandomBgCardForType('creature');

      expect(result.artUrl).toBe('');
      expect(result.colors).toEqual([]);
    });

    it('returns empty when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchRandomBgCardForType('lands');

      expect(result.artUrl).toBe('');
      expect(result.colors).toEqual([]);
    });

    it('handles split cards with card_faces', async () => {
      const splitCard = createFakeScryfallCard({
        colors: ['G'],
        image_uris: undefined,
        card_faces: [
          {
            name: 'Left',
            image_uris: {
              art_crop: 'https://cards.scryfall.io/art_crop/left.jpg',
              normal: 'https://cards.scryfall.io/normal/left.jpg',
              small: 'https://cards.scryfall.io/small/left.jpg',
            },
          },
        ],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => splitCard,
      });

      const result = await fetchRandomBgCardForType('creature');

      expect(result.artUrl).toBe('https://cards.scryfall.io/art_crop/left.jpg');
      expect(result.colors).toEqual(['G']);
    });

    it('catches exceptions during fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchRandomBgCardForType('creature');

      expect(result.artUrl).toBe('');
      expect(result.colors).toEqual([]);
    });
  });
});
