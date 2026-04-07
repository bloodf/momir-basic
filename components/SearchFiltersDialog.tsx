import React, { useState, useCallback, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { X } from 'lucide-react-native'
import Colors from '@/constants/colors'
import { useI18n } from '@/i18n'
import { FilterSections } from '@/components/SearchFilters'
import { type SearchFilterState, EMPTY_FILTERS } from '@/components/SearchFilters.shared'

interface Props {
  visible: boolean
  filters: SearchFilterState
  onChange: (next: SearchFilterState) => void
  onClose: () => void
}

export function SearchFiltersDialog({ visible, filters, onChange, onClose }: Props) {
  const { t } = useI18n()
  const [localFilters, setLocalFilters] = useState<SearchFilterState>(filters)

  // Sync local state when dialog opens with new external filters
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters)
    }
  }, [visible, filters])

  const handleReset = useCallback(() => {
    setLocalFilters(EMPTY_FILTERS)
  }, [])

  const handleApply = useCallback(() => {
    onChange(localFilters)
    onClose()
  }, [localFilters, onChange, onClose])

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleReset}
            hitSlop={8}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          >
            <Text style={styles.resetText}>{t.search.clearFilters}</Text>
          </Pressable>

          <Text style={styles.title}>{t.search.filters}</Text>

          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.headerBtn, styles.closeBtn, pressed && styles.headerBtnPressed]}
          >
            <X size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Body */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          <FilterSections filters={localFilters} onFiltersChange={setLocalFilters} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
          >
            <Text style={styles.applyBtnText}>{t.common.go}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 60,
  },
  headerBtnPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  closeBtn: {
    alignItems: 'flex-end',
  },
  resetText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  applyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnPressed: {
    backgroundColor: Colors.goldDark,
  },
  applyBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
})
