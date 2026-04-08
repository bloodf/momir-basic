import {
  formatPrinterImageProcessingError,
  isPrinterImageNativeCompatibilityError,
} from '../../utils/printerImageErrors';

describe('printerImageErrors', () => {
  it('detects native compatibility failures from expo-image-manipulator', () => {
    const error = new Error(
      "Call to function 'ExpoImageManipulator.manipulate' has been rejected. -> Caused by: java.lang.NoSuchMethodError: No virtual method getRuntimeContext(...) in class expo.modules.imagemanipulator.ImageManipulatorModule",
    );

    expect(isPrinterImageNativeCompatibilityError(error)).toBe(true);
    expect(formatPrinterImageProcessingError(error)).toBe(
      'Image pre-processing is unavailable in this build. Rebuild the app with Expo SDK-compatible native modules.',
    );
  });

  it('preserves non-compatibility image processing errors', () => {
    const error = new Error('expo-image-manipulator did not return base64 output');

    expect(isPrinterImageNativeCompatibilityError(error)).toBe(false);
    expect(formatPrinterImageProcessingError(error)).toBe(error.message);
  });
});
