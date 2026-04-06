import { test, expect } from '@playwright/test';

function inferCardType(query: string): string {
  if (query.includes('t:creature t:legendary')) return 'commander';
  if (query.includes('t:equipment')) return 'equipment';
  if (query.includes('t:enchantment')) return 'enchantment';
  if (query.includes('t:aura')) return 'aura';
  if (query.includes('t:artifact')) return 'artifact';
  if (query.includes('t:instant')) return 'instants';
  if (query.includes('t:sorcery')) return 'sorceries';
  if (query.includes('t:land -t:basic')) return 'lands';
  return 'creature';
}

function buildArtUrl(type: string, index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#101a14" /><text x="60" y="120" fill="#f4d58d" font-size="72">${type}-${index}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

test('hero art rotates after 15 seconds on the focused home screen', async ({ page }) => {
  test.setTimeout(90_000);
  const requestCounts: Record<string, number> = {};

  await page.route('https://api.scryfall.com/cards/random**', async route => {
    const requestUrl = new URL(route.request().url());
    const query = decodeURIComponent(requestUrl.searchParams.get('q') ?? '');
    const type = inferCardType(query);
    const count = (requestCounts[type] ?? 0) + 1;
    requestCounts[type] = count;
    const artUrl = buildArtUrl(type, count);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `${type}-${count}`,
        name: `${type}-${count}`,
        colors: ['G'],
        image_uris: {
          art_crop: artUrl,
          normal: artUrl,
          small: artUrl,
        },
      }),
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const heroArt = page.locator('[data-testid="hero-art"]');
  await expect(heroArt).toBeVisible({ timeout: 15000 });

  const initialArtUrl = await heroArt.getAttribute('aria-label');
  expect(initialArtUrl).toContain('creature-1');

  await page.waitForTimeout(16000);

  const rotatedArtUrl = await heroArt.getAttribute('aria-label');
  expect(rotatedArtUrl).toContain('creature-2');
  expect(rotatedArtUrl).not.toBe(initialArtUrl);
});
