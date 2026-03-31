import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Trash2, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useHistory, useFilteredHistory } from '@/providers/HistoryProvider';
import { CardListItem } from '@/components/CardListItem';
import { useI18n } from '@/i18n';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearHistory, cards } = useHistory();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const filteredCards = useFilteredHistory(search);

  const handleCardPress = useCallback((card: Card) => {
    router.push({ pathname: '/card', params: { cardJson: JSON.stringify(card) } });
  }, [router]);

  const handleClear = useCallback(() => {
    Alert.alert(
      t.history.clearHistory,
      t.history.deleteAll(cards.length),
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.history.clearAll, style: 'destructive', onPress: clearHistory },
      ]
    );
  }, [cards.length, clearHistory, t]);

  const renderItem = useCallback(({ item }: { item: Card }) => (
    <CardListItem card={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${index}`, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.history.title}</Text>
        {cards.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={12} testID="clear-history">
            <Trash2 size={20} color={Colors.error} />
          </Pressable>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Search size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.history.searchPlaceholder}
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          testID="history-search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Text style={styles.countText}>
        {t.history.cardsCount(filteredCards.length, !search)}
      </Text>

      <FlatList
        data={filteredCards}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={filteredCards.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>
              {search ? t.history.noCardsFound : t.history.noCardsYet}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search ? t.history.tryDifferentSearch : t.history.castFirstCard}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        testID="history-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 10,
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
  countText: {
    color: Colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
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
    paddingHorizontal: 32,
  },
});
