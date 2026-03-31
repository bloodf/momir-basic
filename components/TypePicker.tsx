import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CARD_TYPES } from '@/constants/cardTypes';
import { CardType } from '@/types';
import { useI18n } from '@/i18n';

interface TypePickerProps {
  visible: boolean;
  selected: CardType;
  onSelect: (type: CardType) => void;
  onClose: () => void;
}

export const TypePicker = memo(function TypePicker({ visible, selected, onSelect, onClose }: TypePickerProps) {
  const { t } = useI18n();
  const handleSelect = useCallback((type: CardType) => {
    onSelect(type);
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.card.cardType}</Text>
            <Pressable onPress={onClose} hitSlop={12} testID="type-picker-close">
              <X size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.handle} />
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {CARD_TYPES.map(ct => {
              const isSelected = ct.id === selected;
              return (
                <Pressable
                  key={ct.id}
                  onPress={() => handleSelect(ct.id)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && styles.itemSelected,
                    pressed && styles.itemPressed,
                  ]}
                  testID={`type-picker-${ct.id}`}
                >
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                      {t.cardTypes[ct.id as keyof typeof t.cardTypes] ?? ct.label}
                    </Text>
                    <Text style={styles.itemDescription}>{t.cardTypeDescriptions[ct.id as keyof typeof t.cardTypeDescriptions] ?? ct.description}</Text>
                  </View>
                  {ct.multiCard && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>×{ct.count}</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={isSelected ? Colors.gold : Colors.textMuted} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    position: 'absolute',
    top: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 10,
  },
  itemSelected: {
    backgroundColor: 'rgba(232,105,45,0.1)',
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  itemLabelSelected: {
    color: Colors.gold,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  badge: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
