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

export function isPrinterImageLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return [
    /renderAsync/i,
    /could not load the image/i,
    /IMAGE_LOAD_FAILED/i,
    /download failed/i,
  ].some((pattern) => pattern.test(message));
}

export function formatPrinterImageProcessingError(error: unknown): string {
  if (isPrinterImageNativeCompatibilityError(error)) {
    return 'Image pre-processing is unavailable in this build. Rebuild the app with Expo SDK-compatible native modules.';
  }

  if (isPrinterImageLoadError(error)) {
    return 'Unable to load card art for printing. Check your connection and try again.';
  }

  return getErrorMessage(error);
}
