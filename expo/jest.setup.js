import '@testing-library/react-native';

// Global test timeout
jest.setTimeout(10000);

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};