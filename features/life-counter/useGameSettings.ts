import React from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Heart, Skull, Zap, Crown, Shield } from 'lucide-react-native';
import type { CounterType } from './types';
import { useI18n } from '@/stores/i18nStore';

export function useCounterConfig(): Record<CounterType, { label: string; icon: typeof Heart; color: string }> {
  const { t } = useI18n();
  return React.useMemo(() => ({
    life: { label: t.lifeCounter.life, icon: Heart, color: '#ff6b6b' },
    poison: { label: t.lifeCounter.poison, icon: Skull, color: '#51cf66' },
    energy: { label: t.lifeCounter.energy, icon: Zap, color: '#ffd43b' },
    experience: { label: t.lifeCounter.experience, icon: Crown, color: '#cc5de8' },
    commander: { label: t.lifeCounter.commanderDamage, icon: Shield, color: '#ff8787' },
  }), [t]);
}

export function hapticTap(): void {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function hapticHeavy(): void {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

export function useGameSettings() {
  const [gameMode, setGameMode] = React.useState('standard');
  const [playerCount, setPlayerCount] = React.useState<2 | 4>(2);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [startingLife, setStartingLife] = React.useState(20);

  const openSettings = React.useCallback(() => setSettingsVisible(true), []);
  const closeSettings = React.useCallback(() => setSettingsVisible(false), []);

  const togglePlayerCount = React.useCallback(() => {
    setPlayerCount(prev => prev === 2 ? 4 : 2);
  }, []);

  return {
    gameMode,
    setGameMode,
    playerCount,
    setPlayerCount,
    settingsVisible,
    setSettingsVisible,
    startingLife,
    setStartingLife,
    openSettings,
    closeSettings,
    togglePlayerCount,
  };
}
