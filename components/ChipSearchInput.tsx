import React, { useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import { X } from 'lucide-react-native'
import Colors from '@/constants/colors'
import { ManaSymbol } from '@/components/ManaSymbol'
import { type SearchFilterState } from '@/components/SearchFilters.shared'
import { tokenize, applyTokens } from '@/utils/searchTokenizer'

interface Props {
  value: string
  onChangeText: (next: string) => void
  filters: SearchFilterState
  onFiltersChange: (next: SearchFilterState) => void
  placeholder?: string
  autoFocus?: boolean
}

type Pill =
  | { key: string; label: string; colorCode: string; kind: 'color'; index: number }
  | { key: string; label: string; kind: 'type' | 'rarity' | 'format' | 'set' | 'artist' | 'cmc' }

function buildPills(filters: SearchFilterState): Pill[] {
  const pills: Pill[] = []

  filters.colors.forEach((c, i) => {
    pills.push({ key: `color-${c}`, label: c, colorCode: c, kind: 'color', index: i })
  })

  if (filters.type) {
    const display = filters.type.charAt(0).toUpperCase() + filters.type.slice(1)
    pills.push({ key: 'type', label: `Type: ${display}`, kind: 'type' })
  }
  if (filters.cmcValue) {
    const opDisplay = filters.cmcOperator === '<=' ? '\u2264' : filters.cmcOperator === '>=' ? '\u2265' : '='
    pills.push({ key: 'cmc', label: `CMC: ${opDisplay}${filters.cmcValue}`, kind: 'cmc' })
  }
  if (filters.rarity) {
    const display = filters.rarity.charAt(0).toUpperCase() + filters.rarity.slice(1)
    pills.push({ key: 'rarity', label: `Rarity: ${display}`, kind: 'rarity' })
  }
  if (filters.format) {
    const display = filters.format.charAt(0).toUpperCase() + filters.format.slice(1)
    pills.push({ key: 'format', label: `Format: ${display}`, kind: 'format' })
  }
  if (filters.set) {
    pills.push({ key: 'set', label: `Set: ${filters.set.toUpperCase()}`, kind: 'set' })
  }
  if (filters.artist) {
    pills.push({ key: 'artist', label: `Artist: ${filters.artist}`, kind: 'artist' })
  }

  return pills
}

function removePill(pill: Pill, filters: SearchFilterState): SearchFilterState {
  switch (pill.kind) {
    case 'color':
      return { ...filters, colors: filters.colors.filter((_, i) => i !== pill.index) }
    case 'type':
      return { ...filters, type: '' }
    case 'cmc':
      return { ...filters, cmcValue: '', cmcOperator: '=' }
    case 'rarity':
      return { ...filters, rarity: '' }
    case 'format':
      return { ...filters, format: '' }
    case 'set':
      return { ...filters, set: '' }
    case 'artist':
      return { ...filters, artist: '' }
  }
}

function pillAccentColor(kind: Pill['kind'], colorCode?: string): string {
  if (kind === 'color' && colorCode) {
    return Colors.mana[colorCode as keyof typeof Colors.mana] ?? Colors.cardBackgroundLight
  }
  if (kind === 'rarity') return Colors.gold
  if (kind === 'cmc') return Colors.goldLight
  return Colors.cardBackgroundLight
}

export function ChipSearchInput({
  value,
  onChangeText,
  filters,
  onFiltersChange,
  placeholder,
  autoFocus,
}: Props) {
  const inputRef = useRef<TextInput>(null)
  const pills = buildPills(filters)

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      if (e.nativeEvent.key === 'Backspace' && value.length === 0 && pills.length > 0) {
        const lastPill = pills[pills.length - 1]
        onFiltersChange(removePill(lastPill, filters))
      }
    },
    [value, pills, filters, onFiltersChange],
  )

  const flushDraft = useCallback(
    (draft: string) => {
      if (!draft.trim()) return
      const tokens = tokenize(draft)
      const { filters: next, text } = applyTokens(tokens, filters)
      onFiltersChange(next)
      onChangeText(text)
    },
    [filters, onFiltersChange, onChangeText],
  )

  const handleChangeText = useCallback(
    (text: string) => {
      // Flush on space/tab/newline at the end
      if (text.endsWith(' ') || text.endsWith('\t') || text.endsWith('\n')) {
        flushDraft(text.trim())
      } else {
        onChangeText(text)
      }
    },
    [flushDraft, onChangeText],
  )

  const handleBlur = useCallback(() => {
    if (value.trim()) {
      flushDraft(value)
    }
  }, [value, flushDraft])

  return (
    <Pressable style={styles.container} onPress={focusInput}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {pills.map((pill) => {
          const accent = pillAccentColor(pill.kind, 'colorCode' in pill ? pill.colorCode : undefined)
          const isColor = pill.kind === 'color'
          return (
            <View
              key={pill.key}
              style={[
                styles.pill,
                { backgroundColor: isColor ? `${accent}22` : Colors.cardBackgroundLight },
                isColor && { borderColor: accent, borderWidth: 1 },
              ]}
            >
              {isColor ? (
                <ManaSymbol symbol={`{${(pill as Extract<Pill, { kind: 'color' }>).colorCode}}`} size={16} />
              ) : (
                <Text style={styles.pillText} numberOfLines={1}>
                  {pill.label}
                </Text>
              )}
              <Pressable
                onPress={() => onFiltersChange(removePill(pill, filters))}
                hitSlop={4}
                style={styles.pillRemove}
              >
                <X size={11} color={Colors.textMuted} />
              </Pressable>
            </View>
          )
        })}

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          placeholder={pills.length === 0 ? placeholder : undefined}
          placeholderTextColor={Colors.textMuted}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          testID="chip-search-input"
          underlineColorAndroid="transparent"
        />
      </ScrollView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 160,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  pillRemove: {
    padding: 2,
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    minWidth: 120,
    flex: 1,
    padding: 0,
    margin: 0,
  },
})
