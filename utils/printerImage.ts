import * as ImageManipulator from 'expo-image-manipulator';
import { PNG } from 'pngjs/browser';
import { ditherImage, thresholdDither } from './dither';
import type { DitherAlgorithm as DitherAlgorithmInternal } from './dither';

export interface RasterizeOptions {
  algorithm?: 'floyd' | 'bayer' | 'threshold' | 'none';
  brightness?: number;  // default 1.0
  contrast?: number;    // default 1.0
  threshold?: number;   // default 128
  maxHeightPx?: number; // default 480
}

export interface RasterizeResult {
  base64Bitmap: string;
  widthPx: number;
  heightPx: number;
  previewDataUri: string;
}

// LRU cache capped at 16 entries
type CacheEntry = { key: string; value: RasterizeResult };
const _cache: CacheEntry[] = [];
const CACHE_MAX = 16;

function cacheGet(key: string): RasterizeResult | undefined {
  const idx = _cache.findIndex((e) => e.key === key);
  if (idx === -1) return undefined;
  // move to end (most recently used)
  const [entry] = _cache.splice(idx, 1);
  _cache.push(entry);
  return entry.value;
}

function cacheSet(key: string, value: RasterizeResult): void {
  const idx = _cache.findIndex((e) => e.key === key);
  if (idx !== -1) _cache.splice(idx, 1);
  _cache.push({ key, value });
  if (_cache.length > CACHE_MAX) _cache.shift();
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function applyBrightnessContrast(
  rgba: number[],
  brightness: number,
  contrast: number,
): number[] {
  if (brightness === 1.0 && contrast === 1.0) return rgba;
  const out = new Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = clamp(Math.round((clamp((rgba[i] - 128) * contrast + 128)) * brightness));
    out[i + 1] = clamp(Math.round((clamp((rgba[i + 1] - 128) * contrast + 128)) * brightness));
    out[i + 2] = clamp(Math.round((clamp((rgba[i + 2] - 128) * contrast + 128)) * brightness));
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/** Map PrinterPreferences algorithm names to dither.ts names */
function toDitherAlgorithm(alg: string | undefined): DitherAlgorithmInternal {
  switch (alg) {
    case 'floyd': return 'floyd-steinberg';
    case 'bayer': return 'ordered';
    case 'threshold': return 'threshold';
    default: return 'floyd-steinberg';
  }
}

/**
 * Pack a 1-bit pixel array (0=black, 255=white) into ESC/POS raster bitmap bytes.
 * MSB-first, black=1 bit (ESC/POS convention).
 */
function packBitmap(pixels: number[], width: number, height: number): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const out = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixIdx = (y * width + x) * 4; // RGBA index
      const gray = pixels[pixIdx]; // after dither, R channel holds 0 or 255
      if (gray === 0) {
        // black pixel = 1 bit
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitPos = 7 - (x % 8); // MSB-first
        out[byteIdx] |= (1 << bitPos);
      }
    }
  }
  return out;
}

/**
 * Re-encode a dithered 1-bit pixel array as a PNG data URI for preview.
 * Uses pngjs to produce a grayscale PNG.
 */
function ditherPixelsToDataUri(pixels: number[], width: number, height: number): string {
  const png = new PNG({ width, height, filterType: -1 });
  // pngjs data is a Buffer of RGBA bytes
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    buf[i] = pixels[i];
  }
  png.data = buf;
  png.width = width;
  png.height = height;

  // Synchronous pack
  const packed = PNG.sync.write(png);
  const base64 = packed.toString('base64');
  return `data:image/png;base64,${base64}`;
}

export async function rasterizeCardArtForPrint(
  imageUrl: string,
  widthPx: number,
  options?: RasterizeOptions,
): Promise<RasterizeResult> {
  const algorithm = options?.algorithm ?? 'floyd';
  const brightness = options?.brightness ?? 1.0;
  const contrast = options?.contrast ?? 1.0;
  const threshold = options?.threshold ?? 128;
  const maxHeightPx = options?.maxHeightPx ?? 480;

  const cacheKey = `${imageUrl}|${widthPx}|${algorithm}|${brightness}|${contrast}|${threshold}|${maxHeightPx}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // 1. Resize image to widthPx wide, capped at maxHeightPx tall
  const manipResult = await ImageManipulator.manipulateAsync(
    imageUrl,
    [{ resize: { width: widthPx } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true },
  );

  if (!manipResult.base64) {
    throw new Error('expo-image-manipulator did not return base64 output');
  }

  // Check height and re-resize if needed
  let finalBase64 = manipResult.base64;
  let finalWidth = manipResult.width;
  let finalHeight = manipResult.height;

  if (finalHeight > maxHeightPx) {
    const scale = maxHeightPx / finalHeight;
    const clampedWidth = Math.round(finalWidth * scale);
    const resized = await ImageManipulator.manipulateAsync(
      imageUrl,
      [{ resize: { width: clampedWidth, height: maxHeightPx } }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true },
    );
    finalBase64 = resized.base64 ?? finalBase64;
    finalWidth = resized.width;
    finalHeight = resized.height;
  }

  // 2. Decode PNG pixels using pngjs
  const pngBuffer = Buffer.from(finalBase64, 'base64');
  const decoded = PNG.sync.read(pngBuffer);
  const rgbaPixels = Array.from(decoded.data as Buffer) as number[];

  // 3. Apply brightness/contrast adjustments
  const adjusted = applyBrightnessContrast(rgbaPixels, brightness, contrast);

  // 4. Dither
  let ditheredPixels: number[];
  if (algorithm === 'none') {
    // Just quantize using threshold
    ditheredPixels = [];
    for (let i = 0; i < adjusted.length; i += 4) {
      const r = adjusted[i];
      const g = adjusted[i + 1];
      const b = adjusted[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const val = gray >= threshold ? 255 : 0;
      ditheredPixels.push(val, val, val, 255);
    }
  } else if (algorithm === 'threshold') {
    ditheredPixels = thresholdDither(adjusted, finalWidth, finalHeight, threshold);
  } else {
    const ditherAlg = toDitherAlgorithm(algorithm);
    ditheredPixels = ditherImage(adjusted, finalWidth, finalHeight, ditherAlg);
  }

  // 5. Pack into ESC/POS raster bitmap bytes
  const bitmapBytes = packBitmap(ditheredPixels, finalWidth, finalHeight);
  const base64Bitmap = Buffer.from(bitmapBytes).toString('base64');

  // 6. Build preview data URI
  const previewDataUri = ditherPixelsToDataUri(ditheredPixels, finalWidth, finalHeight);

  const result: RasterizeResult = {
    base64Bitmap,
    widthPx: finalWidth,
    heightPx: finalHeight,
    previewDataUri,
  };

  cacheSet(cacheKey, result);
  return result;
}
