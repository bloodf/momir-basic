import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Printer, ChevronRight, Zap, Info, Bug, Globe } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n, LOCALE_LABELS, ALL_LOCALES, type Locale } from '@/i18n';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, updatePrinter } = useSettings();
  const { t, locale, setLocale } = useI18n();

  const cycleLocale = useCallback(() => {
    const currentIdx = ALL_LOCALES.indexOf(locale);
    const nextIdx = (currentIdx + 1) % ALL_LOCALES.length;
    setLocale(ALL_LOCALES[nextIdx]);
  }, [locale, setLocale]);

  const togglePaperWidth = useCallback(() => {
    updatePrinter({ paperWidth: settings.printer.paperWidth === 58 ? 80 : 58 });
  }, [settings.printer.paperWidth, updatePrinter]);

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
                  ? (settings.printerConnected ? t.printer.connected : 'Preferred printer saved')
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

          <Pressable onPress={cycleLocale} style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.language}</Text>
              <Text style={styles.settingValue}>{LOCALE_LABELS[locale]}</Text>
            </View>
            <View style={styles.localeRow}>
              {ALL_LOCALES.map((loc: Locale) => (
                <Pressable
                  key={loc}
                  onPress={() => setLocale(loc)}
                  style={[styles.localeChip, loc === locale && styles.localeChipActive]}
                >
                  <Text style={[styles.localeChipText, loc === locale && styles.localeChipTextActive]}>
                    {loc.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bug size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.developer}</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t.settings.devMode}</Text>
              <Text style={styles.settingHint}>{t.settings.devModeHint}</Text>
            </View>
            <Switch
              value={settings.devMode}
              onValueChange={(val) => updateSettings({ devMode: val })}
              trackColor={{ false: Colors.border, true: Colors.goldDark }}
              thumbColor={settings.devMode ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t.settings.about}</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t.settings.version}</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutText}>
            <Text style={styles.aboutBody}>
              {t.settings.aboutBody}
            </Text>
            <Text style={styles.aboutCredit}>
              {t.settings.aboutCredit}
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
  localeRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  localeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  localeChipActive: {
    backgroundColor: Colors.gold,
  },
  localeChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  localeChipTextActive: {
    color: '#fff',
  },
});
