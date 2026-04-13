/**
 * Reassure performance baseline test for the home screen cast flow.
 *
 * This test measures render performance for the core "tap to card" interaction
 * that must not regress during Phases 2-3 refactoring.
 *
 * Mock strategy: All external data sources (Scryfall API, AsyncStorage) are
 * mocked to eliminate network/storage variance from measurements. Providers
 * are mocked at the hook level to avoid async loading state fluctuations.
 *
 * Per D-09: Reassure runs as a non-blocking CI check in Phase 1.
 * Baselines transition to blocking in Phase 2.
 */
import { measureRenders } from 'reassure';
import { screen, fireEvent } from '@testing-library/react-native';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Card, CardType } from '../types';

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the component under test
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockFetchRandomCard = jest.fn();
const mockFetchMultipleCards = jest.fn();
const mockFetchRandomBgCardForType = jest.fn();
const mockImagePrefetch = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('expo-linear-gradient', () => {
  const { createElement } = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children }: { children?: ReactNode }) =>
      createElement(RNView, null, children),
  };
});

jest.mock('expo-image', () => {
  const { createElement } = require('react');
  const { View: RNView } = require('react-native');
  const MockImage = Object.assign(
    ({ testID, ...props }: Record<string, unknown>) =>
      createElement(RNView, { ...props, testID }),
    { prefetch: mockImagePrefetch },
  );
  return { Image: MockImage };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, {
    get: () => (props: Record<string, unknown>) => React.createElement('Icon', props),
  });
});

jest.mock('../providers/HistoryProvider', () => ({
  useHistory: () => ({
    cards: [],
    addCard: jest.fn(),
    addCards: jest.fn(),
    removeCard: jest.fn(),
    clearHistory: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      printer: { preferredPrinterId: null, paperWidth: 58, printArt: true, autoPrint: false },
      excludeDigitalOnly: true,
      excludeFunnySets: true,
      uniqueCardsOnly: false,
      printerConnected: false,
      devMode: false,
    },
    updateSettings: jest.fn(),
    updatePrinter: jest.fn(),
    savePreferredPrinter: jest.fn(),
    getPreferredPrinter: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../providers/NetworkProvider', () => ({
  useNetwork: () => ({ isOnline: true, isChecking: false, checkNow: jest.fn() }),
}));

jest.mock('../components/HistorySheet', () => ({
  HistorySheet: () => null,
}));

jest.mock('../components/Toast', () => {
  const { createElement } = require('react');
  const { View: RNView } = require('react-native');
  return {
    showToast: jest.fn(),
    ToastProvider: ({ children }: { children: ReactNode }) =>
      createElement(RNView, null, children),
  };
});

jest.mock('../components/TypePicker', () => ({
  TypePicker: () => null,
}));

jest.mock('../i18n', () => {
  const { CARD_TYPES } = require('../constants/cardTypes');
  return {
    useI18n: () => ({
      locale: 'en',
      t: {
        cardTypes: Object.fromEntries(
          CARD_TYPES.map((type: { id: string; label: string }) => [type.id, type.label]),
        ),
        cardTypeDescriptions: Object.fromEntries(
          CARD_TYPES.map((type: { id: string; description: string }) => [type.id, type.description]),
        ),
        errors: { fetchFailed: 'Fetch failed', networkUnavailable: 'Offline', scryfallUnavailable: 'Unavailable' },
        common: { mana: 'Mana', cast: 'Cast' },
        home: { cardCount: 'Cards', fetchingCards: (count: number) => `Fetching ${count} cards` },
        history: { title: 'History' },
      },
      loaded: true,
      scryfallLang: 'en',
      setLocale: jest.fn(),
    }),
  };
});

jest.mock('../app/(tabs)/(home)/heroRotation', () => ({
  HERO_ROTATION_INTERVAL_MS: 15000,
  startHeroArtRotationInterval: jest.fn(() => jest.fn()),
}));

jest.mock('../services/scryfall', () => ({
  fetchRandomCard: (...args: unknown[]) => mockFetchRandomCard(...args),
  fetchMultipleCards: (...args: unknown[]) => mockFetchMultipleCards(...args),
  fetchRandomBgCardForType: (...args: unknown[]) => mockFetchRandomBgCardForType(...args),
  getLocalizedScryfallErrorMessage: jest.fn(() => 'Error'),
}));

// Mock Animated to avoid async animation timing issues in tests
jest.mock('react-native/Libraries/Animated/animations/TimingAnimation', () => {
  const TimingAnimation = jest.fn().mockImplementation(() => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      if (typeof callback === 'function') {
        callback({ finished: true });
      }
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  return TimingAnimation;
});

jest.mock('react-native/Libraries/Animated/animations/SpringAnimation', () => {
  const SpringAnimation = jest.fn().mockImplementation(() => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      if (typeof callback === 'function') {
        callback({ finished: true });
      }
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  return SpringAnimation;
});

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

const HomeScreen = require('../app/(tabs)/(home)/index').default;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_CARD: Card = {
  id: 'perf-test-card-001',
  name: 'Performance Test Creature',
  manaCost: '{2}{G}',
  typeLine: 'Creature — Elf Druid',
  oracleText: 'When this creature enters, draw a card.',
  power: '2',
  toughness: '3',
  scryfallUri: 'https://scryfall.com/card/tst/1',
  artCropUrl: 'https://img.scryfall.io/art_crop/front/t/1/test.jpg',
  normalImageUrl: 'https://img.scryfall.io/normal/front/t/1/test.jpg',
  smallImageUrl: 'https://img.scryfall.io/small/front/t/1/test.jpg',
  setName: 'Test Set',
  setCode: 'TST',
  collectorNumber: '1',
  artist: 'Test Artist',
  rarity: 'common',
  colors: ['G'],
  cmc: 3,
  fetchedAt: new Date().toISOString(),
};

const MOCK_BG_DATA = {
  artUrl: 'https://img.scryfall.io/art_crop/front/b/g/bg-test.jpg',
  colors: ['G'],
};

// ---------------------------------------------------------------------------
// Wrapper component
// ---------------------------------------------------------------------------

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function ProvidersWrapper({ children }: { children: ReactNode }) {
  const queryClient = createQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home screen cast flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImagePrefetch.mockResolvedValue(true);
    mockFetchRandomBgCardForType.mockResolvedValue(MOCK_BG_DATA);
    mockFetchRandomCard.mockResolvedValue(MOCK_CARD);
    mockFetchMultipleCards.mockResolvedValue([MOCK_CARD]);
    mockPush.mockImplementation(() => {});
  });

  test('Home screen initial render', async () => {
    await measureRenders(<HomeScreen />, {
      wrapper: ProvidersWrapper,
      runs: 20,
    });
  });

  test('Cast button press flow', async () => {
    const scenario = async () => {
      const castButton = screen.getByTestId('cast-button');
      fireEvent.press(castButton);
      await screen.findByTestId('hero-art');
    };

    await measureRenders(<HomeScreen />, {
      wrapper: ProvidersWrapper,
      scenario,
      runs: 20,
    });
  });
});