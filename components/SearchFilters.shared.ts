import { parseAdvancedSyntax } from '@/services/scryfall';

export interface SearchFilterState {
  colors: string[];
  type: string;
  cmcValue: string;
  cmcOperator: '=' | '<=' | '>=';
  rarity: string;
  format: string;
  set: string;
  artist: string;
}

export const EMPTY_FILTERS: SearchFilterState = {
  colors: [],
  type: '',
  cmcValue: '',
  cmcOperator: '=',
  rarity: '',
  format: '',
  set: '',
  artist: '',
};

export function getActiveFilterCount(filters: SearchFilterState): number {
  let count = 0;
  if (filters.colors.length > 0) count++;
  if (filters.type) count++;
  if (filters.cmcValue) count++;
  if (filters.rarity) count++;
  if (filters.format) count++;
  if (filters.set) count++;
  if (filters.artist) count++;
  return count;
}

export function buildFilterQuery(filters: SearchFilterState): string {
  const parts: string[] = [];
  const type = filters.type.trim();
  const cmcValue = filters.cmcValue.trim();
  const rarity = filters.rarity.trim();
  const format = filters.format.trim();
  const set = filters.set.trim();
  const artist = filters.artist.trim();

  if (filters.colors.length > 0) {
    const colorStr = filters.colors.join('');
    parts.push(`c:${colorStr}`);
  }

  if (type) {
    parts.push(`t:${type}`);
  }

  if (cmcValue) {
    const op = filters.cmcOperator === '=' ? '=' : filters.cmcOperator;
    parts.push(`mv${op}${cmcValue}`);
  }

  if (rarity) {
    parts.push(`r:${rarity}`);
  }

  if (format) {
    parts.push(`f:${format}`);
  }

  if (set) {
    parts.push(`s:${set.toLowerCase()}`);
  }

  if (artist) {
    parts.push(`a:"${artist}"`);
  }

  return parts.join(' ');
}

export function buildFullQuery(textQuery: string, filters: SearchFilterState): string {
  const parsedQuery = parseAdvancedSyntax(textQuery.trim()).trim();
  const filterQuery = buildFilterQuery(filters).trim();
  return [parsedQuery, filterQuery].filter(Boolean).join(' ');
}
