import { test, expect, type Page } from '@playwright/test';

const SEARCH_RESULT_CARD = {
  id: 'filter-only-card',
  name: 'Filter Only Angel',
  mana_cost: '{3}{W}{W}',
  type_line: 'Creature — Angel',
  oracle_text: 'Flying',
  flavor_text: 'Found by filters alone.',
  power: '4',
  toughness: '4',
  scryfall_uri: 'https://scryfall.com/card/tst/1/filter-only-angel',
  image_uris: {
    art_crop: 'https://cards.scryfall.io/art_crop/front/t/e/test.jpg',
    normal: 'https://cards.scryfall.io/normal/front/t/e/test.jpg',
    small: 'https://cards.scryfall.io/small/front/t/e/test.jpg',
  },
  set_name: 'Test Set',
  set: 'tst',
  collector_number: '1',
  artist: 'Filter Artist',
  rarity: 'rare',
  colors: ['W'],
  cmc: 5,
  lang: 'en',
};

async function mockScryfall(page: Page) {
  await page.route('https://api.scryfall.com/**', async route => {
    const url = new URL(route.request().url());

    if (url.pathname === '/sets') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { code: 'tst', name: 'Test Set', set_type: 'expansion', released_at: '2024-01-01' },
            { code: 'neo', name: 'Kamigawa: Neon Dynasty', set_type: 'expansion', released_at: '2022-02-18' },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/cards/search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [SEARCH_RESULT_CARD],
          total_cards: 1,
          has_more: false,
        }),
      });
      return;
    }

    if (url.pathname === '/cards/autocomplete') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

test.describe('search filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockScryfall(page);
  });

  test('expanded filter panel scrolls to lower controls', async ({ page }) => {
    await page.goto('/search');
    await page.getByTestId('filter-toggle').click();

    const scrollView = page.getByTestId('filters-scroll-view');
    await expect(scrollView).toBeVisible();

    const metricsBefore = await scrollView.evaluate(node => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
    }));

    expect(metricsBefore.scrollHeight).toBeGreaterThan(metricsBefore.clientHeight);

    await scrollView.evaluate(node => {
      node.scrollTop = node.scrollHeight;
      node.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    await expect(page.getByTestId('filter-artist-input')).toBeVisible();

    const scrollTopAfter = await scrollView.evaluate(node => node.scrollTop);
    expect(scrollTopAfter).toBeGreaterThan(metricsBefore.scrollTop);
  });

  test('submits filter-only searches with the existing Search action', async ({ page }) => {
    await page.goto('/search');
    await page.getByTestId('filter-toggle').click();
    await page.getByTestId('filter-color-W').click();
    await page.getByTestId('filter-rarity-rare').click();

    const searchRequestPromise = page.waitForRequest(request =>
      request.url().includes('/cards/search') && request.method() === 'GET',
    );

    await page.getByTestId('search-submit').click();

    const searchRequest = await searchRequestPromise;
    const requestUrl = new URL(searchRequest.url());
    const query = requestUrl.searchParams.get('q') ?? '';

    expect(query).toContain('c:W');
    expect(query).toContain('r:rare');

    await expect(page.getByTestId('search-results')).toBeVisible();
    await expect(page.getByTestId('card-list-item-filter-only-card')).toBeVisible();
  });
});
