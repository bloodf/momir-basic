import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { X, Download, Share2 } from 'lucide-react-native';
import type { Card } from '@/types';
import type { CardFaceDisplayData } from '@/utils/cardFaces';
import { styles } from './styles';

interface FullCardModalProps {
  visible: boolean;
  displayCard: CardFaceDisplayData;
  card: Card;
  opacity: Animated.Value;
  insets: { top: number; bottom: number };
  onClose: () => void;
  artByLabel: string;
}

export function FullCardModal({
  visible,
  displayCard,
  card,
  opacity,
  insets,
  onClose,
  artByLabel,
}: FullCardModalProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalWrap, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Image
            source={{ uri: displayCard.normalImageUrl || displayCard.artCropUrl }}
            style={styles.modalImage}
            contentFit="contain"
            transition={200}
          />
          <Pressable onPress={onClose} style={[styles.modalClose, { top: insets.top + 12 }]}>
            <X size={22} color="#fff" />
          </Pressable>
          <View style={styles.modalFooter}>
            <Text style={styles.modalName}>{displayCard.printedName ?? displayCard.name}</Text>
            <Text style={styles.modalMeta}>
              {card.setName} · #{card.collectorNumber}
              {displayCard.artist ? ` · ${artByLabel}` : ''}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

interface ArtViewModalProps {
  visible: boolean;
  displayCard: CardFaceDisplayData;
  opacity: Animated.Value;
  insets: { top: number; bottom: number };
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  downloadLabel: string;
  shareLabel: string;
}

export function ArtViewModal({
  visible,
  displayCard,
  opacity,
  insets,
  onClose,
  onDownload,
  onShare,
  downloadLabel,
  shareLabel,
}: ArtViewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.artModalWrap, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.artModalContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Image
            source={{ uri: displayCard.artCropUrl }}
            style={styles.artModalImage}
            contentFit="contain"
            transition={200}
          />
          <Pressable onPress={onClose} style={[styles.artModalClose, { top: insets.top + 12 }]}>
            <X size={22} color="#fff" />
          </Pressable>
          <View style={styles.artModalFooter}>
            <Text style={styles.artModalTitle}>{displayCard.printedName ?? displayCard.name}</Text>
            {displayCard.artist && <Text style={styles.artModalArtist}>{displayCard.artist}</Text>}
            <View style={styles.artModalActions}>
              <Pressable onPress={onDownload} style={styles.artModalBtn}>
                <Download size={18} color="#fff" />
                <Text style={styles.artModalBtnText}>{downloadLabel}</Text>
              </Pressable>
              <Pressable onPress={onShare} style={styles.artModalBtn}>
                <Share2 size={18} color="#fff" />
                <Text style={styles.artModalBtnText}>{shareLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
