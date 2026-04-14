import React from 'react';
import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Plus, X } from 'lucide-react-native';

import Colors from '@/constants/colors';

import { styles } from '../printerSetup.styles';

interface TcpPrinterModalProps {
  visible: boolean;
  tcpHost: string;
  tcpPort: string;
  tcpAdding: boolean;
  onClose: () => void;
  onAddPrinter: () => void;
  onChangeHost: (value: string) => void;
  onChangePort: (value: string) => void;
}

export function TcpPrinterModal({
  visible,
  tcpHost,
  tcpPort,
  tcpAdding,
  onClose,
  onAddPrinter,
  onChangeHost,
  onChangePort,
}: TcpPrinterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.tcpModalOverlay}>
        <View style={styles.tcpModalContent}>
          <View style={styles.tcpModalHeader}>
            <Text style={styles.tcpModalTitle}>Add TCP/IP Printer</Text>
            <Pressable onPress={onClose} style={styles.tcpModalClose}>
              <X size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.tcpModalDesc}>
            Enter the hostname or IP address of your TCP-enabled thermal printer. Default port is
            9100.
          </Text>
          <View style={styles.tcpFormField}>
            <Text style={styles.tcpFormLabel}>Hostname / IP Address</Text>
            <TextInput
              style={styles.tcpFormInput}
              value={tcpHost}
              onChangeText={onChangeHost}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.tcpFormField}>
            <Text style={styles.tcpFormLabel}>Port</Text>
            <TextInput
              style={styles.tcpFormInput}
              value={tcpPort}
              onChangeText={onChangePort}
              placeholder="9100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            onPress={onAddPrinter}
            disabled={tcpAdding}
            style={({ pressed }) => [
              styles.tcpAddButton,
              pressed && styles.tcpAddButtonPressed,
              tcpAdding && styles.tcpAddButtonDisabled,
            ]}
          >
            {tcpAdding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Plus size={16} color="#fff" />
            )}
            <Text style={styles.tcpAddButtonText}>Add Printer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
