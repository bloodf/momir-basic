import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  X,
  RotateCcw,
  Settings,
  Skull,
  Zap,
  Shield,
  Heart,
  Minus,
  Plus,
  Users,
  Crown,
  Droplets,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type CounterType = 'life' | 'poison' | 'energy' | 'experience' | 'commander';
type PlayerCount = 2 | 4;

interface PlayerState {
  id: number;
  name: string;
  life: number;
  poison: number;
  energy: number;
  experience: number;
  commanderDamage: number[];
  color: string;
  bgColor: string;
}

const PLAYER_COLORS = [
  { color: '#e8e8e8', bgColor: '#1a2a3a' },
  { color: '#e8e8e8', bgColor: '#2a1a1a' },
  { color: '#e8e8e8', bgColor: '#1a2a1a' },
  { color: '#e8e8e8', bgColor: '#2a2a1a' },
];

const STARTING_LIFE_OPTIONS = [20, 30, 40];

const COUNTER_CONFIG: Record<CounterType, { label: string; icon: typeof Heart; color: string }> = {
  life: { label: 'Life', icon: Heart, color: '#E8692D' },
  poison: { label: 'Poison', icon: Skull, color: '#88dd44' },
  energy: { label: 'Energy', icon: Zap, color: '#ffaa00' },
  experience: { label: 'Exp', icon: Crown, color: '#aa88ff' },
  commander: { label: 'Cmd Dmg', icon: Shield, color: '#ff6666' },
};

function hapticTap() {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function hapticHeavy() {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

function createPlayers(count: PlayerCount, startingLife: number): PlayerState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Player ${i + 1}`,
    life: startingLife,
    poison: 0,
    energy: 0,
    experience: 0,
    commanderDamage: Array.from({ length: count }, () => 0),
    ...PLAYER_COLORS[i],
  }));
}

interface PlayerPanelProps {
  player: PlayerState;
  activeCounter: CounterType;
  isRotated: boolean;
  panelHeight: number;
  panelWidth: number;
  onIncrement: (playerId: number) => void;
  onDecrement: (playerId: number) => void;
  onSwitchCounter: (playerId: number) => void;
  playerCount: PlayerCount;
}

const PlayerPanel = React.memo(function PlayerPanel({
  player,
  activeCounter,
  isRotated,
  panelHeight,
  panelWidth,
  onIncrement,
  onDecrement,
  onSwitchCounter,
  playerCount,
}: PlayerPanelProps) {
  const incrementAnim = useRef(new Animated.Value(0)).current;
  const decrementAnim = useRef(new Animated.Value(0)).current;
  const [showDelta, setShowDelta] = useState<number | null>(null);
  const deltaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deltaAccumulator = useRef(0);

  const getActiveValue = useCallback(() => {
    switch (activeCounter) {
      case 'life': return player.life;
      case 'poison': return player.poison;
      case 'energy': return player.energy;
      case 'experience': return player.experience;
      case 'commander': return player.commanderDamage.reduce((a, b) => a + b, 0);
    }
  }, [activeCounter, player]);

  const handleIncrement = useCallback(() => {
    hapticTap();
    deltaAccumulator.current += 1;
    setShowDelta(deltaAccumulator.current);
    if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
    deltaTimeout.current = setTimeout(() => {
      deltaAccumulator.current = 0;
      setShowDelta(null);
    }, 1500);

    Animated.sequence([
      Animated.timing(incrementAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(incrementAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    onIncrement(player.id);
  }, [onIncrement, player.id, incrementAnim]);

  const handleDecrement = useCallback(() => {
    hapticTap();
    deltaAccumulator.current -= 1;
    setShowDelta(deltaAccumulator.current);
    if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
    deltaTimeout.current = setTimeout(() => {
      deltaAccumulator.current = 0;
      setShowDelta(null);
    }, 1500);

    Animated.sequence([
      Animated.timing(decrementAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(decrementAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    onDecrement(player.id);
  }, [onDecrement, player.id, decrementAnim]);

  const value = getActiveValue();
  const counterConf = COUNTER_CONFIG[activeCounter];
  const CounterIcon = counterConf.icon;

  const isLow = activeCounter === 'life' && value <= 5;
  const isPoisoned = activeCounter === 'poison' && value >= 10;
  const isDead = activeCounter === 'life' && value <= 0;

  const is4Player = playerCount === 4;
  const mainFontSize = is4Player ? 64 : 88;
  const nameFontSize = is4Player ? 11 : 13;
  const counterIconSize = is4Player ? 12 : 14;

  const incBg = incrementAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)'],
  });
  const decBg = decrementAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)'],
  });

  const containerStyle = [
    styles.playerPanel,
    {
      height: panelHeight,
      width: panelWidth,
      backgroundColor: player.bgColor,
      transform: isRotated ? [{ rotate: '180deg' }] : [],
    },
    isDead && styles.playerDead,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.panelContent}>
        <Animated.View style={[styles.halfZone, styles.incrementZone, { backgroundColor: incBg }]}>
          <Pressable style={styles.zonePress} onPress={handleIncrement} testID={`p${player.id}-inc`}>
            <Plus size={is4Player ? 16 : 20} color="rgba(255,255,255,0.15)" />
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.halfZone, styles.decrementZone, { backgroundColor: decBg }]}>
          <Pressable style={styles.zonePress} onPress={handleDecrement} testID={`p${player.id}-dec`}>
            <Minus size={is4Player ? 16 : 20} color="rgba(255,255,255,0.15)" />
          </Pressable>
        </Animated.View>

        <View style={styles.centerDisplay} pointerEvents="none">
          <View style={styles.playerNameRow}>
            <Text style={[styles.playerName, { fontSize: nameFontSize }]}>{player.name}</Text>
          </View>

          <Text
            style={[
              styles.mainValue,
              { fontSize: mainFontSize, color: player.color },
              isLow && styles.lowLife,
              isPoisoned && styles.poisoned,
              isDead && styles.deadText,
            ]}
          >
            {value}
          </Text>

          {showDelta !== null && showDelta !== 0 && (
            <View style={styles.deltaContainer}>
              <Text style={[styles.deltaText, showDelta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                {showDelta > 0 ? `+${showDelta}` : showDelta}
              </Text>
            </View>
          )}

          <View style={styles.counterIndicator}>
            <CounterIcon size={counterIconSize} color={counterConf.color} />
            <Text style={[styles.counterLabel, { color: counterConf.color }]}>{counterConf.label}</Text>
          </View>
        </View>

        <Pressable
          style={styles.switchCounterButton}
          onPress={() => {
            hapticTap();
            onSwitchCounter(player.id);
          }}
          testID={`p${player.id}-switch`}
        >
          <View style={styles.miniCounters}>
            {player.poison > 0 && (
              <View style={styles.miniCounter}>
                <Skull size={10} color="#88dd44" />
                <Text style={[styles.miniCounterText, { color: '#88dd44' }]}>{player.poison}</Text>
              </View>
            )}
            {player.energy > 0 && (
              <View style={styles.miniCounter}>
                <Zap size={10} color="#ffaa00" />
                <Text style={[styles.miniCounterText, { color: '#ffaa00' }]}>{player.energy}</Text>
              </View>
            )}
            {player.experience > 0 && (
              <View style={styles.miniCounter}>
                <Crown size={10} color="#aa88ff" />
                <Text style={[styles.miniCounterText, { color: '#aa88ff' }]}>{player.experience}</Text>
              </View>
            )}
          </View>
          <Droplets size={is4Player ? 12 : 14} color="rgba(255,255,255,0.35)" />
        </Pressable>
      </View>

      <View style={[styles.panelEdge, { backgroundColor: counterConf.color }]} />
    </View>
  );
});

export default function LifeCounterScreen() {
  const router = useRouter();

  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [startingLife, setStartingLife] = useState(20);
  const [players, setPlayers] = useState<PlayerState[]>(() => createPlayers(2, 20));
  const [activeCounters, setActiveCounters] = useState<Record<number, CounterType>>({
    0: 'life', 1: 'life', 2: 'life', 3: 'life',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCounterPicker, setShowCounterPicker] = useState<number | null>(null);

  const resetGame = useCallback((count: PlayerCount, life: number) => {
    hapticHeavy();
    setPlayerCount(count);
    setStartingLife(life);
    setPlayers(createPlayers(count, life));
    setActiveCounters({ 0: 'life', 1: 'life', 2: 'life', 3: 'life' });
  }, []);

  const handleIncrement = useCallback((playerId: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const counter = activeCounters[playerId] ?? 'life';
      switch (counter) {
        case 'life': return { ...p, life: p.life + 1 };
        case 'poison': return { ...p, poison: p.poison + 1 };
        case 'energy': return { ...p, energy: p.energy + 1 };
        case 'experience': return { ...p, experience: p.experience + 1 };
        case 'commander': {
          const dmg = [...p.commanderDamage];
          dmg[0] = (dmg[0] ?? 0) + 1;
          return { ...p, commanderDamage: dmg };
        }
        default: return p;
      }
    }));
  }, [activeCounters]);

  const handleDecrement = useCallback((playerId: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const counter = activeCounters[playerId] ?? 'life';
      switch (counter) {
        case 'life': return { ...p, life: p.life - 1 };
        case 'poison': return { ...p, poison: Math.max(0, p.poison - 1) };
        case 'energy': return { ...p, energy: Math.max(0, p.energy - 1) };
        case 'experience': return { ...p, experience: Math.max(0, p.experience - 1) };
        case 'commander': {
          const dmg = [...p.commanderDamage];
          dmg[0] = Math.max(0, (dmg[0] ?? 0) - 1);
          return { ...p, commanderDamage: dmg };
        }
        default: return p;
      }
    }));
  }, [activeCounters]);

  const handleSwitchCounter = useCallback((playerId: number) => {
    setShowCounterPicker(playerId);
  }, []);

  const selectCounter = useCallback((playerId: number, counter: CounterType) => {
    hapticTap();
    setActiveCounters(prev => ({ ...prev, [playerId]: counter }));
    setShowCounterPicker(null);
  }, []);

  const panelDimensions = React.useMemo(() => {
    if (playerCount === 2) {
      return {
        height: (SCREEN_HEIGHT - 48) / 2,
        width: SCREEN_WIDTH,
      };
    }
    return {
      height: (SCREEN_HEIGHT - 48) / 2,
      width: SCREEN_WIDTH / 2,
    };
  }, [playerCount]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {playerCount === 2 ? (
        <View style={styles.twoPlayerLayout}>
          <PlayerPanel
            player={players[0]}
            activeCounter={activeCounters[0] ?? 'life'}
            isRotated={true}
            panelHeight={panelDimensions.height}
            panelWidth={panelDimensions.width}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onSwitchCounter={handleSwitchCounter}
            playerCount={playerCount}
          />
          <View style={styles.divider}>
            <Pressable
              onPress={() => setShowSettings(true)}
              style={styles.centerButton}
              testID="life-settings"
            >
              <Settings size={16} color={Colors.gold} />
            </Pressable>
            <Pressable
              onPress={() => resetGame(playerCount, startingLife)}
              style={styles.centerButton}
              testID="life-reset"
            >
              <RotateCcw size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={styles.centerButton}
              testID="life-close"
            >
              <X size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          <PlayerPanel
            player={players[1]}
            activeCounter={activeCounters[1] ?? 'life'}
            isRotated={false}
            panelHeight={panelDimensions.height}
            panelWidth={panelDimensions.width}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onSwitchCounter={handleSwitchCounter}
            playerCount={playerCount}
          />
        </View>
      ) : (
        <View style={styles.fourPlayerLayout}>
          <View style={styles.fourPlayerRow}>
            <View style={styles.fourPlayerCell}>
              <PlayerPanel
                player={players[0]}
                activeCounter={activeCounters[0] ?? 'life'}
                isRotated={true}
                panelHeight={panelDimensions.height}
                panelWidth={panelDimensions.width}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSwitchCounter={handleSwitchCounter}
                playerCount={playerCount}
              />
            </View>
            <View style={styles.fourPlayerCell}>
              <PlayerPanel
                player={players[1]}
                activeCounter={activeCounters[1] ?? 'life'}
                isRotated={true}
                panelHeight={panelDimensions.height}
                panelWidth={panelDimensions.width}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSwitchCounter={handleSwitchCounter}
                playerCount={playerCount}
              />
            </View>
          </View>
          <View style={styles.fourPlayerDivider}>
            <Pressable onPress={() => setShowSettings(true)} style={styles.centerButton}>
              <Settings size={14} color={Colors.gold} />
            </Pressable>
            <Pressable onPress={() => resetGame(playerCount, startingLife)} style={styles.centerButton}>
              <RotateCcw size={14} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.centerButton}>
              <X size={14} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          <View style={styles.fourPlayerRow}>
            <View style={styles.fourPlayerCell}>
              <PlayerPanel
                player={players[2]}
                activeCounter={activeCounters[2] ?? 'life'}
                isRotated={false}
                panelHeight={panelDimensions.height}
                panelWidth={panelDimensions.width}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSwitchCounter={handleSwitchCounter}
                playerCount={playerCount}
              />
            </View>
            <View style={styles.fourPlayerCell}>
              <PlayerPanel
                player={players[3]}
                activeCounter={activeCounters[3] ?? 'life'}
                isRotated={false}
                panelHeight={panelDimensions.height}
                panelWidth={panelDimensions.width}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSwitchCounter={handleSwitchCounter}
                playerCount={playerCount}
              />
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showCounterPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCounterPicker(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCounterPicker(null)}>
          <View style={styles.counterPickerSheet}>
            <Text style={styles.pickerTitle}>Select Counter</Text>
            {(Object.keys(COUNTER_CONFIG) as CounterType[]).map((key) => {
              const conf = COUNTER_CONFIG[key];
              const Icon = conf.icon;
              const isActive = showCounterPicker !== null && activeCounters[showCounterPicker] === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.counterOption, isActive && styles.counterOptionActive]}
                  onPress={() => {
                    if (showCounterPicker !== null) selectCounter(showCounterPicker, key);
                  }}
                >
                  <Icon size={20} color={conf.color} />
                  <Text style={[styles.counterOptionText, { color: isActive ? conf.color : Colors.textPrimary }]}>
                    {conf.label}
                  </Text>
                  {isActive && <View style={[styles.activeDot, { backgroundColor: conf.color }]} />}
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
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.settingsSheet} onPress={() => {}}>
            <Text style={styles.settingsTitle}>Life Counter Settings</Text>

            <Text style={styles.settingLabel}>Players</Text>
            <View style={styles.optionRow}>
              {([2, 4] as PlayerCount[]).map((count) => (
                <Pressable
                  key={count}
                  style={[styles.optionButton, playerCount === count && styles.optionButtonActive]}
                  onPress={() => resetGame(count, startingLife)}
                >
                  <Users size={16} color={playerCount === count ? Colors.background : Colors.textPrimary} />
                  <Text style={[styles.optionText, playerCount === count && styles.optionTextActive]}>
                    {count} Players
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingLabel}>Starting Life</Text>
            <View style={styles.optionRow}>
              {STARTING_LIFE_OPTIONS.map((life) => (
                <Pressable
                  key={life}
                  style={[styles.optionButton, startingLife === life && styles.optionButtonActive]}
                  onPress={() => resetGame(playerCount, life)}
                >
                  <Heart size={14} color={startingLife === life ? Colors.background : Colors.textPrimary} />
                  <Text style={[styles.optionText, startingLife === life && styles.optionTextActive]}>
                    {life}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.resetAllButton}
              onPress={() => {
                resetGame(playerCount, startingLife);
                setShowSettings(false);
              }}
            >
              <RotateCcw size={16} color={Colors.gold} />
              <Text style={styles.resetAllText}>Reset All Counters</Text>
            </Pressable>

            <Pressable style={styles.closeSettingsButton} onPress={() => setShowSettings(false)}>
              <Text style={styles.closeSettingsText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  twoPlayerLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  fourPlayerLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  fourPlayerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  fourPlayerCell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  divider: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#0e0e0e',
    zIndex: 10,
  },
  fourPlayerDivider: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#0e0e0e',
    zIndex: 10,
  },
  centerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPanel: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  playerDead: {
    opacity: 0.6,
  },
  panelContent: {
    flex: 1,
    position: 'relative',
  },
  halfZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  incrementZone: {
    top: 0,
    bottom: '50%',
  },
  decrementZone: {
    top: '50%',
    bottom: 0,
  },
  zonePress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDisplay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  playerName: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  mainValue: {
    fontWeight: '200' as const,
    lineHeight: 100,
    includeFontPadding: false,
  },
  lowLife: {
    color: '#ff6644',
  },
  poisoned: {
    color: '#88dd44',
  },
  deadText: {
    color: '#ff2222',
  },
  deltaContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -14,
  },
  deltaText: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  deltaPositive: {
    color: '#44cc88',
  },
  deltaNegative: {
    color: '#ff6644',
  },
  counterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  switchCounterButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  miniCounters: {
    flexDirection: 'row',
    gap: 8,
  },
  miniCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniCounterText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  panelEdge: {
    height: 3,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterPickerSheet: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 340,
    gap: 8,
  },
  pickerTitle: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  counterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  counterOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  counterOptionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settingsSheet: {
    backgroundColor: '#1e1e1e',
    borderRadius: 24,
    padding: 28,
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 400,
    gap: 16,
  },
  settingsTitle: {
    color: Colors.gold,
    fontSize: 20,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  settingLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionButtonActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  optionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  optionTextActive: {
    color: Colors.background,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(232,105,45,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,105,45,0.25)',
    marginTop: 4,
  },
  resetAllText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  closeSettingsButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    marginTop: 4,
  },
  closeSettingsText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
