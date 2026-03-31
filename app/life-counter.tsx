import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  X,
  RotateCcw,
  Settings,
  Skull,
  Zap,
  Heart,
  Minus,
  Plus,
  Users,
  Crown,
  Shield,
  Droplets,
} from 'lucide-react-native';
import { useI18n } from '@/i18n';

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
  gradient: readonly [string, string];
}

const PLAYER_THEMES: { gradient: readonly [string, string] }[] = [
  { gradient: ['#1b2838', '#0f1923'] as const },
  { gradient: ['#2d1520', '#1a0c14'] as const },
  { gradient: ['#152d1b', '#0c1a0f'] as const },
  { gradient: ['#2d2815', '#1a180c'] as const },
];

function useCounterConfig(): Record<CounterType, { label: string; icon: typeof Heart; color: string }> {
  const { t } = useI18n();
  return React.useMemo(() => ({
    life: { label: t.lifeCounter.life, icon: Heart, color: '#ff6b6b' },
    poison: { label: t.lifeCounter.poison, icon: Skull, color: '#51cf66' },
    energy: { label: t.lifeCounter.energy, icon: Zap, color: '#ffd43b' },
    experience: { label: t.lifeCounter.experience, icon: Crown, color: '#cc5de8' },
    commander: { label: t.lifeCounter.commanderDamage, icon: Shield, color: '#ff8787' },
  }), [t]);
}

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
    name: `P${i + 1}`,
    life: startingLife,
    poison: 0,
    energy: 0,
    experience: 0,
    commanderDamage: Array.from({ length: count }, () => 0),
    gradient: PLAYER_THEMES[i].gradient,
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
  const valueScale = useRef(new Animated.Value(1)).current;
  const [showDelta, setShowDelta] = useState<number | null>(null);
  const deltaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deltaAccumulator = useRef(0);
  const deltaFade = useRef(new Animated.Value(0)).current;

  const getActiveValue = useCallback(() => {
    switch (activeCounter) {
      case 'life': return player.life;
      case 'poison': return player.poison;
      case 'energy': return player.energy;
      case 'experience': return player.experience;
      case 'commander': return player.commanderDamage.reduce((a, b) => a + b, 0);
    }
  }, [activeCounter, player]);

  const pulseValue = useCallback(() => {
    Animated.sequence([
      Animated.timing(valueScale, { toValue: 1.08, duration: 60, useNativeDriver: true }),
      Animated.spring(valueScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
  }, [valueScale]);

  const showDeltaAnim = useCallback((delta: number) => {
    deltaAccumulator.current = delta;
    setShowDelta(delta);
    deltaFade.setValue(1);
    if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
    deltaTimeout.current = setTimeout(() => {
      Animated.timing(deltaFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        deltaAccumulator.current = 0;
        setShowDelta(null);
      });
    }, 1200);
  }, [deltaFade]);

  const handleIncrement = useCallback(() => {
    hapticTap();
    deltaAccumulator.current += 1;
    showDeltaAnim(deltaAccumulator.current);
    pulseValue();

    Animated.sequence([
      Animated.timing(incrementAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(incrementAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    onIncrement(player.id);
  }, [onIncrement, player.id, incrementAnim, pulseValue, showDeltaAnim]);

  const handleDecrement = useCallback(() => {
    hapticTap();
    deltaAccumulator.current -= 1;
    showDeltaAnim(deltaAccumulator.current);
    pulseValue();

    Animated.sequence([
      Animated.timing(decrementAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(decrementAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    onDecrement(player.id);
  }, [onDecrement, player.id, decrementAnim, pulseValue, showDeltaAnim]);

  const counterConfig = useCounterConfig();
  const value = getActiveValue();
  const counterConf = counterConfig[activeCounter];
  const CounterIcon = counterConf.icon;

  const isLow = activeCounter === 'life' && value <= 5;
  const isPoisoned = activeCounter === 'poison' && value >= 10;
  const isDead = activeCounter === 'life' && value <= 0;

  const is4Player = playerCount === 4;
  const mainFontSize = is4Player ? 56 : 80;
  const counterIconSize = is4Player ? 11 : 13;

  const incBg = incrementAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)'],
  });
  const decBg = decrementAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)'],
  });

  const containerStyle = [
    styles.playerPanel,
    {
      height: panelHeight,
      width: panelWidth,
      backgroundColor: player.gradient[0],
      transform: isRotated ? [{ rotate: '180deg' as const }] : [],
    },
    isDead && styles.playerDead,
  ];

  const valueColor = isDead ? '#ef4444' : isLow ? '#f97316' : isPoisoned ? '#51cf66' : '#e8e8e8';

  return (
    <View style={containerStyle}>
      <View style={styles.panelContent}>
        <View style={[styles.panelInnerGlow, { backgroundColor: player.gradient[1] }]} />

        <Animated.View style={[styles.halfZone, styles.incrementZone, { backgroundColor: incBg }]}>
          <Pressable style={styles.zonePress} onPress={handleIncrement} testID={`p${player.id}-inc`}>
            <Plus size={is4Player ? 14 : 18} color="rgba(255,255,255,0.1)" />
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.halfZone, styles.decrementZone, { backgroundColor: decBg }]}>
          <Pressable style={styles.zonePress} onPress={handleDecrement} testID={`p${player.id}-dec`}>
            <Minus size={is4Player ? 14 : 18} color="rgba(255,255,255,0.1)" />
          </Pressable>
        </Animated.View>

        <View style={styles.centerDisplay} pointerEvents="none">
          <View style={styles.playerNameRow}>
            <Text style={[styles.playerName, is4Player && styles.playerName4p]}>{player.name}</Text>
          </View>

          <Animated.Text
            style={[
              styles.mainValue,
              { fontSize: mainFontSize, color: valueColor, transform: [{ scale: valueScale }] },
            ]}
          >
            {value}
          </Animated.Text>

          {showDelta !== null && showDelta !== 0 && (
            <Animated.View style={[styles.deltaContainer, { opacity: deltaFade }]}>
              <Text style={[styles.deltaText, showDelta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                {showDelta > 0 ? `+${showDelta}` : showDelta}
              </Text>
            </Animated.View>
          )}

          <View style={[styles.counterIndicator, { borderColor: `${counterConf.color}33` }]}>
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
                <Skull size={9} color="#51cf66" />
                <Text style={[styles.miniCounterText, { color: '#51cf66' }]}>{player.poison}</Text>
              </View>
            )}
            {player.energy > 0 && (
              <View style={styles.miniCounter}>
                <Zap size={9} color="#ffd43b" />
                <Text style={[styles.miniCounterText, { color: '#ffd43b' }]}>{player.energy}</Text>
              </View>
            )}
            {player.experience > 0 && (
              <View style={styles.miniCounter}>
                <Crown size={9} color="#cc5de8" />
                <Text style={[styles.miniCounterText, { color: '#cc5de8' }]}>{player.experience}</Text>
              </View>
            )}
          </View>
          <Droplets size={is4Player ? 11 : 13} color="rgba(255,255,255,0.25)" />
        </Pressable>
      </View>
    </View>
  );
});

export default function LifeCounterScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const counterConfig = useCounterConfig();
  const params = useLocalSearchParams<{
    startingLife?: string;
    playerCount?: string;
    modeName?: string;
  }>();

  const initialLife = params.startingLife ? parseInt(params.startingLife, 10) : 20;
  const initialPlayers = (params.playerCount === '4' ? 4 : 2) as PlayerCount;
  const modeName = params.modeName ?? 'Standard';

  const [playerCount, setPlayerCount] = useState<PlayerCount>(initialPlayers);
  const [startingLife, setStartingLife] = useState(initialLife);
  const [players, setPlayers] = useState<PlayerState[]>(() => createPlayers(initialPlayers, initialLife));
  const [activeCounters, setActiveCounters] = useState<Record<number, CounterType>>({
    0: 'life', 1: 'life', 2: 'life', 3: 'life',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCounterPicker, setShowCounterPicker] = useState<number | null>(null);

  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

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
        height: (SCREEN_HEIGHT - 52) / 2,
        width: SCREEN_WIDTH,
      };
    }
    return {
      height: (SCREEN_HEIGHT - 52) / 2,
      width: SCREEN_WIDTH / 2,
    };
  }, [playerCount]);

  return (
    <Animated.View style={[styles.container, { opacity: enterAnim }]}>
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
              <Settings size={15} color="rgba(255,255,255,0.5)" />
            </Pressable>

            <View style={styles.modeIndicator}>
              <Text style={styles.modeText}>{modeName}</Text>
            </View>

            <Pressable
              onPress={() => resetGame(playerCount, startingLife)}
              style={styles.centerButton}
              testID="life-reset"
            >
              <RotateCcw size={15} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={styles.centerButton}
              testID="life-close"
            >
              <X size={15} color="rgba(255,255,255,0.5)" />
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
              <Settings size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <View style={styles.modeIndicator}>
              <Text style={styles.modeTextSmall}>{modeName}</Text>
            </View>
            <Pressable onPress={() => resetGame(playerCount, startingLife)} style={styles.centerButton}>
              <RotateCcw size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.centerButton}>
              <X size={13} color="rgba(255,255,255,0.5)" />
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
            <Text style={styles.pickerTitle}>{t.lifeCounter.selectCounter}</Text>
            {(Object.keys(counterConfig) as CounterType[]).map((key) => {
              const conf = counterConfig[key];
              const Icon = conf.icon;
              const isActive = showCounterPicker !== null && activeCounters[showCounterPicker] === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.counterOption, isActive && { backgroundColor: `${conf.color}15`, borderColor: `${conf.color}30` }]}
                  onPress={() => {
                    if (showCounterPicker !== null) selectCounter(showCounterPicker, key);
                  }}
                >
                  <View style={[styles.counterIconWrap, { backgroundColor: `${conf.color}18` }]}>
                    <Icon size={18} color={conf.color} />
                  </View>
                  <Text style={[styles.counterOptionText, isActive && { color: conf.color }]}>
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
            <Text style={styles.settingsTitle}>{t.lifeCounter.settings}</Text>

            <Text style={styles.settingLabel}>{t.lifeCounter.players}</Text>
            <View style={styles.optionRow}>
              {([2, 4] as PlayerCount[]).map((count) => (
                <Pressable
                  key={count}
                  style={[styles.optionButton, playerCount === count && styles.optionButtonActive]}
                  onPress={() => resetGame(count, startingLife)}
                >
                  <Users size={15} color={playerCount === count ? '#111' : '#aaa'} />
                  <Text style={[styles.optionText, playerCount === count && styles.optionTextActive]}>
                    {count}P
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingLabel}>{t.lifeCounter.startingLife}</Text>
            <View style={styles.optionRow}>
              {[20, 25, 30, 40].map((life) => (
                <Pressable
                  key={life}
                  style={[styles.optionButton, startingLife === life && styles.optionButtonActive]}
                  onPress={() => resetGame(playerCount, life)}
                >
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
              <RotateCcw size={15} color="#ff6b6b" />
              <Text style={styles.resetAllText}>{t.lifeCounter.resetAll}</Text>
            </Pressable>

            <Pressable style={styles.doneButton} onPress={() => setShowSettings(false)}>
              <Text style={styles.doneButtonText}>{t.common.done}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080a0f',
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
    borderColor: 'rgba(255,255,255,0.06)',
  },
  divider: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#0a0c11',
    zIndex: 10,
  },
  fourPlayerDivider: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0a0c11',
    zIndex: 10,
  },
  modeIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  modeTextSmall: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  centerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPanel: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  playerDead: {
    opacity: 0.5,
  },
  panelContent: {
    flex: 1,
    position: 'relative',
  },
  panelInnerGlow: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    borderRadius: 999,
    opacity: 0.3,
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
    marginBottom: 2,
  },
  playerName: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  playerName4p: {
    fontSize: 10,
    letterSpacing: 2,
  },
  mainValue: {
    fontWeight: '100' as const,
    includeFontPadding: false,
  },
  deltaContainer: {
    position: 'absolute',
    right: 24,
    top: '50%',
    marginTop: -12,
  },
  deltaText: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  deltaPositive: {
    color: '#51cf66',
  },
  deltaNegative: {
    color: '#ff6b6b',
  },
  counterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
  },
  counterLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  switchCounterButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  miniCounters: {
    flexDirection: 'row',
    gap: 6,
  },
  miniCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniCounterText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterPickerSheet: {
    backgroundColor: '#161820',
    borderRadius: 20,
    padding: 22,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 340,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pickerTitle: {
    color: '#e8e8e8',
    fontSize: 17,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  counterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  counterIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
    color: '#aaa',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  settingsSheet: {
    backgroundColor: '#161820',
    borderRadius: 22,
    padding: 24,
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 400,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  settingsTitle: {
    color: '#e8e8e8',
    fontSize: 19,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  settingLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionButtonActive: {
    backgroundColor: '#e8e8e8',
    borderColor: '#e8e8e8',
  },
  optionText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  optionTextActive: {
    color: '#111',
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  resetAllText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#e8e8e8',
  },
  doneButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
