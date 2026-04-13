import '@testing-library/react-native';

// Global test timeout
jest.setTimeout(10000);

// Only suppress specific known noisy warnings during tests.
// Logger output (error/warn) is now visible in test runs for debugging.
// Remove blanket suppression so structured logger calls surface during CI.
// Allow specific known noisy warnings to be suppressed per-test if needed.
// By default, all console output is visible to aid debugging.