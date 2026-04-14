import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { RotateCcw, Users } from 'lucide-react-native';
import type { CounterType, PlayerCount } from '@/features/life-counter/types';
import { styles } from './styles';

type CounterConfigEntry = {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
};

interface LifeCounterModalsProps {
  showMomirCastPicker: boolean;
  showCounterPicker: number | null;
  showSettings: boolean;
  momirCmcValues: number[];
  isMomirPending: boolean;
  activeCounters: Record<number, CounterType>;
  counterConfig: Record<CounterType, CounterConfigEntry>;
  playerCount: PlayerCount;
  startingLife: number;
  startingLifeOptions: number[];
  texts: {
    momirCastTitle: string;
    momirCastSubtitle: string;
    selectCounter: string;
    settings: string;
    players: string;
    startingLife: string;
    resetAll: string;
    done: string;
  };
  onCloseMomirCastPicker: () => void;
  onSelectMomirCmc: (cmc: number) => void;
  onCloseCounterPicker: () => void;
  onSelectCounter: (playerId: number, counter: CounterType) => void;
  onCloseSettings: () => void;
  onResetGame: (count: PlayerCount, life: number) => void;
}

export function LifeCounterModals({
  showMomirCastPicker,
  showCounterPicker,
  showSettings,
  momirCmcValues,
  isMomirPending,
  activeCounters,
  counterConfig,
  playerCount,
  startingLife,
  startingLifeOptions,
  texts,
  onCloseMomirCastPicker,
  onSelectMomirCmc,
  onCloseCounterPicker,
  onSelectCounter,
  onCloseSettings,
  onResetGame,
}: LifeCounterModalsProps) {
  return (
    <>
      <Modal
        visible={showMomirCastPicker}
        transparent
        animationType="fade"
        onRequestClose={onCloseMomirCastPicker}
      >
        <Pressable style={styles.modalOverlay} onPress={onCloseMomirCastPicker}>
          <Pressable style={styles.counterPickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTitle}>{texts.momirCastTitle}</Text>
            <Text style={styles.pickerSubtitle}>{texts.momirCastSubtitle}</Text>

            <View style={styles.cmcGrid}>
              {momirCmcValues.map(cmc => (
                <Pressable
                  key={cmc}
                  style={styles.cmcOption}
                  onPress={() => onSelectMomirCmc(cmc)}
                  disabled={isMomirPending}
                  testID={`momir-cmc-${cmc}`}
                >
                  <Text style={styles.cmcOptionText}>{cmc}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCounterPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={onCloseCounterPicker}
      >
        <Pressable style={styles.modalOverlay} onPress={onCloseCounterPicker}>
          <View style={styles.counterPickerSheet}>
            <Text style={styles.pickerTitle}>{texts.selectCounter}</Text>
            {(Object.keys(counterConfig) as CounterType[]).map(key => {
              const config = counterConfig[key];
              const Icon = config.icon;
              const isActive =
                showCounterPicker !== null && activeCounters[showCounterPicker] === key;

              return (
                <Pressable
                  key={key}
                  style={[
                    styles.counterOption,
                    isActive && {
                      backgroundColor: `${config.color}15`,
                      borderColor: `${config.color}30`,
                    },
                  ]}
                  onPress={() => {
                    if (showCounterPicker !== null) {
                      onSelectCounter(showCounterPicker, key);
                    }
                  }}
                >
                  <View style={[styles.counterIconWrap, { backgroundColor: `${config.color}18` }]}>
                    <Icon size={18} color={config.color} />
                  </View>
                  <Text style={[styles.counterOptionText, isActive && { color: config.color }]}>
                    {config.label}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: config.color }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={onCloseSettings}
      >
        <Pressable style={styles.modalOverlay} onPress={onCloseSettings}>
          <Pressable style={styles.settingsSheet} onPress={() => {}}>
            <Text style={styles.settingsTitle}>{texts.settings}</Text>

            <Text style={styles.settingLabel}>{texts.players}</Text>
            <View style={styles.optionRow}>
              {([2, 4] as PlayerCount[]).map(count => (
                <Pressable
                  key={count}
                  style={[styles.optionButton, playerCount === count && styles.optionButtonActive]}
                  onPress={() => onResetGame(count, startingLife)}
                >
                  <Users size={15} color={playerCount === count ? '#111' : '#aaa'} />
                  <Text
                    style={[styles.optionText, playerCount === count && styles.optionTextActive]}
                  >
                    {count}P
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingLabel}>{texts.startingLife}</Text>
            <View style={styles.optionRow}>
              {startingLifeOptions.map(life => (
                <Pressable
                  key={life}
                  style={[styles.optionButton, startingLife === life && styles.optionButtonActive]}
                  onPress={() => onResetGame(playerCount, life)}
                >
                  <Text
                    style={[styles.optionText, startingLife === life && styles.optionTextActive]}
                  >
                    {life}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.resetAllButton}
              onPress={() => {
                onResetGame(playerCount, startingLife);
                onCloseSettings();
              }}
            >
              <RotateCcw size={15} color="#ff6b6b" />
              <Text style={styles.resetAllText}>{texts.resetAll}</Text>
            </Pressable>

            <Pressable style={styles.doneButton} onPress={onCloseSettings}>
              <Text style={styles.doneButtonText}>{texts.done}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
