import { useState, useCallback } from 'react';
import type { PlayerState, PlayerCount, CounterType } from './types';
import { createPlayers } from './types';

export function useLifeCounter(playerCount: PlayerCount, startingLife: number) {
  const [players, setPlayers] = useState<PlayerState[]>(() => createPlayers(playerCount, startingLife));
  const [activeCounters, setActiveCounters] = useState<Record<number, CounterType>>({
    0: 'life', 1: 'life', 2: 'life', 3: 'life',
  });

  const updateCounter = useCallback((playerId: number, delta: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const counter = activeCounters[playerId] ?? 'life';
      switch (counter) {
        case 'life': return { ...p, life: p.life + delta };
        case 'poison': return { ...p, poison: Math.max(0, p.poison + delta) };
        case 'energy': return { ...p, energy: Math.max(0, p.energy + delta) };
        case 'experience': return { ...p, experience: Math.max(0, p.experience + delta) };
        case 'commander': {
          const dmg = [...p.commanderDamage];
          dmg[0] = Math.max(0, (dmg[0] ?? 0) + delta);
          return { ...p, commanderDamage: dmg };
        }
        default: return p;
      }
    }));
  }, [activeCounters]);

  const incrementCounter = useCallback((playerId: number) => {
    updateCounter(playerId, 1);
  }, [updateCounter]);

  const decrementCounter = useCallback((playerId: number) => {
    updateCounter(playerId, -1);
  }, [updateCounter]);

  const resetPlayers = useCallback((count: PlayerCount, life: number) => {
    setPlayers(createPlayers(count, life));
    setActiveCounters({ 0: 'life', 1: 'life', 2: 'life', 3: 'life' });
  }, []);

  const setPlayerCounters = useCallback((playerId: number, counter: CounterType) => {
    setActiveCounters(prev => ({ ...prev, [playerId]: counter }));
  }, []);

  return {
    players,
    setPlayers,
    activeCounters,
    setActiveCounters,
    incrementCounter,
    decrementCounter,
    resetPlayers,
    setPlayerCounters,
  };
}
