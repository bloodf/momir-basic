export const HERO_ROTATION_INTERVAL_MS = 15_000;

export function startHeroArtRotationInterval(onRotate: () => void): () => void {
  const intervalId = setInterval(onRotate, HERO_ROTATION_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
  };
}
