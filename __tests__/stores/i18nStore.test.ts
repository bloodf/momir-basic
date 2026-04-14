describe('useI18nStore', () => {
  const loadMMKVMock = () => require('react-native-mmkv') as {
    __resetMMKVMock: () => void;
  };
  const loadStoreModule = () => require('@/stores/i18nStore') as typeof import('@/stores/i18nStore');

  beforeEach(() => {
    jest.resetModules();
    loadMMKVMock().__resetMMKVMock();
    const reactNative = require('react-native');
    reactNative.NativeModules.SettingsManager = {
      settings: {
        AppleLocale: 'pt-BR',
        AppleLanguages: ['pt-BR'],
      },
    };
  });

  it('initializes with the device locale when no persisted locale exists', () => {
    const { useI18nStore } = loadStoreModule();

    expect(useI18nStore.getState().locale).toBe('pt');
  });

  it('setLocale updates the locale and persists it', () => {
    const { useI18nStore } = loadStoreModule();

    useI18nStore.getState().setLocale('ja');

    expect(useI18nStore.getState().locale).toBe('ja');
  });

  it('useI18n returns translations for the current locale', () => {
    const { useI18nStore, useI18n, locales, LOCALE_TO_SCRYFALL_LANG } = loadStoreModule();
    useI18nStore.getState().setLocale('de');

    expect(typeof useI18n).toBe('function');
    expect(locales[useI18nStore.getState().locale].tabs.search).toBe('Suchen');
    expect(LOCALE_TO_SCRYFALL_LANG[useI18nStore.getState().locale]).toBe('de');
  });

  it('maps the locale to the expected scryfall language code', () => {
    const { useI18nStore, LOCALE_TO_SCRYFALL_LANG } = loadStoreModule();
    useI18nStore.getState().setLocale('zht');

    expect(LOCALE_TO_SCRYFALL_LANG[useI18nStore.getState().locale]).toBe('zht');
  });

  it('persists locale across store recreation', () => {
    const first = loadStoreModule();
    first.useI18nStore.getState().setLocale('ru');

    jest.resetModules();
    const second = loadStoreModule();

    expect(second.useI18nStore.getState().locale).toBe('ru');
  });
});
