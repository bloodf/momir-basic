import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Search, X, TrendingUp, LayoutList, LayoutGrid } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { searchCards, autocompleteCardName, parseAdvancedSyntax } from '@/services/scryfall';
import { CardListItem } from '@/components/CardListItem';
import { CardGridItem } from '@/components/CardGridItem';
import { SearchSkeleton, CardGridSkeleton } from '@/components/Skeleton';
import { useI18n } from '@/i18n';
import {
  SearchFilters,
  SearchFilterState,
  EMPTY_FILTERS,
  getActiveFilterCount,
  buildFilterQuery,
} from '@/components/SearchFilters';

const POPULAR_SEARCHES = [
  'Lightning Bolt',
  'Black Lotus',
  'Jace, the Mind Sculptor',
  'Sol Ring',
  'Counterspell',
  'Tarmogoyf',
  'Birds of Paradise',
  'Path to Exile',
];

type ViewMode = 'list' | 'grid';
const CARDS_PER_PAGE = 175;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { locale, t } = useI18n();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilterState>(EMPTY_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const lastSearchQuery = useRef('');

  const totalPages = useMemo(() => Math.ceil(totalCount / CARDS_PER_PAGE), [totalCount]);

  const toggleAnim = useRef(new Animated.Value(0)).current;

  const handleViewModeToggle = useCallback((mode: ViewMode) => {
    if (mode === viewMode) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewMode(mode);
    Animated.timing(toggleAnim, {
      toValue: mode === 'grid' ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [viewMode, toggleAnim]);

  const buildFullQuery = useCallback((textQuery: string, currentFilters: SearchFilterState): string => {
    const parsed = parseAdvancedSyntax(textQuery);
    const filterStr = buildFilterQuery(currentFilters);
    const parts = [parsed, filterStr].filter(Boolean);
    return parts.join(' ');
  }, []);

  const searchMutation = useMutation({
    mutationFn: async ({ q, page }: { q: string; page: number }) => {
      return searchCards(q, page, locale);
    },
    onSuccess: (data, variables) => {
      if (variables.page === 1) {
        setResults(data.cards);
      } else {
        setResults(prev => [...prev, ...data.cards]);
      }
      setTotalCount(data.totalCards);
      setHasMore(data.hasMore);
      setCurrentPage(variables.page);
      setHasSearched(true);
      setSuggestions([]);
    },
    onError: (error) => {
      console.log('[Search] Error:', error);
      setHasSearched(true);
    },
  });

  const autocompleteMutation = useMutation({
    mutationFn: async (q: string) => {
      return autocompleteCardName(q);
    },
    onSuccess: (data) => {
      setSuggestions(data.slice(0, 8));
    },
  });

  const handleSearch = useCallback((searchQuery?: string) => {
    const textQ = searchQuery ?? query;
    const fullQ = buildFullQuery(textQ.trim(), filters);
    if (!fullQ) return;
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestions([]);
    lastSearchQuery.current = fullQ;
    searchMutation.mutate({ q: fullQ, page: 1 });
  }, [query, filters, buildFullQuery, searchMutation]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || searchMutation.isPending) return;
    searchMutation.mutate({ q: lastSearchQuery.current, page: currentPage + 1 });
  }, [hasMore, searchMutation, currentPage]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (text.length >= 2) {
      autocompleteMutation.mutate(text);
    } else {
      setSuggestions([]);
    }
  }, [autocompleteMutation]);

  const handleSuggestionTap = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const fullQ = buildFullQuery(suggestion, filters);
    lastSearchQuery.current = fullQ;
    searchMutation.mutate({ q: fullQ, page: 1 });
  }, [searchMutation, filters, buildFullQuery]);

  const handleCardPress = useCallback((card: Card) => {
    router.push({ pathname: '/card', params: { cardJson: JSON.stringify(card) } });
  }, [router]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setHasSearched(false);
    setSuggestions([]);
    setCurrentPage(1);
    inputRef.current?.focus();
  }, []);

  const handleFiltersChange = useCallback((newFilters: SearchFilterState) => {
    setFilters(newFilters);
  }, []);

  const handleToggleFilters = useCallback(() => {
    setFiltersVisible(prev => !prev);
  }, []);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const renderListItem = useCallback(({ item }: { item: Card }) => (
    <CardListItem card={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  const renderGridItem = useCallback(({ item }: { item: Card }) => (
    <CardGridItem card={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${index}`, []);

  const showSuggestions = suggestions.length > 0 && !hasSearched;
  const showPopular = !hasSearched && results.length === 0 && query.length === 0 && !filtersVisible;
  const isFirstPageLoading = searchMutation.isPending && currentPage <= 1 && results.length === 0;
  const isLoadingMore = searchMutation.isPending && results.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.search.title}</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t.search.placeholder}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => handleSearch()}
          style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
          testID="search-submit"
        >
          <Text style={styles.searchBtnText}>{t.common.go}</Text>
        </Pressable>
      </View>

      <SearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        visible={filtersVisible}
        onToggleVisible={handleToggleFilters}
      />

      {activeFilterCount > 0 && !filtersVisible && (
        <Text style={styles.activeFiltersHint}>
          {t.search.activeFilters(activeFilterCount)}
        </Text>
      )}

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s}-${i}`}
              onPress={() => handleSuggestionTap(s)}
              style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
            >
              <Search size={13} color={Colors.textMuted} />
              <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {showPopular && (
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <TrendingUp size={14} color={Colors.gold} />
            <Text style={styles.popularTitle}>{t.search.popularSearches}</Text>
          </View>
          <View style={styles.popularChips}>
            {POPULAR_SEARCHES.map((s) => (
              <Pressable
                key={s}
                onPress={() => handleSuggestionTap(s)}
                style={({ pressed }) => [styles.popularChip, pressed && styles.popularChipPressed]}
              >
                <Text style={styles.popularChipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {hasSearched && results.length === 0 && !searchMutation.isPending && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t.search.noCardsFound}</Text>
          <Text style={styles.emptySubtitle}>{t.search.tryDifferentSearch}</Text>
        </View>
      )}

      {hasSearched && totalCount > 0 && (
        <View style={styles.resultBar}>
          <Text style={styles.resultCount}>
            {t.search.cardsFound(totalCount)}
          </Text>
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => handleViewModeToggle('list')}
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              testID="view-mode-list"
            >
              <LayoutList size={15} color={viewMode === 'list' ? Colors.gold : Colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => handleViewModeToggle('grid')}
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              testID="view-mode-grid"
            >
              <LayoutGrid size={15} color={viewMode === 'grid' ? Colors.gold : Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      )}

      {isFirstPageLoading && (
        viewMode === 'list' ? <SearchSkeleton /> : <CardGridSkeleton />
      )}

      {results.length > 0 && viewMode === 'list' && (
        <FlatList
          data={results}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            <>
              {isLoadingMore && (
                <View style={styles.loadingMore}>
                  <SearchSkeleton />
                </View>
              )}
              {hasMore && !searchMutation.isPending && (
                <View style={styles.paginationRow}>
                  <Text style={styles.pageInfo}>
                    {t.search.page(currentPage, totalPages)}
                  </Text>
                </View>
              )}
            </>
          }
          testID="search-results"
        />
      )}

      {results.length > 0 && viewMode === 'grid' && (
        <FlatList
          data={results}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            <>
              {isLoadingMore && (
                <CardGridSkeleton />
              )}
              {hasMore && !searchMutation.isPending && (
                <View style={styles.paginationRow}>
                  <Text style={styles.pageInfo}>
                    {t.search.page(currentPage, totalPages)}
                  </Text>
                </View>
              )}
            </>
          }
          testID="search-results-grid"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  searchBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
  },
  searchBtnPressed: {
    backgroundColor: Colors.goldDark,
  },
  searchBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  activeFiltersHint: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 4,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestionPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  suggestionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  popularSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popularTitle: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  popularChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  popularChipPressed: {
    backgroundColor: Colors.cardBackgroundLight,
    borderColor: Colors.gold,
  },
  popularChipText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  resultCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: 'rgba(232,105,45,0.15)',
  },
  gridRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  loadingMore: {
    paddingVertical: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  pageInfo: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageNavBtnPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  pageNavBtnDisabled: {
    opacity: 0.35,
  },
  pageNavText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pageNavTextDisabled: {
    color: Colors.textMuted,
  },
});
