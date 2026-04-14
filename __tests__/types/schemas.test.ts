import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { validateScryfallCard, getScryfallValidationError, ScryfallCardSchema } from '@/types/schemas';
import type { ScryfallCard } from '@/types';

describe('types/schemas', () => {
  const validCardData: ScryfallCard = {
    id: '6b99c6e3-9d9f-4e1a-ba7c-3e1c4c2a5d3e',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    flavor_text: 'The bolt was so quick, it struck before the lightning could even begin.',
    power: undefined,
    toughness: undefined,
    scryfall_uri: 'https://scryfall.com/card/lea/65/lightning-bolt',
    image_uris: {
      art_crop: 'https://cards.scryfall.io/art_crop/lea/65.jpg',
      normal: 'https://cards.scryfall.io/normal/lea/65.jpg',
      small: 'https://cards.scryfall.io/small/lea/65.jpg',
    },
    set_name: 'Limited Edition Alpha',
    set: 'lea',
    collector_number: '65',
    artist: 'Christopher Rush',
    rarity: 'common',
    colors: ['R'],
    cmc: 1,
    lang: 'en',
  };

  describe('validateScryfallCard', () => {
    it('Test 1: Valid ScryfallCard object passes schema validation', () => {
      const result = validateScryfallCard(validCardData);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(validCardData.id);
      expect(result?.name).toBe(validCardData.name);
      expect(result?.mana_cost).toBe(validCardData.mana_cost);
      expect(result?.type_line).toBe(validCardData.type_line);
      expect(result?.rarity).toBe(validCardData.rarity);
      expect(result?.cmc).toBe(validCardData.cmc);
    });

    it('Test 2: Card with missing optional fields (artist, flavor_text) passes', () => {
      const cardWithoutOptionalFields: ScryfallCard = {
        id: '6b99c6e3-9d9f-4e1a-ba7c-3e1c4c2a5d3e',
        name: 'Lightning Bolt',
        mana_cost: '{R}',
        type_line: 'Instant',
        oracle_text: 'Lightning Bolt deals 3 damage to any target.',
        power: undefined,
        toughness: undefined,
        scryfall_uri: 'https://scryfall.com/card/lea/65/lightning-bolt',
        image_uris: {
          art_crop: 'https://cards.scryfall.io/art_crop/lea/65.jpg',
          normal: 'https://cards.scryfall.io/normal/lea/65.jpg',
          small: 'https://cards.scryfall.io/small/lea/65.jpg',
        },
        set_name: 'Limited Edition Alpha',
        set: 'lea',
        collector_number: '65',
        artist: undefined,
        rarity: 'common',
        colors: ['R'],
        cmc: 1,
      };
      const result = validateScryfallCard(cardWithoutOptionalFields);
      expect(result).not.toBeNull();
      expect(result?.artist).toBeUndefined();
    });

    it('Test 3: Card with invalid id (non-UUID) fails validation', () => {
      const invalidIdCard = {
        ...validCardData,
        id: 'not-a-uuid',
      };
      const result = validateScryfallCard(invalidIdCard);
      expect(result).toBeNull();
    });

    it('Test 4: Card with missing required fields (id, name) fails validation', () => {
      const missingIdCard = { ...validCardData };
      delete (missingIdCard as Partial<ScryfallCard>).id;

      const result = validateScryfallCard(missingIdCard);
      expect(result).toBeNull();

      const missingNameCard = { ...validCardData };
      delete (missingNameCard as Partial<ScryfallCard>).name;

      const result2 = validateScryfallCard(missingNameCard);
      expect(result2).toBeNull();
    });

    it('Test 5: Double-faced card with card_faces array validates correctly', () => {
      const doubleFacedCard: ScryfallCard = {
        id: '6b99c6e3-9d9f-4e1a-ba7c-3e1c4c2a5d3e',
        name: 'Delver of Secrets',
        mana_cost: '{U}',
        type_line: 'Creature — Human Wizard',
        oracle_text: 'At the beginning of your upkeep, look at the top card of your library...',
        power: '1',
        toughness: '1',
        scryfall_uri: 'https://scryfall.com/card/isd/55/delver-of-secrets',
        set_name: 'Innistrad',
        set: 'isd',
        collector_number: '55',
        artist: 'Ryan Yee',
        rarity: 'uncommon',
        colors: ['U'],
        cmc: 1,
        card_faces: [
          {
            name: 'Delver of Secrets',
            mana_cost: '{U}',
            type_line: 'Creature — Human Wizard',
            oracle_text: 'At the beginning of your upkeep, look at the top card of your library...',
            power: '1',
            toughness: '1',
            artist: 'Ryan Yee',
            image_uris: {
              art_crop: 'https://cards.scryfall.io/art_crop/isd/55.jpg',
              normal: 'https://cards.scryfall.io/normal/isd/55.jpg',
              small: 'https://cards.scryfall.io/small/isd/55.jpg',
            },
          },
          {
            name: 'Insectile Aberration',
            mana_cost: undefined,
            type_line: 'Creature — Insect Horror',
            oracle_text: 'This creature gets +3/+3 and has flying as long as an opponent has 7...',
            power: '3',
            toughness: '2',
            image_uris: {
              art_crop: 'https://cards.scryfall.io/art_crop/isd/55b.jpg',
              normal: 'https://cards.scryfall.io/normal/isd/55b.jpg',
              small: 'https://cards.scryfall.io/small/isd/55b.jpg',
            },
          },
        ],
      };

      const result = validateScryfallCard(doubleFacedCard);
      expect(result).not.toBeNull();
      expect(result?.card_faces).toHaveLength(2);
      expect(result?.card_faces?.[0].name).toBe('Delver of Secrets');
      expect(result?.card_faces?.[1].name).toBe('Insectile Aberration');
    });

    it('accepts all valid rarity values from Scryfall', () => {
      const rarities: ScryfallCard['rarity'][] = ['common', 'uncommon', 'rare', 'mythic'];
      for (const rarity of rarities) {
        const result = validateScryfallCard({ ...validCardData, rarity });
        expect(result).not.toBeNull();
        expect(result?.rarity).toBe(rarity);
      }
    });

    it('allows passthrough of extra fields not in schema', () => {
      const extraFieldCard = {
        ...validCardData,
        some_extra_field: 'this should be allowed',
        another_unknown: 123,
      };
      const result = validateScryfallCard(extraFieldCard);
      expect(result).not.toBeNull();
    });

    it('validates image_uris as URLs', () => {
      const invalidImageCard = {
        ...validCardData,
        image_uris: {
          art_crop: 'not-a-url',
          normal: 'https://cards.scryfall.io/normal/lea/65.jpg',
          small: 'https://cards.scryfall.io/small/lea/65.jpg',
        },
      };
      const result = validateScryfallCard(invalidImageCard);
      expect(result).toBeNull();
    });

    it('validates scryfall_uri as URL', () => {
      const invalidUriCard = {
        ...validCardData,
        scryfall_uri: 'not-a-url',
      };
      const result = validateScryfallCard(invalidUriCard);
      expect(result).toBeNull();
    });

    it('validates cmc as number', () => {
      const invalidCmcCard = {
        ...validCardData,
        cmc: 'not-a-number' as unknown as number,
      };
      const result = validateScryfallCard(invalidCmcCard);
      expect(result).toBeNull();
    });

    it('validates colors as array of strings', () => {
      const invalidColorsCard = {
        ...validCardData,
        colors: 'not-an-array' as unknown as string[],
      };
      const result = validateScryfallCard(invalidColorsCard);
      expect(result).toBeNull();
    });

    it('accepts null for card_faces (single-faced card)', () => {
      const singleFacedCard = { ...validCardData, card_faces: undefined };
      const result = validateScryfallCard(singleFacedCard);
      expect(result).not.toBeNull();
      expect(result?.card_faces).toBeUndefined();
    });
  });

  describe('getScryfallValidationError', () => {
    it('returns ZodError for invalid data', () => {
      const invalidData = { ...validCardData, id: 'not-a-uuid' };
      const error = getScryfallValidationError(invalidData);
      expect(error).not.toBeNull();
      expect(error).toBeInstanceOf(z.ZodError);
    });

    it('returns null for valid data', () => {
      const error = getScryfallValidationError(validCardData);
      expect(error).toBeNull();
    });

    it('includes path information in error', () => {
      const invalidData = { ...validCardData, id: 'not-a-uuid' };
      const error = getScryfallValidationError(invalidData);
      expect(error).not.toBeNull();
      expect(error?.issues[0].path).toContain('id');
    });
  });

  describe('ScryfallCardSchema', () => {
    it('provides direct access to schema for advanced use', () => {
      const result = ScryfallCardSchema.safeParse(validCardData);
      expect(result.success).toBe(true);
    });
  });
});
