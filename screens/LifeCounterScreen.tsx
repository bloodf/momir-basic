import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RotateCcw, Settings, X, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PlayerPanel } from '@/components/PlayerPanel';
import { useCounterConfig, hapticHeavy, hapticTap } from '@/features/life-counter/useGameSettings';
import { useLifeCounter } from '@/features/life-counter/useLifeCounter';
import { useMomirMode } from '@/features/life-counter/useMomirMode';
import type { CounterType, PlayerCount } from '@/features/life-counter/types';
import { useI18n } from '@/stores/i18nStore';
import { LifeCounterModals } from './life-counter/LifeCounterModals';
import { styles } from './life-counter/styles';

const MOMIR_MODE_ID = 'momir';

export default function LifeCounterScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { t } = useI18n();
  const counterConfig = useCounterConfig();
  const momir = useMomirMode();
  const momirCmcValues = momir.getMomirCmcValues();
  const params = useLocalSearchParams<{
    startingLife?: string;
    playerCount?: string;
    modeName?: string;
    modeId?: string;
  }>();

  const initialLife = params.startingLife ? parseInt(params.startingLife, 10) : 20;
  const initialPlayers = (params.playerCount === '4' ? 4 : 2) as PlayerCount;
  const modeId = params.modeId ?? 'standard';
  const isMomirMode = modeId === MOMIR_MODE_ID;
  const modeName = params.modeName ?? (isMomirMode ? t.game.momir : t.game.standard);

  const [playerCount, setPlayerCount] = useState<PlayerCount>(initialPlayers);
  const [startingLife, setStartingLife] = useState(initialLife);
  const {
    players,
    activeCounters,
    incrementCounter,
    decrementCounter,
    resetPlayers,
    setPlayerCounters,
  } = useLifeCounter(playerCount, startingLife);
  const [showSettings, setShowSettings] = useState(false);
  const [showCounterPicker, setShowCounterPicker] = useState<number | null>(null);
  const [showMomirCastPicker, setShowMomirCastPicker] = useState(false);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const startingLifeOptions = React.useMemo(
    () => (isMomirMode ? [20, 24, 25, 30, 40] : [20, 25, 30, 40]),
    [isMomirMode]
  );

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  const resetGame = useCallback(
    (count: PlayerCount, life: number) => {
      hapticHeavy();
      setPlayerCount(count);
      setStartingLife(life);
      resetPlayers(count, life);
    },
    [resetPlayers]
  );

  const handleSwitchCounter = useCallback((playerId: number) => {
    setShowCounterPicker(playerId);
  }, []);

  const selectCounter = useCallback(
    (playerId: number, counter: CounterType) => {
      hapticTap();
      setPlayerCounters(playerId, counter);
      setShowCounterPicker(null);
    },
    [setPlayerCounters]
  );

  const handleOpenMomirCastPicker = useCallback(() => {
    if (!isMomirMode || momir.isPending) {
      return;
    }

    hapticTap();
    setShowMomirCastPicker(true);
  }, [isMomirMode, momir.isPending]);

  const handleSelectMomirCmc = useCallback(
    (cmc: number) => {
      hapticHeavy();
      setShowMomirCastPicker(false);
      momir.castMomirCreature(cmc);
    },
    [momir]
  );

  const panelDimensions = React.useMemo(() => {
    const height = (screenHeight - 52) / 2;

    return playerCount === 2 ? { height, width: screenWidth } : { height, width: screenWidth / 2 };
  }, [playerCount, screenHeight, screenWidth]);

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
            onIncrement={incrementCounter}
            onDecrement={decrementCounter}
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

            {isMomirMode && (
              <Pressable
                onPress={handleOpenMomirCastPicker}
                style={[
                  styles.centerButton,
                  styles.castButton,
                  momir.isPending && styles.castButtonDisabled,
                ]}
                disabled={momir.isPending}
                testID="life-momir-cast"
              >
                {momir.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Zap size={15} color={Colors.background} />
                    <Text style={styles.castButtonText}>{t.lifeCounter.cast}</Text>
                  </>
                )}
              </Pressable>
            )}

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
            onIncrement={incrementCounter}
            onDecrement={decrementCounter}
            onSwitchCounter={handleSwitchCounter}
            playerCount={playerCount}
          />
        </View>
      ) : (
        <View style={styles.fourPlayerLayout}>
          <View style={styles.fourPlayerRow}>
            {[players[0], players[1]].map(player => (
              <View key={player.id} style={styles.fourPlayerCell}>
                <PlayerPanel
                  player={player}
                  activeCounter={activeCounters[player.id] ?? 'life'}
                  isRotated={true}
                  panelHeight={panelDimensions.height}
                  panelWidth={panelDimensions.width}
                  onIncrement={incrementCounter}
                  onDecrement={decrementCounter}
                  onSwitchCounter={handleSwitchCounter}
                  playerCount={playerCount}
                />
              </View>
            ))}
          </View>

          <View style={styles.fourPlayerDivider}>
            <Pressable
              onPress={() => setShowSettings(true)}
              style={styles.centerButton}
              testID="life-settings"
            >
              <Settings size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <View style={styles.modeIndicator}>
              <Text style={styles.modeTextSmall}>{modeName}</Text>
            </View>
            {isMomirMode && (
              <Pressable
                onPress={handleOpenMomirCastPicker}
                style={[
                  styles.centerButton,
                  styles.castButton,
                  styles.castButtonSmall,
                  momir.isPending && styles.castButtonDisabled,
                ]}
                disabled={momir.isPending}
                testID="life-momir-cast"
              >
                {momir.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Zap size={13} color={Colors.background} />
                    <Text style={[styles.castButtonText, styles.castButtonTextSmall]}>
                      {t.lifeCounter.cast}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => resetGame(playerCount, startingLife)}
              style={styles.centerButton}
              testID="life-reset"
            >
              <RotateCcw size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={styles.centerButton}
              testID="life-close"
            >
              <X size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          <View style={styles.fourPlayerRow}>
            {[players[2], players[3]].map(player => (
              <View key={player.id} style={styles.fourPlayerCell}>
                <PlayerPanel
                  player={player}
                  activeCounter={activeCounters[player.id] ?? 'life'}
                  isRotated={false}
                  panelHeight={panelDimensions.height}
                  panelWidth={panelDimensions.width}
                  onIncrement={incrementCounter}
                  onDecrement={decrementCounter}
                  onSwitchCounter={handleSwitchCounter}
                  playerCount={playerCount}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      <LifeCounterModals
        showMomirCastPicker={showMomirCastPicker}
        showCounterPicker={showCounterPicker}
        showSettings={showSettings}
        momirCmcValues={momirCmcValues}
        isMomirPending={momir.isPending}
        activeCounters={activeCounters}
        counterConfig={counterConfig}
        playerCount={playerCount}
        startingLife={startingLife}
        startingLifeOptions={startingLifeOptions}
        texts={{
          momirCastTitle: t.lifeCounter.momirCastTitle,
          momirCastSubtitle: t.lifeCounter.momirCastSubtitle,
          selectCounter: t.lifeCounter.selectCounter,
          settings: t.lifeCounter.settings,
          players: t.lifeCounter.players,
          startingLife: t.lifeCounter.startingLife,
          resetAll: t.lifeCounter.resetAll,
          done: t.common.done,
        }}
        onCloseMomirCastPicker={() => setShowMomirCastPicker(false)}
        onSelectMomirCmc={handleSelectMomirCmc}
        onCloseCounterPicker={() => setShowCounterPicker(null)}
        onSelectCounter={selectCounter}
        onCloseSettings={() => setShowSettings(false)}
        onResetGame={resetGame}
      />
    </Animated.View>
  );
}
