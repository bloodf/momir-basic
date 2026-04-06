export function calculateAverageLuminance(imageData: number[]): number {
  if (imageData.length < 4) return 1.0;
  let totalLuminance = 0;
  const pixelCount = imageData.length / 4;
  for (let i = 0; i < pixelCount; i++) {
    const r = imageData[i * 4] / 255;
    const g = imageData[i * 4 + 1] / 255;
    const b = imageData[i * 4 + 2] / 255;
    totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return totalLuminance / pixelCount;
}

export function preprocessDarkImage(imageData: number[]): number[] {
  const result = new Array(imageData.length);
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const luminance = 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;

    if (luminance < 0.4) {
      const factor = 1.0 + (0.4 - luminance) * 1.5;
      result[i] = Math.min(255, Math.round(r * factor));
      result[i + 1] = Math.min(255, Math.round(g * factor));
      result[i + 2] = Math.min(255, Math.round(b * factor));
    } else {
      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
    }
    result[i + 3] = a;
  }
  return result;
}

export function isDarkImage(imageData: number[]): boolean {
  return calculateAverageLuminance(imageData) < 0.4;
}

export function preprocessAndDither(
  imageData: number[],
  width: number,
  height: number,
  algorithm: DitherAlgorithm = 'floyd-steinberg'
): number[] {
  if (isDarkImage(imageData)) {
    const preprocessed = preprocessDarkImage(imageData);
    return ditherImage(preprocessed, width, height, algorithm);
  }
  return ditherImage(imageData, width, height, algorithm);
}

export function floydSteinbergDither(
  imageData: number[],
  width: number,
  height: number
): number[] {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = gray[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      output[idx] = newPixel;
      const error = oldPixel - newPixel;

      if (x + 1 < width) gray[idx + 1] += error * 7 / 16;
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += error * 3 / 16;
        gray[(y + 1) * width + x] += error * 5 / 16;
        if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += error * 1 / 16;
      }
    }
  }

  const result: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const val = output[i];
    result.push(val, val, val, 255);
  }
  return result;
}

export function thresholdDither(
  imageData: number[],
  width: number,
  height: number,
  threshold: number = 128
): number[] {
  const result: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const val = gray < threshold ? 0 : 255;
    result.push(val, val, val, 255);
  }
  return result;
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function orderedDither(
  imageData: number[],
  width: number,
  height: number
): number[] {
  const result: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const r = imageData[i * 4];
      const g = imageData[i * 4 + 1];
      const b = imageData[i * 4 + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const threshold = ((BAYER_4X4[y % 4][x % 4] + 0.5) / 16) * 255;
      const val = gray > threshold ? 255 : 0;
      result.push(val, val, val, 255);
    }
  }
  return result;
}

export type DitherAlgorithm = 'floyd-steinberg' | 'ordered' | 'threshold';

export function ditherImage(
  imageData: number[],
  width: number,
  height: number,
  algorithm: DitherAlgorithm = 'floyd-steinberg'
): number[] {
  switch (algorithm) {
    case 'floyd-steinberg':
      return floydSteinbergDither(imageData, width, height);
    case 'ordered':
      return orderedDither(imageData, width, height);
    case 'threshold':
      return thresholdDither(imageData, width, height);
    default:
      return floydSteinbergDither(imageData, width, height);
  }
}
