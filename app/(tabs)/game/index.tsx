import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Heart,
  Shield,
  Swords,
  Crown,
  Users,
  Flame,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/i18n';

interface GameMode {
  id: string;
  name: string;
  description: string;
  startingLife: number;
  defaultPlayers: 2 | 4;
  icon: typeof Heart;
  iconColor: string;
  accentColor: string;
  bgColor: string;
}

function useGameModes(): GameMode[] {
  const { t } = useI18n();
  return React.useMemo(() => [
  {
    id: 'standard',
    name: t.game.standard,
    description: t.game.standardDesc,
    startingLife: 20,
    defaultPlayers: 2,
    icon: Swords,
    iconColor: '#f0c040',
    accentColor: '#f0c040',
    bgColor: 'rgba(240,192,64,0.08)',
  },
  {
    id: 'commander',
    name: t.game.commanderMode,
    description: t.game.commanderDesc,
    startingLife: 40,
    defaultPlayers: 4,
    icon: Crown,
    iconColor: '#c084fc',
    accentColor: '#c084fc',
    bgColor: 'rgba(192,132,252,0.08)',
  },
  {
    id: 'brawl',
    name: t.game.brawl,
    description: t.game.brawlDesc,
    startingLife: 25,
    defaultPlayers: 2,
    icon: Shield,
    iconColor: '#60a5fa',
    accentColor: '#60a5fa',
    bgColor: 'rgba(96,165,250,0.08)',
  },
  {
    id: 'two-headed',
    name: t.game.twoHeadedGiant,
    description: t.game.twoHeadedGiantDesc,
    startingLife: 30,
    defaultPlayers: 2,
    icon: Users,
    iconColor: '#34d399',
    accentColor: '#34d399',
    bgColor: 'rgba(52,211,153,0.08)',
  },
  {
    id: 'pauper',
    name: t.game.pauper,
    description: t.game.pauperDesc,
    startingLife: 20,
    defaultPlayers: 2,
    icon: Heart,
    iconColor: '#fb7185',
    accentColor: '#fb7185',
    bgColor: 'rgba(251,113,133,0.08)',
  },
  {
    id: 'momir',
    name: t.game.momir,
    description: t.game.momirDesc,
    startingLife: 24,
    defaultPlayers: 2,
    icon: Zap,
    iconColor: Colors.goldLight,
    accentColor: Colors.gold,
    bgColor: 'rgba(232,105,45,0.08)',
  },
  {
    id: 'custom',
    name: t.game.custom,
    description: t.game.customDesc,
    startingLife: 20,
    defaultPlayers: 2,
    icon: Flame,
    iconColor: Colors.gold,
    accentColor: Colors.gold,
    bgColor: 'rgba(232,105,45,0.08)',
  },
], [t]);
}

interface ModeCardProps {
  mode: GameMode;
  onPress: () => void;
  index: number;
}

const ModeCard = React.memo(function ModeCard({ mode, onPress, index }: ModeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const Icon = mode.icon;
  const isLarge = index < 2;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [onPress]);

  if (isLarge) {
    return (
      <Animated.View style={[styles.largeModeCard, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          style={[styles.largeModeCardInner, { backgroundColor: mode.bgColor, borderColor: `${mode.accentColor}22` }]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={`mode-${mode.id}`}
        >
          <View style={[styles.modeIconLarge, { backgroundColor: `${mode.accentColor}18` }]}>
            <Icon size={32} color={mode.iconColor} />
          </View>
          <Text style={styles.modeNameLarge}>{mode.name}</Text>
          <Text style={styles.modeDescLarge}>{mode.description}</Text>
          <View style={styles.modeMetaRow}>
            <View style={[styles.lifeBadge, { backgroundColor: `${mode.accentColor}15` }]}>
              <Heart size={11} color={mode.accentColor} />
              <Text style={[styles.lifeBadgeText, { color: mode.accentColor }]}>{mode.startingLife}</Text>
            </View>
            <View style={[styles.playerBadge, { backgroundColor: `${mode.accentColor}15` }]}>
              <Users size={11} color={mode.accentColor} />
              <Text style={[styles.playerBadgeText, { color: mode.accentColor }]}>{mode.defaultPlayers}P</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.smallModeCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={[styles.smallModeCardInner, { backgroundColor: mode.bgColor, borderColor: `${mode.accentColor}22` }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`mode-${mode.id}`}
      >
        <View style={styles.smallModeTop}>
          <View style={[styles.modeIconSmall, { backgroundColor: `${mode.accentColor}18` }]}>
            <Icon size={20} color={mode.iconColor} />
          </View>
          <View style={[styles.lifeChipSmall, { backgroundColor: `${mode.accentColor}15` }]}>
            <Heart size={10} color={mode.accentColor} />
            <Text style={[styles.lifeChipText, { color: mode.accentColor }]}>{mode.startingLife}</Text>
          </View>
        </View>
        <Text style={styles.modeNameSmall}>{mode.name}</Text>
        <Text style={styles.modeDescSmall} numberOfLines={1}>{mode.description}</Text>
      </Pressable>
    </Animated.View>
  );
});

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const GAME_MODES = useGameModes();

  const handleSelectMode = useCallback((mode: GameMode) => {
    router.push({
      pathname: '/life-counter',
      params: {
        modeId: mode.id,
        startingLife: mode.startingLife.toString(),
        playerCount: mode.defaultPlayers.toString(),
        modeName: mode.name,
      },
    });
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.game.title}</Text>
        <Text style={styles.subtitle}>{t.game.subtitle}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.largeRow}>
          {GAME_MODES.slice(0, 2).map((mode, i) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={i}
              onPress={() => handleSelectMode(mode)}
            />
          ))}
        </View>

        <View style={styles.smallGrid}>
          {GAME_MODES.slice(2).map((mode, i) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={i + 2}
              onPress={() => handleSelectMode(mode)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  largeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  largeModeCard: {
    flex: 1,
  },
  largeModeCardInner: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  modeIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modeNameLarge: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modeDescLarge: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  modeMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lifeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  lifeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  playerBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  smallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallModeCard: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    flexBasis: '46%' as unknown as number,
  },
  smallModeCardInner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    minHeight: 120,
  },
  smallModeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modeIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifeChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lifeChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  modeNameSmall: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  modeDescSmall: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
