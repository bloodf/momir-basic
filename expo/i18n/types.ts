export interface Translations {
  common: {
    cast: string;
    cancel: string;
    dismiss: string;
    goBack: string;
    print: string;
    reroll: string;
    save: string;
    search: string;
    prev: string;
    next: string;
    mana: string;
    download: string;
    share: string;
  };
  home: {
    fetchingCards: (count: number) => string;
    printerConnected: string;
    turn: string;
  };
  cardTypes: {
    creature: string;
    commander: string;
    artifact: string;
    equipment: string;
    enchantment: string;
    aura: string;
    instants: string;
    sorceries: string;
    lands: string;
  };
  cardTypeDescriptions: {
    creature: string;
    commander: string;
    artifact: string;
    equipment: string;
    enchantment: string;
    aura: string;
    instants: string;
    sorceries: string;
    lands: string;
  };
  card: {
    cardDetails: string;
    set: string;
    rarity: string;
    number: string;
    artist: string;
    manaValue: string;
    cardNotFound: string;
    noCardData: string;
    powerToughness: string;
  };
  printPreview: {
    title: string;
    devMode: string;
    devModeLabel: string;
    thermalReceipt: (width: number) => string;
    devModeInfo: string;
    thermalInfo: (width: number) => string;
    artBy: (artist: string) => string;
    saveToGallery: string;
    printCard: string;
    savedToGallery: string;
    printing: string;
    sendingToPrinter: (name: string, printerName: string) => string;
    bluetoothRequired: string;
    noPrinter: string;
    noPrinterMsg: string;
    notAvailable: string;
    devPrintNotSupported: string;
    permissionDenied: string;
    galleryAccessRequired: string;
    saveFailed: string;
    saveFailedMsg: string;
  };
  tabs: {
    cast: string;
    search: string;
    history: string;
    game: string;
    settings: string;
  };
  settings: {
    title: string;
    printerSetup: string;
    devMode: string;
    excludeFunnySets: string;
  };
  errors: {
    fetchFailed: string;
    noCardFound: (type: string, cmc: number) => string;
  };
}
