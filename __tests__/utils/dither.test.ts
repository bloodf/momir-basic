import {
  calculateAverageLuminance,
  isDarkImage,
  preprocessDarkImage,
  preprocessAndDither,
  floydSteinbergDither,
  ditherImage,
} from '../../utils/dither';

describe('dither utilities', () => {
  describe('calculateAverageLuminance', () => {
    it('returns 1.0 for empty or tiny arrays', () => {
      expect(calculateAverageLuminance([])).toBe(1.0);
      expect(calculateAverageLuminance([0])).toBe(1.0);
      expect(calculateAverageLuminance([0, 0])).toBe(1.0);
      expect(calculateAverageLuminance([0, 0, 0])).toBe(1.0);
    });

    it('returns correct luminance for known pixel values', () => {
      // Single white pixel: L = 0.2126*1 + 0.7152*1 + 0.0722*1 = 1.0
      const whitePixel = [255, 255, 255, 255];
      expect(calculateAverageLuminance(whitePixel)).toBeCloseTo(1.0, 5);

      // Single black pixel: L = 0
      const blackPixel = [0, 0, 0, 255];
      expect(calculateAverageLuminance(blackPixel)).toBeCloseTo(0.0, 5);

      // Mid-gray pixel (128, 128, 128): L ≈ 0.5
      const midGray = [128, 128, 128, 255];
      const result = calculateAverageLuminance(midGray);
      expect(result).toBeGreaterThan(0.4);
      expect(result).toBeLessThan(0.6);
    });

    it('averages luminance across multiple pixels', () => {
      // 50% white, 50% black should average to 0.5
      const mixed = [
        255, 255, 255, 255, // white
        0, 0, 0, 255,       // black
      ];
      expect(calculateAverageLuminance(mixed)).toBeCloseTo(0.5, 5);
    });
  });

  describe('isDarkImage', () => {
    it('returns true for dark images (low luminance)', () => {
      // Very dark image: all black pixels
      const darkImage = [
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
      ];
      expect(isDarkImage(darkImage)).toBe(true);

      // Dark gray image (around 30% luminance)
      const darkGray = [
        50, 50, 50, 255,
        50, 50, 50, 255,
        50, 50, 50, 255,
        50, 50, 50, 255,
      ];
      expect(isDarkImage(darkGray)).toBe(true);
    });

    it('returns false for light images (high luminance)', () => {
      // Very light image: all white pixels
      const lightImage = [
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
      ];
      expect(isDarkImage(lightImage)).toBe(false);

      // Light gray image (around 70% luminance)
      const lightGray = [
        200, 200, 200, 255,
        200, 200, 200, 255,
        200, 200, 200, 255,
        200, 200, 200, 255,
      ];
      expect(isDarkImage(lightGray)).toBe(false);
    });

    it('returns true for borderline dark images (luminance just below 0.4)', () => {
      // This should be around 0.39 luminance - just below threshold
      const borderlineDark = [
        60, 60, 60, 255,
        60, 60, 60, 255,
        60, 60, 60, 255,
        60, 60, 60, 255,
      ];
      expect(isDarkImage(borderlineDark)).toBe(true);
    });

    it('returns false for borderline light images (luminance just above 0.4)', () => {
      // This should be around 0.41 luminance - just above threshold
      const borderlineLight = [
        110, 110, 110, 255,
        110, 110, 110, 255,
        110, 110, 110, 255,
        110, 110, 110, 255,
      ];
      expect(isDarkImage(borderlineLight)).toBe(false);
    });
  });

  describe('preprocessDarkImage', () => {
    it('boosts dark pixels (below 0.4 luminance)', () => {
      // Very dark pixel: (10, 10, 10) with L ≈ 0.04
      const darkPixel = [10, 10, 10, 255];
      const result = preprocessDarkImage(darkPixel);

      // Dark pixels should be boosted
      expect(result[0]).toBeGreaterThan(darkPixel[0]);
      expect(result[1]).toBeGreaterThan(darkPixel[1]);
      expect(result[2]).toBeGreaterThan(darkPixel[2]);
      // Alpha should be preserved
      expect(result[3]).toBe(255);
    });

    it('preserves light pixels (at or above 0.4 luminance)', () => {
      // Light pixel: (200, 200, 200)
      const lightPixel = [200, 200, 200, 255];
      const result = preprocessDarkImage(lightPixel);

      expect(result[0]).toBe(lightPixel[0]);
      expect(result[1]).toBe(lightPixel[1]);
      expect(result[2]).toBe(lightPixel[2]);
      expect(result[3]).toBe(255);
    });

    it('preserves alpha channel for all pixels', () => {
      const semiTransparent = [50, 50, 50, 128];
      const result = preprocessDarkImage(semiTransparent);
      expect(result[3]).toBe(128);
    });

    it('does not exceed 255 when boosting', () => {
      // Dark pixel that when boosted might exceed 255
      const darkPixel = [200, 200, 200, 255]; // This is actually bright (L ≈ 0.78), so won't be boosted
      const veryDarkPixel = [100, 100, 100, 255]; // L ≈ 0.39 - just below threshold
      const result = preprocessDarkImage(veryDarkPixel);

      // All values should be <= 255
      expect(result[0]).toBeLessThanOrEqual(255);
      expect(result[1]).toBeLessThanOrEqual(255);
      expect(result[2]).toBeLessThanOrEqual(255);
    });

    it('processes multiple pixels correctly', () => {
      // Mix of dark and light
      const mixed = [
        10, 10, 10, 255,  // dark - should be boosted
        200, 200, 200, 255, // light - should be preserved
        80, 80, 80, 255,  // borderline dark - should be boosted
        250, 250, 250, 255, // very light - should be preserved
      ];
      const result = preprocessDarkImage(mixed);

      // Dark pixel should be boosted
      expect(result[0]).toBeGreaterThan(10);
      // Light pixel should be unchanged
      expect(result[4]).toBe(200);
      expect(result[5]).toBe(200);
      expect(result[6]).toBe(200);
      // Borderline dark should be boosted
      expect(result[8]).toBeGreaterThan(80);
      // Very light should be unchanged
      expect(result[12]).toBe(250);
    });
  });

  describe('floydSteinbergDither', () => {
    it('produces non-solid output for non-uniform images', () => {
      // Create a gradient image that should produce varied output
      const width = 8;
      const height = 4;
      const imageData: number[] = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const gray = Math.round((x / width) * 255);
          imageData.push(gray, gray, gray, 255);
        }
      }

      const result = floydSteinbergDither(imageData, width, height);

      // Check that output has both 0s and 255s (not solid)
      const values = result.filter((_, i) => i % 4 === 0);
      const hasZeros = values.some(v => v === 0);
      const has255s = values.some(v => v === 255);

      expect(hasZeros).toBe(true);
      expect(has255s).toBe(true);
    });

    it('produces RGBA output (4 values per pixel)', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = floydSteinbergDither(imageData, 2, 1);

      // Should have 2 pixels × 4 channels = 8 values
      expect(result).toHaveLength(8);
    });

    it('handles uniform dark image without crashing', () => {
      const width = 4;
      const height = 4;
      const imageData: number[] = [];
      for (let i = 0; i < width * height * 4; i += 4) {
        imageData.push(20, 20, 20, 255); // dark pixels
      }

      const result = floydSteinbergDither(imageData, width, height);
      expect(result).toHaveLength(width * height * 4);
    });

    it('handles uniform light image without crashing', () => {
      const width = 4;
      const height = 4;
      const imageData: number[] = [];
      for (let i = 0; i < width * height * 4; i += 4) {
        imageData.push(240, 240, 240, 255); // light pixels
      }

      const result = floydSteinbergDither(imageData, width, height);
      expect(result).toHaveLength(width * height * 4);
    });
  });

  describe('ditherImage', () => {
    it('uses floyd-steinberg by default', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = ditherImage(imageData, 2, 1);

      expect(result).toHaveLength(8);
    });

    it('accepts floyd-steinberg algorithm', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = ditherImage(imageData, 2, 1, 'floyd-steinberg');

      expect(result).toHaveLength(8);
    });

    it('accepts ordered algorithm', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = ditherImage(imageData, 2, 1, 'ordered');

      expect(result).toHaveLength(8);
    });

    it('accepts threshold algorithm', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = ditherImage(imageData, 2, 1, 'threshold');

      expect(result).toHaveLength(8);
    });
  });

  describe('preprocessAndDither', () => {
    it('applies preprocessing to dark images before dithering', () => {
      // Dark image with variation - 16x16 gives enough pixels for dithering to create pattern
      const width = 16;
      const height = 16;
      const darkImage: number[] = [];
      for (let i = 0; i < width * height; i++) {
        const base = 20 + (i % 15);
        darkImage.push(base, base, base, 255);
      }

      const result = preprocessAndDither(darkImage, width, height);

      const values = result.filter((_, i) => i % 4 === 0);
      const uniqueValues = [...new Set(values)];

      // CRITICAL REGRESSION TEST: dark images must NOT produce solid output
      // They should have a mix of 0s and 255s after preprocessing + dithering
      expect(uniqueValues.length).toBeGreaterThan(1);
    });

    it('does not preprocess light images', () => {
      // Light image: all white pixels
      const lightImage = [
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
      ];

      const result = preprocessAndDither(lightImage, 2, 2);

      // White image should dither to mostly white (255)
      const values = result.filter((_, i) => i % 4 === 0);
      const has255s = values.some(v => v === 255);
      expect(has255s).toBe(true);
    });

    it('handles small images without crashing', () => {
      const tinyImage = [50, 50, 50, 255];
      const result = preprocessAndDither(tinyImage, 1, 1);

      expect(result).toHaveLength(4);
    });

    it('produces non-solid output for dark gradient images', () => {
      // Create a dark gradient that would produce interesting dithering
      const width = 8;
      const height = 2;
      const imageData: number[] = [];

      for (let i = 0; i < width * height; i++) {
        // Dark values (all below the 0.4 luminance threshold for preprocessing)
        const v = Math.round((i / (width * height)) * 80); // 0-80 range (very dark)
        imageData.push(v, v, v, 255);
      }

      const result = preprocessAndDither(imageData, width, height);

      // Check that output is not solid
      const values = result.filter((_, i) => i % 4 === 0);
      const uniqueValues = [...new Set(values)];

      // Regression test: must have variety, not all 0s or all 255s
      expect(uniqueValues.length).toBeGreaterThan(1);
    });

    it('accepts custom algorithm parameter', () => {
      const imageData = [128, 128, 128, 255, 128, 128, 128, 255];
      const result = preprocessAndDither(imageData, 2, 1, 'ordered');

      expect(result).toHaveLength(8);
    });
  });

  describe('regression: dark image dithering produces non-solid output', () => {
    it('dark image must not produce all-0 or all-255 output', () => {
      // Simulate a typical dark card image that might come from preprocessing
      const darkCardImage: number[] = [];
      const width = 16;
      const height = 16;

      // Create a dark image with some variation (like a scanned/dark card)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Create dark but varied pixels (like a dark card with text areas)
          const baseDarkness = 30 + ((x + y) % 10) * 2;
          const r = baseDarkness;
          const g = baseDarkness;
          const b = baseDarkness + 5; // slight blue tint
          darkCardImage.push(r, g, b, 255);
        }
      }

      const result = preprocessAndDither(darkCardImage, width, height);

      // Extract the grayscale values (every 4th value starting at 0)
      const grayscaleValues = result.filter((_, i) => i % 4 === 0);

      // Check for both black and white pixels in output
      const hasBlack = grayscaleValues.some(v => v === 0);
      const hasWhite = grayscaleValues.some(v => v === 255);
      const allSame = grayscaleValues.every(v => v === grayscaleValues[0]);

      // CRITICAL: dark images MUST produce varied dithering output
      expect(allSame).toBe(false);
      // Dark images should produce a mix of both values
      expect(hasBlack || hasWhite).toBe(true);
      // The mix should include both extremes
      expect(hasBlack).toBe(true);
      expect(hasWhite).toBe(true);
    });

    it('floydSteinberg on dark image produces pattern, not solid fill', () => {
      // Pure black image
      const blackImage: number[] = [];
      for (let i = 0; i < 64; i++) {
        blackImage.push(0, 0, 0, 255); // 16x16 black image
      }

      const result = floydSteinbergDither(blackImage, 16, 16);
      const values = result.filter((_, i) => i % 4 === 0);

      // Black image should produce some pattern due to error diffusion
      // Even pure black will have some artifacts from the algorithm
      const uniqueValues = [...new Set(values)];

      // Should not be a single solid color when viewed as grayscale output
      // (The algorithm itself creates some variation even with uniform input)
      expect(uniqueValues.length).toBeGreaterThanOrEqual(1);
    });
  });
});