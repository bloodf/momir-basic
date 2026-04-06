import { describe, expect, it } from '@jest/globals';
import { Card } from '../../types';
import { getCardFaceDisplayData } from '../../utils/cardFaces';

const card: Card = {
  id: 'delver',
  name: 'Delver of Secrets',
  manaCost: '{U}',
  typeLine: 'Creature — Human Wizard',
  oracleText: 'At the beginning of your upkeep, look at the top card of your library...',
  power: '1',
  toughness: '1',
  scryfallUri: 'https://scryfall.com/card/delver',
  artCropUrl: 'https://img/front-art.jpg',
  normalImageUrl: 'https://img/front-normal.jpg',
  smallImageUrl: 'https://img/front-small.jpg',
  setName: 'Innistrad',
  setCode: 'isd',
  collectorNumber: '51',
  artist: 'Nils Hamm',
  flavorText: 'Stories are just as powerful as spells.',
  rarity: 'common',
  colors: ['U'],
  cmc: 1,
  fetchedAt: '2026-04-06T00:00:00.000Z',
  printedName: 'Delver of Secrets',
  printedTypeLine: 'Creature — Human Wizard',
  printedText: 'Printed front text',
  faces: [
    {
      name: 'Delver of Secrets',
      manaCost: '{U}',
      typeLine: 'Creature — Human Wizard',
      oracleText: 'Front oracle text',
      flavorText: 'Front flavor text',
      power: '1',
      toughness: '1',
      artist: 'Front Artist',
      printedName: 'Front Printed Name',
      printedTypeLine: 'Front Printed Type',
      printedText: 'Front printed text',
      image_uris: {
        art_crop: 'https://img/front-face-art.jpg',
        normal: 'https://img/front-face-normal.jpg',
        small: 'https://img/front-face-small.jpg',
      },
    },
    {
      name: 'Insectile Aberration',
      typeLine: 'Creature — Human Insect',
      oracleText: 'Flying',
      flavorText: 'Back flavor text',
      power: '3',
      toughness: '2',
      printedName: 'Back Printed Name',
      printedTypeLine: 'Back Printed Type',
      printedText: 'Back printed text',
      image_uris: {
        art_crop: 'https://img/back-face-art.jpg',
        normal: 'https://img/back-face-normal.jpg',
        small: 'https://img/back-face-small.jpg',
      },
    },
  ],
};

describe('getCardFaceDisplayData', () => {
  it('returns back-face fields and falls back to card artist when the face artist is missing', () => {
    const result = getCardFaceDisplayData(card, 1);

    expect(result.name).toBe('Insectile Aberration');
    expect(result.printedName).toBe('Back Printed Name');
    expect(result.typeLine).toBe('Creature — Human Insect');
    expect(result.printedTypeLine).toBe('Back Printed Type');
    expect(result.oracleText).toBe('Flying');
    expect(result.printedText).toBe('Back printed text');
    expect(result.flavorText).toBe('Back flavor text');
    expect(result.power).toBe('3');
    expect(result.toughness).toBe('2');
    expect(result.artist).toBe('Nils Hamm');
    expect(result.artCropUrl).toBe('https://img/back-face-art.jpg');
    expect(result.normalImageUrl).toBe('https://img/back-face-normal.jpg');
    expect(result.smallImageUrl).toBe('https://img/back-face-small.jpg');
  });

  it('falls back to top-level card fields when the requested face does not exist', () => {
    const result = getCardFaceDisplayData(card, 9);

    expect(result.name).toBe('Delver of Secrets');
    expect(result.printedName).toBe('Delver of Secrets');
    expect(result.typeLine).toBe('Creature — Human Wizard');
    expect(result.printedTypeLine).toBe('Creature — Human Wizard');
    expect(result.oracleText).toContain('At the beginning of your upkeep');
    expect(result.printedText).toBe('Printed front text');
    expect(result.artist).toBe('Nils Hamm');
    expect(result.artCropUrl).toBe('https://img/front-art.jpg');
  });
});
