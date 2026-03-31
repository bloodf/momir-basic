const printerRepo = {
  upsertPrinter: jest.fn(),
  getPrinterByAddress: jest.fn(),
  getPrinterById: jest.fn(),
  listPrinters: jest.fn(),
  deletePrinter: jest.fn(),
  resetPrinters: jest.fn(),
};

export { printerRepo };
