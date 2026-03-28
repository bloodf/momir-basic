export const MediaLibraryModule = {
  getAlbumsAsync: jest.fn().mockResolvedValue([]),
  getAssetsAsync: jest.fn().mockResolvedValue({ assets: [] }),
  saveToLibraryAsync: jest.fn().mockResolvedValue({ id: 'fake-asset-1' }),
  createAlbumAsync: jest.fn().mockResolvedValue({ id: 'fake-album-1' }),
  deleteAssetsAsync: jest.fn().mockResolvedValue(true),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
};

export async function requestPermissionsAsync() {
  MediaLibraryModule.requestPermissionsAsync();
  return { granted: true, status: 'granted' };
}

export async function getAlbumsAsync() {
  MediaLibraryModule.getAlbumsAsync();
  return [];
}

export async function getAssetsAsync(options) {
  MediaLibraryModule.getAssetsAsync(options);
  return { assets: [], hasNextPage: false, hasPreviousPage: false, totalCount: 0 };
}

export async function saveToLibraryAsync(uri, options) {
  MediaLibraryModule.saveToLibraryAsync(uri, options);
  return { id: `fake-asset-${Date.now()}` };
}

export async function createAlbumAsync(name, assetIds, copyAssets) {
  MediaLibraryModule.createAlbumAsync(name, assetIds, copyAssets);
  return { id: 'fake-album-1' };
}

export default {
  requestPermissionsAsync,
  getAlbumsAsync,
  getAssetsAsync,
  saveToLibraryAsync,
  createAlbumAsync,
};