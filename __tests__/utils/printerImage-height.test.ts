import { PNG } from 'pngjs/browser';

const mockManipulateAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class MockFile {
    static downloadFileAsync = jest.fn().mockResolvedValue(undefined);
    exists = true;
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { PNG: 'png' },
}));

import { rasterizeCardArtForPrint } from '@/utils/printerImage';

// A real (tiny) PNG so decoding succeeds; the reported size is what the pipeline checks
const tinyPng = (() => {
  const png = new PNG({ width: 2, height: 2 });
  png.data.fill(255);
  return PNG.sync.write(png).toString('base64');
})();

describe('rasterizeCardArtForPrint height cap', () => {
  beforeEach(() => {
    mockManipulateAsync.mockReset();
    // A full card resized to 416 dots wide is ~580 tall (88 x 63 mm aspect)
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///cache/resized.png', width: 416, height: 580, base64: tinyPng });
  });

  // Full-card prints pass an infinite cap; a finite one (480) used to shrink them to ~344 dots wide
  it('keeps the requested width when the height is uncapped', async () => {
    await rasterizeCardArtForPrint('https://cards.scryfall.io/normal/front/a.jpg', 416, {
      maxHeightPx: Number.POSITIVE_INFINITY,
    });

    expect(mockManipulateAsync).toHaveBeenCalledTimes(1);
    expect(mockManipulateAsync.mock.calls[0][1]).toEqual([{ resize: { width: 416 } }]);
  });

  it('shrinks to fit a finite cap', async () => {
    await rasterizeCardArtForPrint('https://cards.scryfall.io/normal/front/b.jpg', 416, { maxHeightPx: 480 });

    expect(mockManipulateAsync).toHaveBeenCalledTimes(2);
    expect(mockManipulateAsync.mock.calls[1][1]).toEqual([{ resize: { width: 344, height: 480 } }]);
  });
});
