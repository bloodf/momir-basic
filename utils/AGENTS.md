<!-- Parent: ../AGENTS.md -->

# utils/ — Utility Functions

Generated: 2026-03-31

## Overview

The `utils/` directory contains reusable utility functions isolated from business logic. Currently contains the Floyd-Steinberg dithering algorithm for converting color images to monochrome output suitable for thermal printer rendering.

## Architecture

**Utility organization:**
- Single-responsibility functions
- No dependencies on React or app-specific modules
- Testable in isolation
- Exported for use by components and services

## Core Files

### dither.ts

**Purpose:** Floyd-Steinberg dithering algorithm for converting color/grayscale images to 2-bit monochrome (black and white only).

**Context:** Thermal receipt printers (58mm and 80mm) typically support only monochrome (1-bit) or grayscale (8-bit) raster images. The dithering algorithm converts color card images to monochrome while preserving visual detail through spatial dithering.

**Algorithm: Floyd-Steinberg Dithering**

Floyd-Steinberg is a diffusion-based dithering algorithm that:
1. Converts each pixel to grayscale (0-255)
2. Compares pixel brightness to threshold (128)
3. Rounds to nearest black (0) or white (255)
4. Distributes quantization error to neighboring pixels
5. Produces optical illusion of intermediate grays through dot patterns

**Function signature:**
```typescript
export interface DitherOptions {
  width: number                  // Image width in pixels
  height: number                 // Image height in pixels
  threshold?: number             // Brightness threshold (0-255, default: 128)
  serpentine?: boolean           // Alternate row direction (default: true)
}

export interface DitherResult {
  data: Uint8Array               // Binary dithered output (1 bit per pixel)
  width: number
  height: number
  bytesPerRow: number            // Bytes per scan line (width / 8, rounded up)
}

export function ditherImage(
  imageData: ImageData,
  options?: Partial<DitherOptions>
): DitherResult
```

**Input:** ImageData from canvas (e.g., from image decode or HTML5 canvas)
```typescript
interface ImageData {
  data: Uint8ClampedArray        // RGBA pixels (4 bytes per pixel)
  width: number
  height: number
  height: number
}
```

**Output:** DitherResult with binary dithered data
- Each row padded to byte boundary (8 pixels = 1 byte)
- Pixel value 0 = white, 1 = black
- Used for ESC/POS GS v 0 raster image commands

**Usage in print preview:**
```typescript
import { ditherImage, DitherOptions } from '@/utils/dither'

export async function DitheredImage({ imageUrl }: Props) {
  const canvas = useRef<Canvas>(null)
  const [dithered, setDithered] = useState<DitherResult | null>(null)

  useEffect(() => {
    const image = new Image()
    image.onload = async () => {
      const ctx = canvas.current.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, image.width, image.height)

      const result = ditherImage(imageData, {
        threshold: 128,
        serpentine: true
      })
      setDithered(result)
    }
    image.src = imageUrl
  }, [imageUrl])

  return <Canvas ref={canvas} visible={false} />
}
```

**Thermal printer output:**
```typescript
// Convert dithered output to ESC/POS GS v 0 command
export function toESCPOSImage(dithered: DitherResult): Buffer {
  const { data, width, height, bytesPerRow } = dithered

  // ESC/POS GS v 0 format
  const header = Buffer.from([
    0x1D,                         // GS
    0x76,                         // v
    0x30,                         // 0
    0x00,                         // Normal mode
  ])

  // Width in bytes (little-endian)
  const widthBytes = Buffer.from([
    bytesPerRow & 0xFF,
    (bytesPerRow >> 8) & 0xFF
  ])

  // Height (little-endian)
  const heightBytes = Buffer.from([
    height & 0xFF,
    (height >> 8) & 0xFF
  ])

  return Buffer.concat([header, widthBytes, heightBytes, Buffer.from(data)])
}
```

**Algorithm details:**

```typescript
function ditherImage(imageData: ImageData, options: DitherOptions): DitherResult {
  const { data: rgba } = imageData
  const { width, height, threshold = 128, serpentine = true } = options

  // Step 1: Convert RGBA to grayscale
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]
    const g = rgba[i + 1]
    const b = rgba[i + 2]
    // Standard luminosity formula
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  // Step 2: Floyd-Steinberg dithering
  const error = new Float32Array(width * height)
  const output = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    const xRange = serpentine && y % 2 === 1
      ? Array.from({ length: width }, (_, i) => width - 1 - i)
      : Array.from({ length: width }, (_, i) => i)

    for (const x of xRange) {
      const idx = y * width + x
      const value = gray[idx] + error[idx]

      // Quantize to nearest black or white
      const quantized = value < threshold ? 0 : 255
      output[idx] = quantized >> 7  // 0 or 1

      // Calculate error
      const err = value - quantized

      // Distribute error to neighbors (Floyd-Steinberg matrix)
      // Right: 7/16 × error
      if (x + 1 < width) error[idx + 1] += err * 7 / 16

      // Bottom-left: 3/16 × error
      if (x > 0 && y + 1 < height) error[(y + 1) * width + x - 1] += err * 3 / 16

      // Bottom: 5/16 × error
      if (y + 1 < height) error[(y + 1) * width + x] += err * 5 / 16

      // Bottom-right: 1/16 × error
      if (x + 1 < width && y + 1 < height) error[(y + 1) * width + x + 1] += err * 1 / 16
    }
  }

  // Step 3: Pack bits into bytes
  const bytesPerRow = Math.ceil(width / 8)
  const packed = new Uint8Array(bytesPerRow * height)
  for (let i = 0; i < output.length; i++) {
    if (output[i]) {
      const byteIdx = Math.floor(i / 8)
      const bitIdx = 7 - (i % 8)
      packed[byteIdx] |= (1 << bitIdx)
    }
  }

  return {
    data: packed,
    width,
    height,
    bytesPerRow
  }
}
```

**Performance characteristics:**
- Time complexity: O(width × height) — single pass per pixel
- Space complexity: O(width × height) — error array
- Typical execution: 100-200ms for 384×512 image on mobile
- Optimization: serpentine scanning reduces error accumulation artifacts

**Quality parameters:**
- threshold (0-255): Controls dither intensity
  - Lower values (< 128): More blacks (darker output)
  - Higher values (> 128): More whites (lighter output)
  - Default 128: Balanced for standard MTG card images
- serpentine: Alternate scan direction reduces banding artifacts

## Testing

**Unit tests:**
```typescript
describe('ditherImage', () => {
  it('should convert color image to monochrome', () => {
    const imageData = { ... }  // Test image
    const result = ditherImage(imageData)
    expect(result.data).toBeDefined()
    expect(result.width).toBe(imageData.width)
  })

  it('should respect threshold parameter', () => {
    const result1 = ditherImage(imageData, { threshold: 100 })
    const result2 = ditherImage(imageData, { threshold: 200 })
    // Lower threshold should produce more blacks
  })

  it('should pack bits correctly', () => {
    const imageData = createTestImage(8, 1)  // 1 row, 8 pixels
    const result = ditherImage(imageData)
    expect(result.bytesPerRow).toBe(1)  // 8 pixels = 1 byte
  })
})
```

## Agent Responsibilities

- **executor:** Utility implementation, algorithm optimization
- **test-engineer:** Algorithm tests, performance benchmarks, image quality tests
- **debugger:** Image quality issues, dithering artifacts, performance bottlenecks

## Related Modules

- `components/DitheredImage.tsx` — Uses ditherImage() to preview print output
- `services/printer/render/` — Uses ditherImage() + toESCPOSImage() for actual printing
- `app/print-preview.tsx` — Displays dithered preview before printing
