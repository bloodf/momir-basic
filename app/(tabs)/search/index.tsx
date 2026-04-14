import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { SlidersHorizontal, Search, LayoutList, LayoutGrid } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import {
  searchCards,
  autocompleteCardName,
  getLocalizedScryfallErrorMessage,
} from '@/services/scryfall';
import { CardListItem } from '@/components/CardListItem';
import { CardGridItem } from '@/components/CardGridItem';
import { SearchSkeleton, CardGridSkeleton } from '@/components/Skeleton';
import { useI18n } from '@/i18n';
import {
  SearchFilterState,
  EMPTY_FILTERS,
  getActiveFilterCount,
  buildFullQuery,
} from '@/components/SearchFilters';
import { ChipSearchInput } from '@/components/ChipSearchInput';
import { SearchFiltersDialog } from '@/components/SearchFiltersDialog';
import { showToast } from '@/components/Toast';

type ViewMode = 'list' | 'grid';
const CARDS_PER_PAGE = 175;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { locale, t } = useI18n();

  const searchParams = useLocalSearchParams<{ initialQuery?: string }>();
  const [query, setQuery] = useState('');
  const lastInitialQuery = useRef('');
  const [results, setResults] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilterState>(EMPTY_FILTERS);
  const [filterDialogVisible, setFilterDialogVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const lastSearchQuery = useRef('');
  const pendingInitialQuery = useRef<string | null>(null);

  const clearSearchResults = useCallback(() => {
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setHasSearched(false);
    setSuggestions([]);
    setCurrentPage(1);
    lastSearchQuery.current = '';
  }, []);

  if (searchParams.initialQuery && searchParams.initialQuery !== lastInitialQuery.current) {
    lastInitialQuery.current = searchParams.initialQuery;
    pendingInitialQuery.current = searchParams.initialQuery;
  }

  const totalPages = useMemo(() => Math.ceil(totalCount / CARDS_PER_PAGE), [totalCount]);

  const toggleAnim = useRef(new Animated.Value(0)).current;

  const handleViewModeToggle = useCallback(
    (mode: ViewMode) => {
      if (mode === viewMode) return;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setViewMode(mode);
      Animated.timing(toggleAnim, {
        toValue: mode === 'grid' ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [viewMode, toggleAnim]
  );

  const searchMutation = useMutation({
    mutationFn: async ({ q, page }: { q: string; page: number }) => {
      return searchCards(q, page, locale);
    },
    onSuccess: (data, variables) => {
      setSearchError(null);
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
    onError: (error, variables) => {
      const message = getLocalizedScryfallErrorMessage(error, t.errors);

      if (variables.page === 1) {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        setCurrentPage(1);
        setSearchError(message);
      } else {
        showToast({
          type: 'error',
          title: t.errors.fetchFailed,
          message,
        });
      }

      setHasSearched(true);
    },
  });

  React.useEffect(() => {
    if (pendingInitialQuery.current) {
      const q = pendingInitialQuery.current;
      pendingInitialQuery.current = null;
      setQuery(q);
      clearSearchResults();
      setFilters(EMPTY_FILTERS);
      setFilterDialogVisible(false);
      const fullQ = buildFullQuery(q, EMPTY_FILTERS);
      if (fullQ) {
        lastSearchQuery.current = fullQ;
        searchMutation.mutate({ q: fullQ, page: 1 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.initialQuery, clearSearchResults]);

  const autocompleteMutation = useMutation({
    mutationFn: async (q: string) => {
      return autocompleteCardName(q);
    },
    onSuccess: data => {
      setSuggestions(data.slice(0, 8));
    },
  });

  const handleSearch = useCallback(
    (searchQuery?: string) => {
      const textQ = searchQuery ?? query;
      const fullQ = buildFullQuery(textQ.trim(), filters);
      if (!fullQ) return;
      Keyboard.dismiss();
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSuggestions([]);
      setSearchError(null);
      lastSearchQuery.current = fullQ;
      searchMutation.mutate({ q: fullQ, page: 1 });
    },
    [query, filters, buildFullQuery, searchMutation]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || searchMutation.isPending) return;
    searchMutation.mutate({ q: lastSearchQuery.current, page: currentPage + 1 });
  }, [hasMore, searchMutation, currentPage]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (text.length >= 2) {
        autocompleteMutation.mutate(text);
      } else {
        setSuggestions([]);
      }
    },
    [autocompleteMutation]
  );

  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      setSuggestions([]);
      setSearchError(null);
      Keyboard.dismiss();
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      const fullQ = buildFullQuery(suggestion, filters);
      lastSearchQuery.current = fullQ;
      searchMutation.mutate({ q: fullQ, page: 1 });
    },
    [searchMutation, filters, buildFullQuery]
  );

  const handleCardPress = useCallback(
    (card: Card) => {
      router.push({ pathname: '/card', params: { cardJson: JSON.stringify(card) } });
    },
    [router]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    clearSearchResults();
  }, [clearSearchResults]);

  const handleFiltersChange = useCallback(
    (newFilters: SearchFilterState) => {
      setFilters(newFilters);
      if (query.trim().length === 0 && getActiveFilterCount(newFilters) === 0) {
        clearSearchResults();
      }
    },
    [clearSearchResults, query]
  );

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const renderListItem = useCallback(
    ({ item }: { item: Card }) => (
      <CardListItem card={item} onPress={handleCardPress} thumbnailVariant="art" />
    ),
    [handleCardPress]
  );

  const renderGridItem = useCallback(
    ({ item }: { item: Card }) => <CardGridItem card={item} onPress={handleCardPress} />,
    [handleCardPress]
  );

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${index}`, []);

  const showSuggestions = suggestions.length > 0 && !hasSearched;

  const isFirstPageLoading = searchMutation.isPending && currentPage <= 1 && results.length === 0;
  const isLoadingMore = searchMutation.isPending && results.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.search.title}</Text>
      </View>

      <View style={styles.searchRow}>
        <ChipSearchInput
          value={query}
          onChangeText={handleQueryChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          placeholder={t.search.placeholder}
        />
        <Pressable
          onPress={() => setFilterDialogVisible(true)}
          style={({ pressed }) => [
            styles.filterIconBtn,
            pressed && styles.filterIconBtnPressed,
            activeFilterCount > 0 && styles.filterIconBtnActive,
          ]}
          testID="filter-dialog-open"
        >
          <SlidersHorizontal
            size={18}
            color={activeFilterCount > 0 ? Colors.background : Colors.textMuted}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => handleSearch()}
          style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
          testID="search-submit"
        >
          <Text style={styles.searchBtnText}>{t.common.go}</Text>
        </Pressable>
      </View>

      <SearchFiltersDialog
        visible={filterDialogVisible}
        filters={filters}
        onChange={handleFiltersChange}
        onClose={() => setFilterDialogVisible(false)}
      />

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s}-${i}`}
              onPress={() => handleSuggestionTap(s)}
              style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
            >
              <Search size={13} color={Colors.textMuted} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {hasSearched && results.length === 0 && !searchMutation.isPending && searchError && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t.errors.fetchFailed}</Text>
          <Text style={styles.emptySubtitle}>{searchError}</Text>
          <Pressable
            onPress={() => handleSearch()}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryBtnText}>{t.common.retry}</Text>
          </Pressable>
        </View>
      )}

      {hasSearched && results.length === 0 && !searchMutation.isPending && !searchError && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t.search.noCardsFound}</Text>
          <Text style={styles.emptySubtitle}>{t.search.tryDifferentSearch}</Text>
        </View>
      )}

      {hasSearched && totalCount > 0 && (
        <View style={styles.resultBar}>
          <Text style={styles.resultCount}>{t.search.cardsFound(totalCount)}</Text>
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

      {isFirstPageLoading && (viewMode === 'list' ? <SearchSkeleton /> : <CardGridSkeleton />)}

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
                  <Text style={styles.pageInfo}>{t.search.page(currentPage, totalPages)}</Text>
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
              {isLoadingMore && <CardGridSkeleton />}
              {hasMore && !searchMutation.isPending && (
                <View style={styles.paginationRow}>
                  <Text style={styles.pageInfo}>{t.search.page(currentPage, totalPages)}</Text>
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
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconBtnPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  filterIconBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
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
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.gold,
  },
  retryBtnPressed: {
    backgroundColor: Colors.goldDark,
  },
  retryBtnText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: '700' as const,
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
