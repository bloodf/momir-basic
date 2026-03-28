import { useState, useCallback, useEffect, useMemo } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Translations } from './types';
import en from './locales/en';
import pt from './locales/pt';
import es from './locales/es';

export type Locale = 'en' | 'pt' | 'es';
export type { Translations };

const locales: Record<Locale, Translations> = { en, pt, es };

const LOCALE_KEY = 'momir_locale';

function getDeviceLocale(): Locale {
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
    const lang = deviceLang.split(/[-_]/)[0].toLowerCase();
    if (lang === 'pt') return 'pt';
    if (lang === 'es') return 'es';
    return 'en';
  } catch {
    return 'en';
  }
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
};

export const ALL_LOCALES: Locale[] = ['en', 'pt', 'es'];

export const [I18nProvider, useI18n] = createContextHook(() => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((stored) => {
      if (stored && (stored === 'en' || stored === 'pt' || stored === 'es')) {
        setLocaleState(stored as Locale);
      } else {
        setLocaleState(getDeviceLocale());
      }
      setLoaded(true);
    }).catch(() => {
      setLocaleState(getDeviceLocale());
      setLoaded(true);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem(LOCALE_KEY, newLocale).catch(() => {});
  }, []);

  const t = useMemo(() => locales[locale], [locale]);

  return useMemo(() => ({
    locale,
    setLocale,
    t,
    loaded,
  }), [locale, setLocale, t, loaded]);
});
