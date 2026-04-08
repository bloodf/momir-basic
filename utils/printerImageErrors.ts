function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Image pre-processing failed.';
}

export function isPrinterImageNativeCompatibilityError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return [
    /NoSuchMethodError/i,
    /getRuntimeContext/i,
    /ImageManipulatorModule/i,
    /Expo[lI]mageManipulator\.manipulate/i,
  ].some((pattern) => pattern.test(message));
}

export function formatPrinterImageProcessingError(error: unknown): string {
  if (isPrinterImageNativeCompatibilityError(error)) {
    return 'Image pre-processing is unavailable in this build. Rebuild the app with Expo SDK-compatible native modules.';
  }

  return getErrorMessage(error);
}
