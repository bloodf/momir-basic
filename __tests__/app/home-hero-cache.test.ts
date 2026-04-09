import { HERO_ART_WARM_CACHE_LIMIT, markHeroArtAsWarm } from '../../app/(tabs)/(home)/heroArtCache';

describe('hero art warm cache', () => {
  it('keeps only the most recent 15 warmed art urls', () => {
    const warmedOrder: string[] = [];
    const warmedLookup: Record<string, true> = {};

    for (let index = 1; index <= HERO_ART_WARM_CACHE_LIMIT + 1; index += 1) {
      markHeroArtAsWarm(warmedOrder, warmedLookup, `https://img.test/${index}.jpg`);
    }

    expect(warmedOrder).toHaveLength(HERO_ART_WARM_CACHE_LIMIT);
    expect(warmedLookup['https://img.test/1.jpg']).toBeUndefined();
    expect(warmedLookup[`https://img.test/${HERO_ART_WARM_CACHE_LIMIT + 1}.jpg`]).toBe(true);
  });

  it('refreshes an existing art url instead of duplicating it', () => {
    const warmedOrder = ['https://img.test/1.jpg', 'https://img.test/2.jpg'];
    const warmedLookup: Record<string, true> = {
      'https://img.test/1.jpg': true,
      'https://img.test/2.jpg': true,
    };

    markHeroArtAsWarm(warmedOrder, warmedLookup, 'https://img.test/1.jpg');

    expect(warmedOrder).toEqual([
      'https://img.test/2.jpg',
      'https://img.test/1.jpg',
    ]);
    expect(warmedLookup['https://img.test/1.jpg']).toBe(true);
    expect(warmedLookup['https://img.test/2.jpg']).toBe(true);
  });
});
