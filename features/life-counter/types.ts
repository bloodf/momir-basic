export type CounterType = 'life' | 'poison' | 'energy' | 'experience' | 'commander';
export type PlayerCount = 2 | 4;

export interface PlayerState {
  id: number;
  name: string;
  life: number;
  poison: number;
  energy: number;
  experience: number;
  commanderDamage: number[];
  gradient: readonly [string, string];
}

export const PLAYER_THEMES: { gradient: readonly [string, string] }[] = [
  { gradient: ['#1b2838', '#0f1923'] as const },
  { gradient: ['#2d1520', '#1a0c14'] as const },
  { gradient: ['#152d1b', '#0c1a0f'] as const },
  { gradient: ['#2d2815', '#1a180c'] as const },
];

export function createPlayers(count: PlayerCount, startingLife: number): PlayerState[] {
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
