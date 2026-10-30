import React from 'react';
import { render } from '@testing-library/react-native';

const mockBack = jest.fn();
let mockOutcome: { type: 'success' | 'failed'; message: string } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => ({
    cardJson: JSON.stringify({ id: 'c1', name: 'Flourishing Fox', typeLine: 'Creature', setCode: 'iko' }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('lucide-react-native', () => ({ X: () => null }));

jest.mock('@/features/print-preview/usePrintPreview', () => ({
  usePrintPreview: () => ({
    printerState: 'connected',
    outcomeBanner: mockOutcome,
    isPrinting: false,
    sendPrintJob: jest.fn(),
  }),
}));

jest.mock('@/features/print-preview/useReceiptCapture', () => ({
  useReceiptCapture: () => ({ isSaving: false, saveToGallery: jest.fn() }),
}));

jest.mock('@/screens/print-preview/ReceiptContent', () => ({ ReceiptContent: () => null }));
jest.mock('@/screens/print-preview/PrintFooter', () => ({ PrintFooter: () => null }));

import PrintPreviewScreen from '@/screens/PrintPreviewScreen';

describe('PrintPreviewScreen after printing', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('closes the preview when the print succeeds', () => {
    mockOutcome = { type: 'success', message: 'Card receipt printed successfully.' };

    render(<PrintPreviewScreen />);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('stays open when the print fails so the error is visible', () => {
    mockOutcome = { type: 'failed', message: 'Printer unreachable' };

    render(<PrintPreviewScreen />);

    expect(mockBack).not.toHaveBeenCalled();
  });

  it('stays open before anything is printed', () => {
    mockOutcome = null;

    render(<PrintPreviewScreen />);

    expect(mockBack).not.toHaveBeenCalled();
  });
});
