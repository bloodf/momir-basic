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
    printedName: data.printed_name ?? face?.printed_name,
    printedTypeLine: data.printed_type_line ?? face?.printed_type_line,
    printedText: data.printed_text ?? face?.printed_text,
    lang: data.lang,
  };
}

const LOCALE_TO_SCRYFALL_LANG: Record<string, string> = {
  en: 'en',
  pt: 'pt',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  ru: 'ru',
  zhs: 'zhs',
  zht: 'zht',
};

async function fetchLocalizedCard(cardId: string, lang: string): Promise<ScryfallCard | null> {
  const scryfallLang = LOCALE_TO_SCRYFALL_LANG[lang] ?? lang;
  const url = `${BASE_URL}/cards/${cardId}/${scryfallLang}`;
  console.log('[Scryfall] Fetching localized card:', url);

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      console.log('[Scryfall] Localized fetch failed:', response.status);
      return null;
    }
    return await response.json() as ScryfallCard;
  } catch (e) {
    console.log('[Scryfall] Localized fetch error:', e);
    return null;
  }
}

export async function fetchRandomCard(
  cardType: CardType,
  cmc: number,
  excludeFunny: boolean = true,
  retries: number = 3,
  lang?: string,
): Promise<Card> {
  const query = buildQuery(cardType, cmc, excludeFunny);
  const url = `${BASE_URL}/cards/random?q=${encodeURIComponent(query)}`;

  console.log('[Scryfall] Fetching:', url, lang ? `(lang: ${lang})` : '');

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

      if (lang && lang !== 'en') {
        const localized = await fetchLocalizedCard(data.id, lang);
        if (localized) {
          console.log('[Scryfall] Localized card found:', localized.printed_name ?? data.name);
          return mapScryfallCard(localized);
        }
        console.log('[Scryfall] No localized version, using English');
      }

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
  lang?: string,
): Promise<Card[]> {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = await fetchRandomCard(cardType, 0, excludeFunny, 3, lang);
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
  lang?: string,
): Promise<SearchResult> {
  const langFilter = lang && lang !== 'en' ? ` lang:${LOCALE_TO_SCRYFALL_LANG[lang] ?? lang}` : '';
  const fullQuery = langFilter ? `${query}${langFilter}` : query;
  const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(fullQuery)}&page=${page}&unique=cards`;
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

export interface CardPrinting {
  id: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  releasedAt: string;
  imageUrl: string;
}

export async function fetchCardPrintings(cardName: string): Promise<CardPrinting[]> {
  const query = `!"${cardName}" unique:prints`;
  const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}&order=released&dir=asc&unique=prints`;
  console.log('[Scryfall] Fetching printings:', url);

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      console.log('[Scryfall] Printings fetch failed:', response.status);
      return [];
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        set_name: string;
        set: string;
        collector_number: string;
        rarity: string;
        released_at?: string;
        image_uris?: { small: string };
        card_faces?: Array<{ image_uris?: { small: string } }>;
      }>;
    };

    return data.data.map(p => ({
      id: p.id,
      setName: p.set_name,
      setCode: p.set?.toUpperCase() ?? '',
      collectorNumber: p.collector_number,
      rarity: p.rarity,
      releasedAt: p.released_at ?? '',
      imageUrl: p.image_uris?.small ?? p.card_faces?.[0]?.image_uris?.small ?? '',
    }));
  } catch (e) {
    console.log('[Scryfall] Printings error:', e);
    return [];
  }
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  icon_svg_uri?: string;
}

export async function fetchSets(): Promise<ScryfallSet[]> {
  const url = `${BASE_URL}/sets`;
  console.log('[Scryfall] Fetching sets');

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) return [];
    const data = await response.json() as { data: ScryfallSet[] };
    const validTypes = ['core', 'expansion', 'masters', 'draft_innovation', 'commander', 'supplement'];
    return data.data
      .filter(s => validTypes.includes(s.set_type))
      .sort((a, b) => (b.released_at ?? '').localeCompare(a.released_at ?? ''));
  } catch (e) {
    console.log('[Scryfall] Sets fetch error:', e);
    return [];
  }
}

export function parseAdvancedSyntax(input: string): string {
  let query = input;

  const shortcuts: Record<string, Record<string, string>> = {
    'R': {
      'C': 'r:common', 'U': 'r:uncommon', 'R': 'r:rare', 'M': 'r:mythic',
    },
    'T': {
      'C': 't:creature', 'I': 't:instant', 'S': 't:sorcery', 'A': 't:artifact',
      'E': 't:enchantment', 'P': 't:planeswalker', 'L': 't:land',
    },
    'F': {
      'S': 'f:standard', 'M': 'f:modern', 'L': 'f:legacy', 'V': 'f:vintage',
      'C': 'f:commander', 'P': 'f:pioneer', 'PA': 'f:pauper',
    },
  };

  const parts = query.split(/\s+/);
  const processed: string[] = [];

  for (const part of parts) {
    const shortcutMatch = part.match(/^([RTFSA]):(.+)$/i);
    if (shortcutMatch) {
      const prefix = shortcutMatch[1].toUpperCase();
      const value = shortcutMatch[2].toUpperCase();

      if (prefix === 'A') {
        processed.push(`a:"${shortcutMatch[2]}"`);
        continue;
      }
      if (prefix === 'S') {
        processed.push(`s:${shortcutMatch[2].toLowerCase()}`);
        continue;
      }

      const map = shortcuts[prefix];
      if (map && map[value]) {
        processed.push(map[value]);
        continue;
      }
    }

    const manaCostMatch = part.match(/^(\d+)([WUBRGC]+)$/i);
    if (manaCostMatch) {
      const num = manaCostMatch[1];
      const colors = manaCostMatch[2].toUpperCase();
      const totalMv = parseInt(num, 10) + colors.length;
      processed.push(`mv=${totalMv}`);
      const colorChars = colors.replace(/C/g, '');
      if (colorChars.length > 0) {
        processed.push(`c:${colorChars.toLowerCase()}`);
      }
      continue;
    }

    processed.push(part);
  }

  return processed.join(' ');
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
