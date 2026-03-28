import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Search, X, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { searchCards, autocompleteCardName } from '@/services/scryfall';
import { CardListItem } from '@/components/CardListItem';

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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async ({ q, page }: { q: string; page: number }) => {
      return searchCards(q, page);
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
    const q = searchQuery ?? query;
    if (!q.trim()) return;
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestions([]);
    searchMutation.mutate({ q: q.trim(), page: 1 });
  }, [query, searchMutation]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || searchMutation.isPending) return;
    searchMutation.mutate({ q: query.trim(), page: currentPage + 1 });
  }, [hasMore, searchMutation, query, currentPage]);

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
    searchMutation.mutate({ q: suggestion, page: 1 });
  }, [searchMutation]);

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
    inputRef.current?.focus();
  }, []);

  const renderItem = useCallback(({ item }: { item: Card }) => (
    <CardListItem card={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${index}`, []);

  const showSuggestions = suggestions.length > 0 && !hasSearched;
  const showPopular = !hasSearched && results.length === 0 && query.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search any Magic card..."
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
          <Text style={styles.searchBtnText}>Go</Text>
        </Pressable>
      </View>

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
            <Text style={styles.popularTitle}>Popular Searches</Text>
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
          <Text style={styles.emptyTitle}>No cards found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term or check your spelling</Text>
        </View>
      )}

      {hasSearched && totalCount > 0 && (
        <Text style={styles.resultCount}>
          {totalCount.toLocaleString()} card{totalCount !== 1 ? 's' : ''} found
        </Text>
      )}

      {results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            searchMutation.isPending && currentPage > 1 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={Colors.gold} size="small" />
              </View>
            ) : null
          }
          testID="search-results"
        />
      )}

      {searchMutation.isPending && currentPage === 1 && (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.loadingText}>Searching Scryfall...</Text>
        </View>
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
    paddingHorizontal: 20,
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
    gap: 8,
    marginBottom: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    paddingHorizontal: 18,
    paddingVertical: 12,
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
    marginTop: 4,
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
    paddingHorizontal: 20,
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
  resultCount: {
    color: Colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
