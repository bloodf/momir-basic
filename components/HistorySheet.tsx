import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Card } from '@/types';
import { useHistory, useFilteredHistory } from '@/providers/HistoryProvider';
import { CardListItem } from '@/components/CardListItem';
import { useI18n } from '@/i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DISMISS_THRESHOLD = 120;

interface HistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function HistorySheet({ visible, onClose }: HistorySheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearHistory, cards } = useHistory();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const filteredCards = useFilteredHistory(search);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
        setSearch('');
      });
    }
  }, [visible, isRendered, translateY, backdropOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onClose();
  }, [onClose]);

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
    <CardListItem card={item} onPress={handleCardPress} thumbnailVariant="art" />
  ), [handleCardPress]);

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${index}`, []);

  if (!isRendered) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{t.history.title}</Text>
          <View style={styles.headerActions}>
            {cards.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={12} testID="clear-history" style={styles.headerBtn}>
                <Trash2 size={18} color={Colors.error} />
              </Pressable>
            )}
            <Pressable onPress={handleClose} hitSlop={12} testID="close-history" style={styles.closeBtn}>
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={15} color={Colors.textMuted} />
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
              <X size={15} color={Colors.textMuted} />
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
          keyboardShouldPersistTaps="handled"
          testID="history-list"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,83,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  countText: {
    color: Colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
});
