import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Play, Square, SkipForward, Users, Clock, Zap, Trophy, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGame } from '@/providers/GameProvider';
import { GameSession } from '@/types';

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeSession, sessions, startSession, nextTurn, endSession, clearSessions } = useGame();
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1']);
  const [showSetup, setShowSetup] = useState(false);

  const handleStartGame = useCallback(() => {
    const names = playerNames.filter(n => n.trim().length > 0);
    if (names.length === 0) {
      Alert.alert('Error', 'Add at least one player name');
      return;
    }
    startSession(names);
    setShowSetup(false);
  }, [playerNames, startSession]);

  const handleEndGame = useCallback(() => {
    Alert.alert('End Game', 'Are you sure you want to end this game session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Game', style: 'destructive', onPress: endSession },
    ]);
  }, [endSession]);

  const handleNextTurn = useCallback(() => {
    nextTurn();
  }, [nextTurn]);

  const addPlayer = useCallback(() => {
    if (playerNames.length < 4) {
      setPlayerNames(prev => [...prev, `Player ${prev.length + 1}`]);
    }
  }, [playerNames.length]);

  const removePlayer = useCallback((index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(prev => prev.filter((_, i) => i !== index));
    }
  }, [playerNames.length]);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setPlayerNames(prev => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  }, []);

  const handleClearSessions = useCallback(() => {
    Alert.alert('Clear History', 'Delete all past game sessions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearSessions },
    ]);
  }, [clearSessions]);

  if (activeSession) {
    const manaCurve: Record<number, number> = {};
    activeSession.turns.forEach(t => {
      manaCurve[t.cmc] = (manaCurve[t.cmc] || 0) + 1;
    });
    const maxCurve = Math.max(1, ...Object.values(manaCurve));

    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Game Session</Text>
          <Pressable onPress={handleEndGame} style={styles.endButton} testID="end-game">
            <Square size={14} color={Colors.error} />
            <Text style={styles.endButtonText}>End</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.turnCard}>
            <Text style={styles.turnLabel}>Turn</Text>
            <Text style={styles.turnNumber}>{activeSession.currentTurn}</Text>
            <View style={styles.playerIndicator}>
              <Users size={14} color={Colors.gold} />
              <Text style={styles.currentPlayer}>
                {activeSession.players[activeSession.currentPlayerIndex]}
              </Text>
            </View>
          </View>

          <Pressable onPress={handleNextTurn} style={styles.nextTurnButton} testID="next-turn">
            <SkipForward size={18} color="#fff" />
            <Text style={styles.nextTurnText}>Next Turn</Text>
          </Pressable>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Session Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Zap size={16} color={Colors.gold} />
                <Text style={styles.statValue}>{activeSession.turns.length}</Text>
                <Text style={styles.statLabel}>Cards Cast</Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={16} color={Colors.mana.U} />
                <Text style={styles.statValue}>{activeSession.currentTurn}</Text>
                <Text style={styles.statLabel}>Turns</Text>
              </View>
              <View style={styles.statItem}>
                <Users size={16} color={Colors.mana.G} />
                <Text style={styles.statValue}>{activeSession.players.length}</Text>
                <Text style={styles.statLabel}>Players</Text>
              </View>
            </View>
          </View>

          {Object.keys(manaCurve).length > 0 && (
            <View style={styles.curveSection}>
              <Text style={styles.sectionTitle}>Mana Curve</Text>
              <View style={styles.curveChart}>
                {Array.from({ length: 11 }, (_, i) => i).map(cmcVal => {
                  const count = manaCurve[cmcVal] || 0;
                  const height = count > 0 ? (count / maxCurve) * 60 + 4 : 4;
                  return (
                    <View key={cmcVal} style={styles.curveBar}>
                      <View style={[styles.curveBarFill, { height }]} />
                      <Text style={styles.curveLabel}>{cmcVal}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {activeSession.turns.length > 0 && (
            <View style={styles.turnsSection}>
              <Text style={styles.sectionTitle}>Turn Log</Text>
              {[...activeSession.turns].reverse().slice(0, 20).map((turn, idx) => (
                <View key={idx} style={styles.turnLogItem}>
                  <View style={styles.turnLogDot} />
                  <View style={styles.turnLogContent}>
                    <Text style={styles.turnLogCard} numberOfLines={1}>{turn.cardName}</Text>
                    <Text style={styles.turnLogMeta}>
                      Turn {turn.turnNumber} · {turn.playerName} · CMC {turn.cmc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (showSetup) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>New Game</Text>
          <Pressable onPress={() => setShowSetup(false)} testID="cancel-setup">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Players</Text>
          {playerNames.map((name, index) => (
            <View key={index} style={styles.playerRow}>
              <TextInput
                style={styles.playerInput}
                value={name}
                onChangeText={(text) => updatePlayerName(index, text)}
                placeholder={`Player ${index + 1}`}
                placeholderTextColor={Colors.textMuted}
                testID={`player-name-${index}`}
              />
              {playerNames.length > 1 && (
                <Pressable onPress={() => removePlayer(index)} style={styles.removePlayer}>
                  <Text style={styles.removePlayerText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}

          {playerNames.length < 4 && (
            <Pressable onPress={addPlayer} style={styles.addPlayerButton} testID="add-player">
              <Text style={styles.addPlayerText}>+ Add Player</Text>
            </Pressable>
          )}

          <Pressable onPress={handleStartGame} style={styles.startButton} testID="start-game">
            <Play size={18} color="#fff" />
            <Text style={styles.startButtonText}>Start Game</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Game</Text>
        {sessions.length > 0 && (
          <Pressable onPress={handleClearSessions} hitSlop={12}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.newGameSection}>
        <View style={styles.actionCardsRow}>
          <Pressable
            onPress={() => setShowSetup(true)}
            style={styles.actionCard}
            testID="new-game"
          >
            <View style={styles.actionIconWrap}>
              <Trophy size={28} color={Colors.gold} />
            </View>
            <Text style={styles.actionCardTitle}>New Game</Text>
            <Text style={styles.actionCardSub}>Track turns & cards</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/life-counter')}
            style={styles.actionCard}
            testID="life-counter"
          >
            <View style={[styles.actionIconWrap, styles.actionIconLife]}>
              <Heart size={28} color="#ff6666" />
            </View>
            <Text style={styles.actionCardTitle}>Life Counter</Text>
            <Text style={styles.actionCardSub}>2 or 4 players</Text>
          </Pressable>
        </View>
      </View>

      {sessions.length > 0 && (
        <View style={styles.pastSection}>
          <Text style={styles.sectionTitle}>Past Sessions</Text>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: GameSession }) => {
              const duration = item.endedAt
                ? Math.round((new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()) / 60000)
                : 0;
              return (
                <View style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>
                      {new Date(item.startedAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {item.players.join(', ')} · {item.turns.length} cards · {duration}min
                    </Text>
                  </View>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  clearText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,68,68,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  endButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  turnCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  turnLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  turnNumber: {
    fontSize: 72,
    fontWeight: '200' as const,
    color: Colors.gold,
    lineHeight: 80,
  },
  playerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'rgba(232,105,45,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentPlayer: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  nextTurnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  nextTurnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  curveSection: {
    marginTop: 24,
  },
  curveChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 80,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  curveBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  curveBarFill: {
    width: '80%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
    minHeight: 4,
  },
  curveLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    position: 'absolute' as const,
    bottom: -16,
  },
  turnsSection: {
    marginTop: 24,
    paddingBottom: 40,
  },
  turnLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  turnLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  turnLogContent: {
    flex: 1,
    gap: 2,
  },
  turnLogCard: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  turnLogMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  newGameSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(232,105,45,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIconLife: {
    backgroundColor: 'rgba(255,102,102,0.1)',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  actionCardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  pastSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sessionItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionInfo: {
    gap: 4,
  },
  sessionDate: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sessionMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  playerInput: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removePlayer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePlayerText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  addPlayerButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed' as const,
  },
  addPlayerText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
