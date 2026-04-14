import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ALL_LOCALES,
  getDeviceLocale,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  LOCALE_TO_SCRYFALL_LANG,
  locales,
  type Locale,
  type Translations,
} from '@/i18n/index';

import { MMKVStorage } from './mmkv-storage';

const LOCALE_KEY = 'momir_locale';

type I18nState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const resolveDeviceLocale = (): Locale =>
  typeof getDeviceLocale === 'function' ? getDeviceLocale() : 'en';

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: resolveDeviceLocale(),
      setLocale: (locale) => {
        set({ locale });
      },
    }),
    {
      name: LOCALE_KEY,
      storage: createJSONStorage(() => MMKVStorage),
    },
  ),
);

export function useI18n(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  scryfallLang: string;
} {
  const locale = useI18nStore((state) => state.locale);
  const setLocale = useI18nStore((state) => state.setLocale);

  return {
    locale,
    setLocale,
    t: locales[locale],
    scryfallLang: LOCALE_TO_SCRYFALL_LANG[locale],
  };
}

export {
  ALL_LOCALES,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  LOCALE_TO_SCRYFALL_LANG,
  locales,
  type Locale,
};
