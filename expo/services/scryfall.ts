import { Card, CardType, ScryfallCard } from '@/types';

const BASE_URL = 'https://api.scryfall.com';
const HEADERS = {
  'User-Agent': 'Momir-Basic-App/1.0',
  'Accept': 'application/json',
};

const RATE_LIMIT_MS = 100;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: HEADERS });
}

function buildQuery(cardType: CardType, cmc: number, excludeFunny: boolean): string {
  const base = excludeFunny ? 'game:paper -st:funny -st:memorabilia -st:alchemy' : 'game:paper';

  switch (cardType) {
    case 'creature':
      return `t:creature mv=${cmc} ${base}`;
    case 'commander':
      return `t:creature t:legendary is:commander mv=${cmc} ${base}`;
    case 'artifact':
      return `t:artifact mv=${cmc} ${base}`;
    case 'equipment':
      return `t:equipment mv=${cmc} ${base}`;
    case 'enchantment':
      return `t:enchantment mv=${cmc} ${base}`;
    case 'aura':
      return `t:aura mv=${cmc} ${base}`;
    case 'instants':
      return `t:instant ${base}`;
    case 'sorceries':
      return `t:sorcery ${base}`;
    case 'lands':
      return `t:land -t:basic ${base}`;
    default:
      return `t:creature mv=${cmc} ${base}`;
  }
}

function getTypeQueryFragment(cardType: CardType): string {
  switch (cardType) {
    case 'creature': return 't:creature';
    case 'commander': return 't:creature t:legendary';
    case 'artifact': return 't:artifact';
    case 'equipment': return 't:equipment';
    case 'enchantment': return 't:enchantment';
    case 'aura': return 't:aura';
    case 'instants': return 't:instant';
    case 'sorceries': return 't:sorcery';
    case 'lands': return 't:land -t:basic';
    default: return 't:creature';
  }
}

function mapScryfallCard(data: ScryfallCard): Card {
  const face = data.card_faces?.[0];
  const imageUris = data.image_uris ?? face?.image_uris;

  return {
    id: data.id,
    name: data.name,
    manaCost: data.mana_cost ?? face?.mana_cost ?? '',
    typeLine: data.type_line ?? face?.type_line ?? '',
    oracleText: data.oracle_text ?? face?.oracle_text ?? '',
    flavorText: data.flavor_text ?? face?.flavor_text,
    power: data.power ?? face?.power,
    toughness: data.toughness ?? face?.toughness,
    scryfallUri: data.scryfall_uri,
    artCropUrl: imageUris?.art_crop ?? '',
    normalImageUrl: imageUris?.normal ?? '',
    smallImageUrl: imageUris?.small ?? '',
    setName: data.set_name,
    setCode: data.set?.toUpperCase() ?? '',
    collectorNumber: data.collector_number ?? '',
    artist: data.artist ?? face?.artist,
    rarity: (['common', 'uncommon', 'rare', 'mythic'].includes(data.rarity)
      ? data.rarity
      : 'common') as Card['rarity'],
    colors: data.colors ?? [],
    cmc: data.cmc,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchRandomCard(
  cardType: CardType,
  cmc: number,
  excludeFunny: boolean = true,
  retries: number = 3,
): Promise<Card> {
  const query = buildQuery(cardType, cmc, excludeFunny);
  const url = `${BASE_URL}/cards/random?q=${encodeURIComponent(query)}`;

  console.log('[Scryfall] Fetching:', url);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await rateLimitedFetch(url);

      if (response.status === 404) {
        console.log(`[Scryfall] 404 on attempt ${attempt + 1}/${retries}`);
        if (attempt === retries - 1) {
          throw new Error(`No ${cardType} found at CMC ${cmc}`);
        }
        continue;
      }

      if (response.status === 429) {
        console.log('[Scryfall] Rate limited, waiting 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status}`);
      }

      const data: ScryfallCard = await response.json();
      console.log('[Scryfall] Got card:', data.name);
      return mapScryfallCard(data);
    } catch (error) {
      if (attempt === retries - 1) throw error;
      console.log(`[Scryfall] Retry ${attempt + 1}/${retries}:`, error);
    }
  }

  throw new Error('Failed to fetch card after all retries');
}

export async function fetchMultipleCards(
  cardType: CardType,
  count: number,
  excludeFunny: boolean = true,
): Promise<Card[]> {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = await fetchRandomCard(cardType, 0, excludeFunny);
    cards.push(card);
  }
  return cards;
}

export interface SearchResult {
  cards: Card[];
  totalCards: number;
  hasMore: boolean;
  nextPageUrl: string | null;
}

export async function searchCards(
  query: string,
  page: number = 1,
): Promise<SearchResult> {
  const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}&page=${page}&unique=cards`;
  console.log('[Scryfall] Search:', url);

  const response = await rateLimitedFetch(url);

  if (response.status === 404) {
    return { cards: [], totalCards: 0, hasMore: false, nextPageUrl: null };
  }

  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return searchCards(query, page);
  }

  if (!response.ok) {
    throw new Error(`Scryfall search error: ${response.status}`);
  }

  const data = await response.json() as {
    data: ScryfallCard[];
    total_cards: number;
    has_more: boolean;
    next_page?: string;
  };

  return {
    cards: data.data.map(mapScryfallCard),
    totalCards: data.total_cards,
    hasMore: data.has_more,
    nextPageUrl: data.next_page ?? null,
  };
}

export async function autocompleteCardName(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  const url = `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`;
  console.log('[Scryfall] Autocomplete:', url);

  const response = await rateLimitedFetch(url);
  if (!response.ok) return [];

  const data = await response.json() as { data: string[] };
  return data.data ?? [];
}

export interface BgCardData {
  artUrl: string;
  colors: string[];
}

export async function fetchRandomBgCardForType(cardType: CardType): Promise<BgCardData> {
  const typeFragment = getTypeQueryFragment(cardType);
  const query = `${typeFragment} is:highres game:paper`;
  const url = `${BASE_URL}/cards/random?q=${encodeURIComponent(query)}`;
  console.log('[Scryfall] BG card for type:', cardType, url);

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      return { artUrl: '', colors: [] };
    }
    const data: ScryfallCard = await response.json();
    const imageUris = data.image_uris ?? data.card_faces?.[0]?.image_uris;
    return {
      artUrl: imageUris?.art_crop ?? '',
      colors: data.colors ?? [],
    };
  } catch (e) {
    console.log('[Scryfall] BG fetch error:', e);
    return { artUrl: '', colors: [] };
  }
}
