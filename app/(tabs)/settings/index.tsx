import React, { useCallback, useState, useRef, useEffect } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Printer, ChevronRight, Zap, Info, Globe, ChevronDown, Github, Star, ExternalLink } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n, LOCALE_LABELS, LOCALE_FLAGS, ALL_LOCALES, type Locale } from '@/i18n';
import { ErrorCategory, logger } from '@/utils/logger';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, updatePrinter } = useSettings();
  const { t, locale, setLocale } = useI18n();
  const appVersion = Constants.expoConfig?.version ?? '—';
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: langDropdownOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [langDropdownOpen, dropdownAnim]);

  const togglePaperWidth = useCallback(() => {
    updatePrinter({ paperWidth: settings.printer.paperWidth === 58 ? 80 : 58 });
  }, [settings.printer.paperWidth, updatePrinter]);

  const handleSelectLocale = useCallback((loc: Locale) => {
    setLocale(loc);
    setLangDropdownOpen(false);
  }, [setLocale]);

  const handleOpenGithub = useCallback(() => {
    Linking.openURL('https://github.com/bloodf/momir-basic').catch((error) => {
      logger.warn(ErrorCategory.Navigation, 'Failed to open external URL', error);
    });
  }, []);

  const dropdownHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, ALL_LOCALES.length * 48 + 8],
  });

  const chevronRotate = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.settings.title}</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Printer size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.printerSection}</Text>
          </View>

          <Pressable
            onPress={() => router.push('/settings/printer')}
            style={styles.settingRow}
            testID="printer-setup"
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.printerSetup}</Text>
              <Text style={styles.settingValue}>
                {settings.printer.preferredPrinterId
                  ? (settings.printerConnected ? t.printer.connected : t.printer.preferredPrinterSaved)
                  : t.printer.notConnected}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>

          <Pressable onPress={togglePaperWidth} style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.printer.paperWidth}</Text>
              <Text style={styles.settingValue}>{settings.printer.paperWidth}mm</Text>
            </View>
            <View style={styles.togglePill}>
              <Text style={[
                styles.toggleOption,
                settings.printer.paperWidth === 58 && styles.toggleOptionActive,
              ]}>58</Text>
              <Text style={[
                styles.toggleOption,
                settings.printer.paperWidth === 80 && styles.toggleOptionActive,
              ]}>80</Text>
            </View>
          </Pressable>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t.printer.printMode}</Text>
              <Text style={styles.settingHint}>Receipt prints name, art, text and QR. Full Card prints the entire card image.</Text>
            </View>
            <Pressable
              onPress={() => updatePrinter({
                printMode: settings.printer.printMode === 'full' ? 'image_only' : 'full'
              })}
              style={{
                backgroundColor: Colors.cardBackground,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.gold, fontSize: 13, fontWeight: '600' }}>
                {settings.printer.printMode === 'image_only' ? 'Full Card' : 'Receipt'}
              </Text>
            </Pressable>
          </View>

          {settings.printer.printMode !== 'image_only' && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t.printer.printCardArt}</Text>
                  <Text style={styles.settingHint}>{t.printer.printCardArtHint}</Text>
                </View>
                <Switch
                  value={settings.printer.printArt}
                  onValueChange={(val) => updatePrinter({ printArt: val })}
                  trackColor={{ false: Colors.border, true: Colors.goldDark }}
                  thumbColor={settings.printer.printArt ? Colors.gold : Colors.textMuted}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t.printer.printQRCode}</Text>
                  <Text style={styles.settingHint}>Scryfall link QR code at the bottom</Text>
                </View>
                <Switch
                  value={settings.printer.printQR ?? true}
                  onValueChange={(val) => updatePrinter({ printQR: val })}
                  trackColor={{ false: Colors.border, true: Colors.goldDark }}
                  thumbColor={(settings.printer.printQR ?? true) ? Colors.gold : Colors.textMuted}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t.printer.printFlavorText}</Text>
                  <Text style={styles.settingHint}>Include the card&apos;s flavor text</Text>
                </View>
                <Switch
                  value={settings.printer.printFlavorText ?? true}
                  onValueChange={(val) => updatePrinter({ printFlavorText: val })}
                  trackColor={{ false: Colors.border, true: Colors.goldDark }}
                  thumbColor={(settings.printer.printFlavorText ?? true) ? Colors.gold : Colors.textMuted}
                />
              </View>
            </>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.printer.autoPrint}</Text>
              <Text style={styles.settingHint}>{t.printer.autoPrintHint}</Text>
            </View>
            <Switch
              value={settings.printer.autoPrint}
              onValueChange={(val) => updatePrinter({ autoPrint: val })}
              trackColor={{ false: Colors.border, true: Colors.goldDark }}
              thumbColor={settings.printer.autoPrint ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.cardFetch}</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.excludeFunnySets}</Text>
              <Text style={styles.settingHint}>{t.settings.excludeFunnyHint}</Text>
            </View>
            <Switch
              value={settings.excludeFunnySets}
              onValueChange={(val) => updateSettings({ excludeFunnySets: val })}
              trackColor={{ false: Colors.border, true: Colors.goldDark }}
              thumbColor={settings.excludeFunnySets ? Colors.gold : Colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.excludeDigitalOnly}</Text>
              <Text style={styles.settingHint}>{t.settings.excludeDigitalHint}</Text>
            </View>
            <Switch
              value={settings.excludeDigitalOnly}
              onValueChange={(val) => updateSettings({ excludeDigitalOnly: val })}
              trackColor={{ false: Colors.border, true: Colors.goldDark }}
              thumbColor={settings.excludeDigitalOnly ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.languageSection}</Text>
          </View>

          <Pressable
            onPress={() => setLangDropdownOpen(prev => !prev)}
            style={styles.settingRow}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.language}</Text>
            </View>
            <View style={styles.langCurrentRow}>
              <Text style={styles.langFlag}>{LOCALE_FLAGS[locale]}</Text>
              <Text style={styles.langCurrentLabel}>{LOCALE_LABELS[locale]}</Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <ChevronDown size={16} color={Colors.textMuted} />
              </Animated.View>
            </View>
          </Pressable>

          <Animated.View style={[styles.dropdownWrap, { maxHeight: dropdownHeight }]}>
            <View style={styles.dropdownInner}>
              {ALL_LOCALES.map((loc) => {
                const isActive = loc === locale;
                return (
                  <Pressable
                    key={loc}
                    onPress={() => handleSelectLocale(loc)}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  >
                    <Text style={styles.dropdownFlag}>{LOCALE_FLAGS[loc]}</Text>
                    <Text style={[styles.dropdownLabel, isActive && styles.dropdownLabelActive]}>
                      {LOCALE_LABELS[loc]}
                    </Text>
                    {isActive && (
                      <View style={styles.dropdownCheck}>
                        <Text style={styles.dropdownCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.about}</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t.settings.version}</Text>
            <Text style={styles.settingValue}>{appVersion}</Text>
          </View>

          <Pressable onPress={handleOpenGithub} style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.githubRow}>
                <Github size={16} color={Colors.textPrimary} />
                <Text style={styles.settingLabel}>GitHub</Text>
              </View>
              <Text style={styles.settingValue}>bloodf/momir-basic</Text>
            </View>
            <ExternalLink size={16} color={Colors.textMuted} />
          </Pressable>

          <Pressable onPress={handleOpenGithub} style={styles.githubStarRow}>
            <Star size={14} color={Colors.gold} />
            <Text style={styles.githubStarText}>{t.settings.starOnGithub}</Text>
          </Pressable>

          <View style={styles.aboutText}>
            <Text style={styles.aboutBody}>
              {t.settings.aboutBody}
            </Text>
            <Text style={styles.aboutCredit}>
              {t.settings.aboutCredit}
            </Text>
            <Text style={styles.aboutOpenSource}>
              {t.settings.openSourceContributions}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  settingLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  settingValue: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  settingHint: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  toggleOptionActive: {
    backgroundColor: Colors.gold,
    color: '#fff',
  },
  langCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langFlag: {
    fontSize: 20,
  },
  langCurrentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  dropdownWrap: {
    overflow: 'hidden',
  },
  dropdownInner: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(232, 105, 45, 0.1)',
  },
  dropdownFlag: {
    fontSize: 22,
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
  },
  dropdownLabelActive: {
    color: Colors.gold,
    fontWeight: '700' as const,
  },
  dropdownCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownCheckText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  githubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  githubStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 105, 45, 0.3)',
    backgroundColor: 'rgba(232, 105, 45, 0.06)',
  },
  githubStarText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  aboutText: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 8,
  },
  aboutBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  aboutCredit: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  aboutOpenSource: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },
});
