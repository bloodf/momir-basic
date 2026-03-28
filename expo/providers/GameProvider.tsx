import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { GameSession, Turn } from '@/types';

const SESSIONS_KEY = 'momir_game_sessions';
const ACTIVE_SESSION_KEY = 'momir_active_session';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export const [GameProvider, useGame] = createContextHook(() => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['gameSessions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      return stored ? (JSON.parse(stored) as GameSession[]) : [];
    },
  });

  const activeQuery = useQuery({
    queryKey: ['activeSession'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      return stored ? (JSON.parse(stored) as GameSession) : null;
    },
  });

  useEffect(() => {
    if (sessionsQuery.data) setSessions(sessionsQuery.data);
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (activeQuery.data !== undefined) setActiveSession(activeQuery.data);
  }, [activeQuery.data]);

  const saveSessionsMutation = useMutation({
    mutationFn: async (updated: GameSession[]) => {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gameSessions'] });
    },
  });

  const saveActiveMutation = useMutation({
    mutationFn: async (session: GameSession | null) => {
      if (session) {
        await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return session;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activeSession'] });
    },
  });

  const startSession = useCallback((players: string[]) => {
    const session: GameSession = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      players,
      turns: [],
      currentTurn: 1,
      currentPlayerIndex: 0,
    };
    setActiveSession(session);
    saveActiveMutation.mutate(session);
    return session;
  }, [saveActiveMutation]);

  const addTurn = useCallback((turn: Omit<Turn, 'turnNumber' | 'timestamp'>) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const newTurn: Turn = {
        ...turn,
        turnNumber: prev.currentTurn,
        timestamp: new Date().toISOString(),
      };
      const updated: GameSession = {
        ...prev,
        turns: [...prev.turns, newTurn],
      };
      saveActiveMutation.mutate(updated);
      return updated;
    });
  }, [saveActiveMutation]);

  const nextTurn = useCallback(() => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      const nextTurnNumber = nextPlayerIndex === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      const updated: GameSession = {
        ...prev,
        currentTurn: nextTurnNumber,
        currentPlayerIndex: nextPlayerIndex,
      };
      saveActiveMutation.mutate(updated);
      return updated;
    });
  }, [saveActiveMutation]);

  const endSession = useCallback(() => {
    if (!activeSession) return;
    const ended: GameSession = {
      ...activeSession,
      endedAt: new Date().toISOString(),
    };
    const updatedSessions = [ended, ...sessions];
    setSessions(updatedSessions);
    setActiveSession(null);
    saveSessionsMutation.mutate(updatedSessions);
    saveActiveMutation.mutate(null);
  }, [activeSession, sessions, saveSessionsMutation, saveActiveMutation]);

  const clearSessions = useCallback(() => {
    setSessions([]);
    saveSessionsMutation.mutate([]);
  }, [saveSessionsMutation]);

  return useMemo(() => ({
    sessions,
    activeSession,
    startSession,
    addTurn,
    nextTurn,
    endSession,
    clearSessions,
    isLoading: sessionsQuery.isLoading || activeQuery.isLoading,
  }), [sessions, activeSession, startSession, addTurn, nextTurn, endSession, clearSessions, sessionsQuery.isLoading, activeQuery.isLoading]);
});
