import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/i18n';
import { ManaSymbol } from '@/components/ManaSymbol';
import { fetchSets } from '@/services/scryfall';
import { useQuery } from '@tanstack/react-query';

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

interface ColorOption {
  id: string;
  scryfallCode: string;
  color: string;
  borderColor: string;
}

interface FilterOption {
  id: string;
  scryfallCode: string;
}

interface Props {
  filters: SearchFilterState;
  onFiltersChange: (filters: SearchFilterState) => void;
  visible: boolean;
  onToggleVisible: () => void;
}

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

  if (filters.colors.length > 0) {
    const colorStr = filters.colors.join('');
    parts.push(`c:${colorStr}`);
  }

  if (filters.type) {
    parts.push(`t:${filters.type}`);
  }

  if (filters.cmcValue) {
    const op = filters.cmcOperator === '=' ? '=' : filters.cmcOperator;
    parts.push(`mv${op}${filters.cmcValue}`);
  }

  if (filters.rarity) {
    parts.push(`r:${filters.rarity}`);
  }

  if (filters.format) {
    parts.push(`f:${filters.format}`);
  }

  if (filters.set) {
    parts.push(`s:${filters.set.toLowerCase()}`);
  }

  if (filters.artist) {
    parts.push(`a:"${filters.artist}"`);
  }

  return parts.join(' ');
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'W', scryfallCode: 'W', color: Colors.mana.W, borderColor: '#d4c98a' },
  { id: 'U', scryfallCode: 'U', color: Colors.mana.U, borderColor: '#7ab8d4' },
  { id: 'B', scryfallCode: 'B', color: Colors.mana.B, borderColor: '#9a8878' },
  { id: 'R', scryfallCode: 'R', color: Colors.mana.R, borderColor: '#d08060' },
  { id: 'G', scryfallCode: 'G', color: Colors.mana.G, borderColor: '#6db08a' },
  { id: 'C', scryfallCode: 'C', color: Colors.mana.C, borderColor: '#9a9490' },
];

export const SearchFilters = React.memo(function SearchFilters({
  filters,
  onFiltersChange,
  visible,
  onToggleVisible,
}: Props) {
  const { t } = useI18n();
  const animValue = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [setSearch, setSetSearch] = useState('');
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);

  const setsQuery = useQuery({
    queryKey: ['scryfall-sets'],
    queryFn: fetchSets,
    staleTime: 1000 * 60 * 60,
  });

  const filteredSets = useMemo(() => {
    if (!setsQuery.data || !setSearch) return [];
    const lower = setSearch.toLowerCase();
    return setsQuery.data
      .filter(s => s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [setsQuery.data, setSearch]);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [visible, animValue]);

  const TYPE_OPTIONS: FilterOption[] = useMemo(() => [
    { id: 'creature', scryfallCode: 'creature' },
    { id: 'instant', scryfallCode: 'instant' },
    { id: 'sorcery', scryfallCode: 'sorcery' },
    { id: 'artifact', scryfallCode: 'artifact' },
    { id: 'enchantment', scryfallCode: 'enchantment' },
    { id: 'planeswalker', scryfallCode: 'planeswalker' },
    { id: 'land', scryfallCode: 'land' },
  ], []);

  const RARITY_OPTIONS: FilterOption[] = useMemo(() => [
    { id: 'common', scryfallCode: 'common' },
    { id: 'uncommon', scryfallCode: 'uncommon' },
    { id: 'rare', scryfallCode: 'rare' },
    { id: 'mythic', scryfallCode: 'mythic' },
  ], []);

  const FORMAT_OPTIONS: FilterOption[] = useMemo(() => [
    { id: 'standard', scryfallCode: 'standard' },
    { id: 'modern', scryfallCode: 'modern' },
    { id: 'legacy', scryfallCode: 'legacy' },
    { id: 'vintage', scryfallCode: 'vintage' },
    { id: 'commander', scryfallCode: 'commander' },
    { id: 'pioneer', scryfallCode: 'pioneer' },
    { id: 'pauper', scryfallCode: 'pauper' },
  ], []);

  const CMC_VALUES = useMemo(() => ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'], []);

  const typeLabels: Record<string, string> = useMemo(() => ({
    creature: t.search.typeCreature,
    instant: t.search.typeInstant,
    sorcery: t.search.typeSorcery,
    artifact: t.search.typeArtifact,
    enchantment: t.search.typeEnchantment,
    planeswalker: t.search.typePlaneswalker,
    land: t.search.typeLand,
  }), [t]);

  const rarityLabels: Record<string, string> = useMemo(() => ({
    common: t.search.rarityCommon,
    uncommon: t.search.rarityUncommon,
    rare: t.search.rarityRare,
    mythic: t.search.rarityMythic,
  }), [t]);

  const formatLabels: Record<string, string> = useMemo(() => ({
    standard: t.search.formatStandard,
    modern: t.search.formatModern,
    legacy: t.search.formatLegacy,
    vintage: t.search.formatVintage,
    commander: t.search.formatCommander,
    pioneer: t.search.formatPioneer,
    pauper: t.search.formatPauper,
  }), [t]);

  const activeCount = getActiveFilterCount(filters);

  const handleColorToggle = useCallback((colorCode: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const newColors = filters.colors.includes(colorCode)
      ? filters.colors.filter(c => c !== colorCode)
      : [...filters.colors, colorCode];
    onFiltersChange({ ...filters, colors: newColors });
  }, [filters, onFiltersChange]);

  const handleTypeSelect = useCallback((typeCode: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onFiltersChange({ ...filters, type: filters.type === typeCode ? '' : typeCode });
  }, [filters, onFiltersChange]);

  const handleCmcSelect = useCallback((value: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const cmcVal = value === '10+' ? '10' : value;
    const op = value === '10+' ? '>=' as const : filters.cmcOperator;
    onFiltersChange({
      ...filters,
      cmcValue: filters.cmcValue === cmcVal && (value !== '10+' || filters.cmcOperator === '>=') ? '' : cmcVal,
      cmcOperator: value === '10+' ? op : filters.cmcOperator,
    });
  }, [filters, onFiltersChange]);

  const handleCmcOperatorCycle = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const ops: Array<'=' | '<=' | '>='> = ['=', '<=', '>='];
    const idx = ops.indexOf(filters.cmcOperator);
    onFiltersChange({ ...filters, cmcOperator: ops[(idx + 1) % ops.length] });
  }, [filters, onFiltersChange]);

  const handleRaritySelect = useCallback((rarityCode: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onFiltersChange({ ...filters, rarity: filters.rarity === rarityCode ? '' : rarityCode });
  }, [filters, onFiltersChange]);

  const handleFormatSelect = useCallback((formatCode: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onFiltersChange({ ...filters, format: filters.format === formatCode ? '' : formatCode });
  }, [filters, onFiltersChange]);

  const handleSetSelect = useCallback((setCode: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onFiltersChange({ ...filters, set: filters.set === setCode ? '' : setCode });
    setSetSearch('');
  }, [filters, onFiltersChange]);

  const handleArtistChange = useCallback((text: string) => {
    onFiltersChange({ ...filters, artist: text });
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFiltersChange(EMPTY_FILTERS);
    setSetSearch('');
  }, [onFiltersChange]);

  const containerHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2000],
  });

  const containerOpacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View>
      <View style={styles.filterToggleRow}>
        <Pressable
          onPress={onToggleVisible}
          style={({ pressed }) => [styles.filterToggle, pressed && styles.filterTogglePressed]}
          testID="filter-toggle"
        >
          <View style={styles.filterToggleLeft}>
            <SlidersHorizontal size={15} color={activeCount > 0 ? Colors.gold : Colors.textMuted} />
            <Text style={[styles.filterToggleText, activeCount > 0 && styles.filterToggleTextActive]}>
              {visible ? t.search.hideFilters : t.search.filters}
            </Text>
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          {visible ? (
            <ChevronUp size={14} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={14} color={Colors.textMuted} />
          )}
        </Pressable>
      </View>

      <Animated.View style={[styles.filtersContainer, { maxHeight: containerHeight, opacity: containerOpacity }]}>
        <ScrollView
          showsVerticalScrollIndicator={true}
          bounces={true}
          nestedScrollEnabled
          style={{ maxHeight: 500 }}
        >
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.color}</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((opt) => {
                const isSelected = filters.colors.includes(opt.scryfallCode);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleColorToggle(opt.scryfallCode)}
                    style={[
                      styles.colorChip,
                      { borderColor: isSelected ? Colors.gold : opt.borderColor },
                      isSelected && styles.colorChipSelected,
                    ]}
                    testID={`filter-color-${opt.id}`}
                  >
                    <ManaSymbol symbol={`{${opt.id}}`} size={26} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.type}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const isSelected = filters.type === opt.scryfallCode;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => handleTypeSelect(opt.scryfallCode)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      testID={`filter-type-${opt.id}`}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {typeLabels[opt.id] ?? opt.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <View style={styles.cmcHeader}>
              <Text style={[styles.filterLabel, { marginBottom: 0 }]}>{t.search.cmc}</Text>
              {filters.cmcValue !== '' && (
                <Pressable onPress={handleCmcOperatorCycle} style={styles.cmcOperatorBtn}>
                  <Text style={styles.cmcOperatorText}>
                    {filters.cmcOperator === '=' ? t.search.cmcExact :
                     filters.cmcOperator === '<=' ? t.search.cmcLessOrEqual :
                     t.search.cmcGreaterOrEqual}
                  </Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {CMC_VALUES.map((val) => {
                  const cmcVal = val === '10+' ? '10' : val;
                  const isSelected = filters.cmcValue === cmcVal && (val !== '10+' || filters.cmcOperator === '>=');
                  return (
                    <Pressable
                      key={val}
                      onPress={() => handleCmcSelect(val)}
                      style={[styles.cmcChip, isSelected && styles.chipSelected]}
                      testID={`filter-cmc-${val}`}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{val}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.rarity}</Text>
            <View style={styles.chipRow}>
              {RARITY_OPTIONS.map((opt) => {
                const isSelected = filters.rarity === opt.scryfallCode;
                const rarityColor = Colors.rarity[opt.id as keyof typeof Colors.rarity] ?? Colors.textMuted;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleRaritySelect(opt.scryfallCode)}
                    style={[
                      styles.chip,
                      isSelected && { backgroundColor: rarityColor, borderColor: rarityColor },
                    ]}
                    testID={`filter-rarity-${opt.id}`}
                  >
                    <Text style={[
                      styles.chipText,
                      !isSelected && { color: rarityColor },
                      isSelected && styles.chipTextSelected,
                    ]}>
                      {rarityLabels[opt.id] ?? opt.id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.format}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {FORMAT_OPTIONS.map((opt) => {
                  const isSelected = filters.format === opt.scryfallCode;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => handleFormatSelect(opt.scryfallCode)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      testID={`filter-format-${opt.id}`}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {formatLabels[opt.id] ?? opt.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.set}</Text>
            {filters.set ? (
              <View style={styles.selectedSetRow}>
                <View style={styles.selectedSetChip}>
                  <Text style={styles.selectedSetCode}>{filters.set.toUpperCase()}</Text>
                  <Text style={styles.selectedSetName} numberOfLines={1}>
                    {setsQuery.data?.find(s => s.code === filters.set)?.name ?? filters.set}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleSetSelect(filters.set)}
                  hitSlop={8}
                  style={styles.removeSetBtn}
                >
                  <X size={14} color={Colors.error} />
                </Pressable>
              </View>
            ) : (
              <View>
                <View style={styles.textInputContainer}>
                  <Search size={13} color={Colors.textMuted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t.search.setPlaceholder}
                    placeholderTextColor={Colors.textMuted}
                    value={setSearch}
                    onChangeText={setSetSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                    testID="filter-set-input"
                  />
                </View>
                {filteredSets.length > 0 && (
                  <View style={styles.setDropdown}>
                    {filteredSets.map((s) => (
                      <Pressable
                        key={s.code}
                        onPress={() => handleSetSelect(s.code)}
                        style={({ pressed }) => [styles.setDropdownItem, pressed && styles.setDropdownItemPressed]}
                      >
                        <Text style={styles.setDropdownCode}>{s.code.toUpperCase()}</Text>
                        <Text style={styles.setDropdownName} numberOfLines={1}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t.search.artist}</Text>
            <View style={styles.textInputContainer}>
              <Search size={13} color={Colors.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder={t.search.artistPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={filters.artist}
                onChangeText={handleArtistChange}
                autoCorrect={false}
                autoCapitalize="none"
                testID="filter-artist-input"
              />
              {filters.artist.length > 0 && (
                <Pressable onPress={() => handleArtistChange('')} hitSlop={8}>
                  <X size={14} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => setShowSyntaxHelp(prev => !prev)}
            style={({ pressed }) => [styles.syntaxHelpToggle, pressed && { opacity: 0.7 }]}
          >
            <HelpCircle size={14} color={Colors.gold} />
            <Text style={styles.syntaxHelpToggleText}>
              {showSyntaxHelp ? t.search.hideSyntaxHelp : t.search.syntaxHelp}
            </Text>
          </Pressable>

          {showSyntaxHelp && (
            <View style={styles.syntaxHelpBox}>
              <Text style={styles.syntaxHelpTitle}>{t.search.advancedSearch}</Text>
              <Text style={styles.syntaxHelpDesc}>{t.search.advancedSearchHint}</Text>
              <View style={styles.syntaxTable}>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>R:M</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxRarity}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>T:C</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxType}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>F:S</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxFormat}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>S:neo</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxSet}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>A:Seb</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxArtist}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>c:WU</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxColor}</Text>
                </View>
                <View style={styles.syntaxRow}>
                  <Text style={styles.syntaxCode}>2RW</Text>
                  <Text style={styles.syntaxDesc}>{t.search.syntaxMana}</Text>
                </View>
              </View>
              <Text style={styles.syntaxExamples}>{t.search.syntaxExamples}</Text>
            </View>
          )}

          {activeCount > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
              testID="filter-clear-all"
            >
              <X size={13} color={Colors.error} />
              <Text style={styles.clearBtnText}>{t.search.clearFilters}</Text>
            </Pressable>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  filterToggleRow: {
    marginHorizontal: 16,
    marginBottom: 6,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTogglePressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  filterToggleTextActive: {
    color: Colors.gold,
  },
  filterBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  filtersContainer: {
    overflow: 'hidden',
    marginHorizontal: 16,
    paddingTop: 8,
  },
  filterSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.background,
  },
  cmcChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 38,
    alignItems: 'center',
  },
  cmcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cmcOperatorBtn: {
    backgroundColor: Colors.goldDark,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cmcOperatorText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },
  selectedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedSetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  selectedSetCode: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.background,
  },
  selectedSetName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  removeSetBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 83, 80, 0.12)',
  },
  setDropdown: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  setDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  setDropdownItemPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  setDropdownCode: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.gold,
    minWidth: 36,
  },
  setDropdownName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  syntaxHelpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  syntaxHelpToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  syntaxHelpBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  syntaxHelpTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    marginBottom: 4,
  },
  syntaxHelpDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  syntaxTable: {
    gap: 6,
  },
  syntaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syntaxCode: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.goldLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minWidth: 60,
    backgroundColor: 'rgba(232, 105, 45, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  syntaxDesc: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  syntaxExamples: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 10,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'rgba(239, 83, 80, 0.08)',
  },
  clearBtnPressed: {
    backgroundColor: 'rgba(239, 83, 80, 0.18)',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  bottomSpacer: {
    height: 10,
  },
});
