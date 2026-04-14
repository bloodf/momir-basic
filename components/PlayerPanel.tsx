import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Minus, Plus, Skull, Zap, Crown, Droplets } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { PlayerState, CounterType, PlayerCount } from '@/features/life-counter/types';
import { useCounterConfig, hapticTap } from '@/features/life-counter/useGameSettings';

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

export const PlayerPanel = React.memo(function PlayerPanel({
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

const styles = StyleSheet.create({
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
});
