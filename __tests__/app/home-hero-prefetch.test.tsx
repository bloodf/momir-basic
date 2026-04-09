import type { ReactNode } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CardType } from '../../types';
import { CARD_TYPES } from '../../constants/cardTypes';

const mockPush = jest.fn();
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
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');

  const MockImage = Object.assign(
    ({ children, ...props }: { children?: ReactNode }) => <View {...props}>{children}</View>,
    { prefetch: mockImagePrefetch },
  );

  return { Image: MockImage };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, {
    get: () => (props: Record<string, unknown>) => React.createElement('Icon', props),
  });
});

jest.mock('../../providers/HistoryProvider', () => ({
  useHistory: () => ({ cards: [], addCard: jest.fn(), addCards: jest.fn() }),
}));

jest.mock('../../providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: { excludeFunnySets: true } }),
}));

jest.mock('../../providers/NetworkProvider', () => ({
  useNetwork: () => ({ isOnline: true }),
}));

jest.mock('../../components/HistorySheet', () => ({
  HistorySheet: () => null,
}));

jest.mock('../../components/Toast', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../components/TypePicker', () => ({
  TypePicker: ({ visible, onSelect }: { visible: boolean; onSelect: (type: CardType) => void }) => {
    const { View, Pressable, Text } = require('react-native');

    if (!visible) {
      return null;
    }

    return (
      <View>
        <Pressable testID="select-artifact" onPress={() => onSelect('artifact')}>
          <Text>artifact</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('../../app/(tabs)/(home)/heroRotation', () => ({
  HERO_ROTATION_INTERVAL_MS: 15000,
  startHeroArtRotationInterval: jest.fn(() => jest.fn()),
}));

jest.mock('../../services/scryfall', () => ({
  fetchRandomCard: jest.fn(),
  fetchMultipleCards: jest.fn(),
  fetchRandomBgCardForType: (...args: unknown[]) => mockFetchRandomBgCardForType(...args),
  getLocalizedScryfallErrorMessage: jest.fn(() => 'error'),
}));

jest.mock('../../i18n', () => ({
  useI18n: () => {
    const { CARD_TYPES } = require('../../constants/cardTypes');

    return {
      locale: 'en',
      t: {
        cardTypes: Object.fromEntries(CARD_TYPES.map((type: { id: string; label: string }) => [type.id, type.label])),
        cardTypeDescriptions: Object.fromEntries(CARD_TYPES.map((type: { id: string; description: string }) => [type.id, type.description])),
        errors: {
          fetchFailed: 'Fetch failed',
          networkUnavailable: 'Offline',
          scryfallUnavailable: 'Unavailable',
        },
        common: {
          mana: 'Mana',
        },
        home: {
          cardCount: 'Cards',
          fetchingCards: (count: number) => `Fetching ${count} cards`,
        },
        history: {
          title: 'History',
        },
      },
    };
  },
}));

const HomeScreen = require('../../app/(tabs)/(home)/index').default as typeof import('../../app/(tabs)/(home)/index').default;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderHomeScreen() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  );
}

describe('home hero art prefetching', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockImagePrefetch.mockResolvedValue(true);

    const fetchCounts = new Map<CardType, number>();

    mockFetchRandomBgCardForType.mockImplementation(async (type: CardType) => {
      const count = (fetchCounts.get(type) ?? 0) + 1;
      fetchCounts.set(type, count);

      return {
        artUrl: `https://img.test/${type}-${count}.jpg`,
        colors: ['G'],
      };
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('warms the current hero art and all supported type hero art URLs after load', async () => {
    renderHomeScreen();

    await act(async () => {
      jest.advanceTimersByTime(CARD_TYPES.length * 300);
    });

    await waitFor(() => {
      expect(mockImagePrefetch).toHaveBeenCalledWith('https://img.test/creature-1.jpg', 'memory-disk');
    });

    for (const type of CARD_TYPES) {
      const expectedUrl = type.id === 'creature'
        ? 'https://img.test/creature-1.jpg'
        : `https://img.test/${type.id}-1.jpg`;

      expect(mockImagePrefetch).toHaveBeenCalledWith(expectedUrl, 'memory-disk');
    }
  });

  it('reuses prefetched type art on type switch without another cold image prefetch', async () => {
    const screen = renderHomeScreen();

    await act(async () => {
      jest.advanceTimersByTime(CARD_TYPES.length * 300);
    });

    await waitFor(() => {
      expect(mockImagePrefetch).toHaveBeenCalledWith('https://img.test/artifact-1.jpg', 'memory-disk');
    });

    const artifactWarmCallsBeforeSwitch = mockImagePrefetch.mock.calls.filter(
      ([url]) => url === 'https://img.test/artifact-1.jpg'
    ).length;

    fireEvent.press(screen.getByTestId('type-label-tap'));
    fireEvent.press(await screen.findByTestId('select-artifact'));

    await waitFor(() => {
      expect(screen.getByTestId('hero-art').props.accessibilityLabel).toBe('https://img.test/artifact-1.jpg');
    });

    const artifactWarmCallsAfterSwitch = mockImagePrefetch.mock.calls.filter(
      ([url]) => url === 'https://img.test/artifact-1.jpg'
    ).length;

    expect(artifactWarmCallsAfterSwitch).toBe(artifactWarmCallsBeforeSwitch);
  });
});
