import { CARD_TYPES, CARD_TYPE_QUERIES } from '@/constants/cardTypes';

describe('CARD_TYPE_QUERIES', () => {
  it('covers every defined card type exactly once', () => {
    const ids = CARD_TYPES.map((type) => type.id);
    const queryIds = Object.keys(CARD_TYPE_QUERIES).sort();

    expect(queryIds).toEqual([...ids].sort());
  });

  it('builds the expected commander query', () => {
    expect(CARD_TYPE_QUERIES.commander.buildQuery(4, true)).toBe(
      't:creature t:legendary is:commander mv=4 game:paper -st:funny -st:memorabilia -st:alchemy',
    );
  });

  it('builds non-cmc queries for instants and lands', () => {
    expect(CARD_TYPE_QUERIES.instants.buildQuery(99, false)).toBe('t:instant game:paper');
    expect(CARD_TYPE_QUERIES.lands.buildQuery(99, true)).toBe('t:land -t:basic game:paper -st:funny -st:memorabilia -st:alchemy');
  });
});
