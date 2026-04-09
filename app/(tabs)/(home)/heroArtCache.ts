export const HERO_ART_WARM_CACHE_LIMIT = 15;

export function markHeroArtAsWarm(
  warmedArtUrlOrder: string[],
  warmedArtUrls: Record<string, true>,
  artUrl: string,
  limit: number = HERO_ART_WARM_CACHE_LIMIT,
): void {
  if (!artUrl) {
    return;
  }

  const existingIndex = warmedArtUrlOrder.indexOf(artUrl);
  if (existingIndex !== -1) {
    warmedArtUrlOrder.splice(existingIndex, 1);
  }

  warmedArtUrlOrder.push(artUrl);
  warmedArtUrls[artUrl] = true;

  while (warmedArtUrlOrder.length > limit) {
    const evictedUrl = warmedArtUrlOrder.shift();
    if (evictedUrl) {
      delete warmedArtUrls[evictedUrl];
    }
  }
}
