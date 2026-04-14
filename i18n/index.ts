import { useState, useCallback, useEffect, useMemo } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { ErrorCategory, logger } from '@/utils/logger';
import { Translations } from './types';
import en from './locales/en';
import pt from './locales/pt';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import ru from './locales/ru';
import zhs from './locales/zhs';
import zht from './locales/zht';

export type Locale = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht';
export type { Translations };

export const locales: Record<Locale, Translations> = {
  en,
  pt,
  es,
  fr,
  de,
  it,
  ja,
  ko,
  ru,
  zhs,
  zht,
};

const LOCALE_KEY = 'momir_locale';

export const LOCALE_TO_SCRYFALL_LANG: Record<Locale, string> = {
  en: 'en',
  pt: 'pt',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  ru: 'ru',
  zhs: 'zhs',
  zht: 'zht',
};

export function getDeviceLocale(): Locale {
  try {
    let deviceLang = 'en';
    if (Platform.OS === 'ios') {
      deviceLang =
        NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
        'en';
    } else if (Platform.OS === 'android') {
      deviceLang = NativeModules.I18nManager?.localeIdentifier ?? 'en';
    } else if (Platform.OS === 'web') {
      deviceLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
    }

    const normalized = deviceLang.toLowerCase().replace(/-/g, '_');
    const lang = normalized.split('_')[0];
    const region = normalized.split('_')[1];

    if (lang === 'zh') {
      if (region === 'tw' || region === 'hk' || region === 'hant') return 'zht';
      return 'zhs';
    }

    const validLocales: Locale[] = ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'ru'];
    const match = validLocales.find(l => l === lang);
    if (match) return match;

    return 'en';
  } catch (error) {
    logger.warn(ErrorCategory.Storage, 'Device locale detection failed, falling back to en', error);
    return 'en';
  }
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  zhs: '简体中文',
  zht: '繁體中文',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  pt: '🇧🇷',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ru: '🇷🇺',
  zhs: '🇨🇳',
  zht: '🇹🇼',
};

export const ALL_LOCALES: Locale[] = [
  'en',
  'pt',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'ru',
  'zhs',
  'zht',
];

function isValidLocale(value: string): value is Locale {
  return ALL_LOCALES.includes(value as Locale);
}

export const [I18nProvider, useI18n] = createContextHook(() => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY)
      .then(stored => {
        if (stored && isValidLocale(stored)) {
          setLocaleState(stored);
        } else {
          setLocaleState(getDeviceLocale());
        }
        setLoaded(true);
      })
      .catch(error => {
        logger.error(ErrorCategory.Storage, 'Failed to read stored locale', error);
        setLocaleState(getDeviceLocale());
        setLoaded(true);
      });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem(LOCALE_KEY, newLocale).catch(error => {
      logger.error(ErrorCategory.Storage, 'Failed to persist locale', error);
    });
  }, []);

  const t = useMemo(() => locales[locale], [locale]);

  const scryfallLang = useMemo(() => LOCALE_TO_SCRYFALL_LANG[locale], [locale]);

  return useMemo(
    () => ({
      locale,
      setLocale,
      t,
      loaded,
      scryfallLang,
    }),
    [locale, setLocale, t, loaded, scryfallLang]
  );
});
