import type { Card } from '@/types';

describe('useHistoryStore', () => {
  const loadMMKVMock = () => require('react-native-mmkv') as {
    __resetMMKVMock: () => void;
  };
  const loadHistoryStoreModule = () => require('@/stores/historyStore') as typeof import('@/stores/historyStore');

  const sampleCard = (id: string, overrides: Partial<Card> = {}): Card => ({
    id,
    name: `Card ${id}`,
    manaCost: '{1}',
    typeLine: 'Creature — Test',
    oracleText: 'Sample rules text',
    scryfallUri: `https://scryfall.com/card/${id}`,
    artCropUrl: `https://img.test/${id}/art.jpg`,
    normalImageUrl: `https://img.test/${id}/normal.jpg`,
    smallImageUrl: `https://img.test/${id}/small.jpg`,
    setName: 'Test Set',
    setCode: 'tst',
    collectorNumber: id,
    rarity: 'common',
    colors: [],
    cmc: 1,
    fetchedAt: '2026-04-13T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.resetModules();
    loadMMKVMock().__resetMMKVMock();
    jest.clearAllMocks();
  });

  it('starts with an empty history', () => {
    const { useHistoryStore } = loadHistoryStoreModule();

    expect(useHistoryStore.getState().cards).toEqual([]);
  });

  it('adds a card to the front of history', () => {
    const { useHistoryStore } = loadHistoryStoreModule();
    const card = sampleCard('1');

    useHistoryStore.getState().addCard(card);

    expect(useHistoryStore.getState().cards).toEqual([card]);
  });

  it('adds multiple cards ahead of the existing history', () => {
    const { useHistoryStore } = loadHistoryStoreModule();
    const first = sampleCard('1');
    const second = sampleCard('2');
    const third = sampleCard('3');

    useHistoryStore.getState().addCard(first);
    useHistoryStore.getState().addCards([second, third]);

    expect(useHistoryStore.getState().cards).toEqual([second, third, first]);
  });

  it('removes a card by id', () => {
    const { useHistoryStore } = loadHistoryStoreModule();
    const first = sampleCard('1');
    const second = sampleCard('2');

    useHistoryStore.getState().addCards([first, second]);
    useHistoryStore.getState().removeCard('1');

    expect(useHistoryStore.getState().cards).toEqual([second]);
  });

  it('clears the full history', () => {
    const { useHistoryStore } = loadHistoryStoreModule();

    useHistoryStore.getState().addCards([sampleCard('1'), sampleCard('2')]);
    useHistoryStore.getState().clearHistory();

    expect(useHistoryStore.getState().cards).toEqual([]);
  });

  it('persists history across store recreation', () => {
    const first = loadHistoryStoreModule();
    const card = sampleCard('persisted');
    first.useHistoryStore.getState().addCard(card);

    jest.resetModules();
    const second = loadHistoryStoreModule();

    expect(second.useHistoryStore.getState().cards).toEqual([card]);
  });

  it('filters history by search, type, and cmc', () => {
    const { useHistoryStore, filterHistory } = loadHistoryStoreModule();
    const creature = sampleCard('1', { name: 'Goblin Guide', typeLine: 'Creature — Goblin Scout', cmc: 1 });
    const artifact = sampleCard('2', { name: 'Sol Ring', typeLine: 'Artifact', cmc: 1 });
    const dragon = sampleCard('3', { name: 'Ancient Dragon', typeLine: 'Creature — Dragon', cmc: 7 });

    useHistoryStore.getState().addCards([creature, artifact, dragon]);

    expect(filterHistory(useHistoryStore.getState().cards, 'dragon')).toEqual([dragon]);
    expect(filterHistory(useHistoryStore.getState().cards, '', 'artifact')).toEqual([artifact]);
    expect(filterHistory(useHistoryStore.getState().cards, '', undefined, 1)).toEqual([creature, artifact]);
  });
});
