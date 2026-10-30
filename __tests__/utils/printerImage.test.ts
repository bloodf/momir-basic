const mockDownloadFileAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class MockFile {
    static downloadFileAsync = (...args: unknown[]) => mockDownloadFileAsync(...args);
    exists = false;
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
  },
}));

jest.mock('expo-image-manipulator', () => ({
  // Stop the pipeline right after the download; only the request is under test
  manipulateAsync: jest.fn().mockRejectedValue(new Error('stop after download')),
  SaveFormat: { PNG: 'png' },
}));

import { rasterizeCardArtForPrint } from '@/utils/printerImage';
import { SCRYFALL_USER_AGENT } from '@/services/scryfall';

describe('rasterizeCardArtForPrint download', () => {
  // CRITICAL REGRESSION TEST: Scryfall's CDN returns 400 to OkHttp's default User-Agent
  it('downloads remote art with the app User-Agent', async () => {
    const url = 'https://cards.scryfall.io/art_crop/front/7/a/7a7a48bb.jpg?1793020975';

    await expect(rasterizeCardArtForPrint(url, 512)).rejects.toThrow();

    expect(mockDownloadFileAsync).toHaveBeenCalledWith(
      url,
      expect.anything(),
      expect.objectContaining({ headers: { 'User-Agent': SCRYFALL_USER_AGENT } }),
    );
  });
});
