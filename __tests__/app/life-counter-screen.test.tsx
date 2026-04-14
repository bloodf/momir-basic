import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { CounterType } from '../../features/life-counter/types';

const mockBack = jest.fn();
const mockSetPlayerCounters = jest.fn();
const mockResetPlayers = jest.fn();
const mockCastMomirCreature = jest.fn();

let mockParams: {
  startingLife?: string;
  playerCount?: string;
  modeName?: string;
  modeId?: string;
} = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');

  return new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) => React.createElement('Icon', props),
    }
  );
});

jest.mock('@/components/PlayerPanel', () => ({
  PlayerPanel: ({
    player,
    onSwitchCounter,
  }: {
    player: { id: number };
    onSwitchCounter: (id: number) => void;
  }) => {
    const { Pressable, Text } = require('react-native');

    return (
      <Pressable testID={`player-panel-${player.id}`} onPress={() => onSwitchCounter(player.id)}>
        <Text>{`Player ${player.id}`}</Text>
      </Pressable>
    );
  },
}));

jest.mock('@/stores/i18nStore', () => ({
  useI18n: () => ({
    t: {
      game: {
        momir: 'Momir Basic',
        standard: 'Standard',
      },
      common: {
        done: 'Done',
      },
      lifeCounter: {
        cast: 'Cast',
        momirCastTitle: 'Cast a creature',
        momirCastSubtitle: 'Choose a mana value',
        selectCounter: 'Select Counter',
        settings: 'Settings',
        players: 'Players',
        startingLife: 'Starting Life',
        resetAll: 'Reset All',
      },
    },
  }),
}));

jest.mock('@/features/life-counter/useGameSettings', () => {
  const React = require('react');

  return {
    useCounterConfig: () => ({
      life: { label: 'Life', icon: () => React.createElement('Icon'), color: '#ff6b6b' },
      poison: { label: 'Poison', icon: () => React.createElement('Icon'), color: '#51cf66' },
      energy: { label: 'Energy', icon: () => React.createElement('Icon'), color: '#ffd43b' },
      experience: {
        label: 'Experience',
        icon: () => React.createElement('Icon'),
        color: '#cc5de8',
      },
      commander: { label: 'Commander', icon: () => React.createElement('Icon'), color: '#ff8787' },
    }),
    hapticTap: jest.fn(),
    hapticHeavy: jest.fn(),
  };
});

jest.mock('@/features/life-counter/useLifeCounter', () => ({
  useLifeCounter: () => ({
    players: [
      {
        id: 0,
        name: 'P1',
        life: 20,
        poison: 0,
        energy: 0,
        experience: 0,
        commanderDamage: [0, 0],
        gradient: ['#111', '#222'],
      },
      {
        id: 1,
        name: 'P2',
        life: 20,
        poison: 0,
        energy: 0,
        experience: 0,
        commanderDamage: [0, 0],
        gradient: ['#333', '#444'],
      },
    ],
    activeCounters: { 0: 'life', 1: 'life', 2: 'life', 3: 'life' } as Record<number, CounterType>,
    incrementCounter: jest.fn(),
    decrementCounter: jest.fn(),
    resetPlayers: mockResetPlayers,
    setPlayerCounters: mockSetPlayerCounters,
  }),
}));

jest.mock('@/features/life-counter/useMomirMode', () => ({
  useMomirMode: () => ({
    isPending: false,
    castMomirCreature: mockCastMomirCreature,
    getMomirCmcValues: () => [0, 1, 2, 3],
  }),
}));

const LifeCounterScreen = require('../../screens/LifeCounterScreen').default;

function renderScreen() {
  return render(<LifeCounterScreen />);
}

describe('LifeCounterScreen modal interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { playerCount: '2', startingLife: '20', modeId: 'standard', modeName: 'Standard' };
  });

  it('opens settings and closes them after reset all', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('life-settings'));

    expect(screen.getByText('Settings')).toBeTruthy();

    fireEvent.press(screen.getByText('Reset All'));

    expect(mockResetPlayers).toHaveBeenCalledWith(2, 20);

    await waitFor(() => {
      expect(screen.queryByText('Settings')).toBeNull();
    });
  });

  it('opens the counter picker and closes it after selecting a counter', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('player-panel-0'));

    expect(screen.getByText('Select Counter')).toBeTruthy();

    fireEvent.press(screen.getByText('Poison'));

    expect(mockSetPlayerCounters).toHaveBeenCalledWith(0, 'poison');

    await waitFor(() => {
      expect(screen.queryByText('Select Counter')).toBeNull();
    });
  });

  it('opens the Momir cast picker and forwards the selected mana value', async () => {
    mockParams = { playerCount: '2', startingLife: '24', modeId: 'momir', modeName: 'Momir Basic' };

    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('life-momir-cast'));

    expect(screen.getByText('Cast a creature')).toBeTruthy();

    fireEvent.press(screen.getByTestId('momir-cmc-3'));

    expect(mockCastMomirCreature).toHaveBeenCalledWith(3);

    await waitFor(() => {
      expect(screen.queryByText('Cast a creature')).toBeNull();
    });
  });
});
