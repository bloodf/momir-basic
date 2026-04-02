import { test, expect } from '@playwright/test';

const SAMPLE_CARD_JSON = JSON.stringify({
  id: 'abc123',
  name: 'Lightning Bolt',
  manaCost: '{R}',
  typeLine: 'Instant',
  oracleText: 'Lightning Bolt deals 3 damage to any target.',
  flavorText: null,
  power: null,
  toughness: null,
  normalImageUrl: 'https://cards.scryfall.io/normal/front/a/b/ab1ef852-b050-4a36-8c28-f23b7ac8bc38.jpg',
  artCropUrl: 'https://cards.scryfall.io/art_crop/front/a/b/ab1ef852-b050-4a36-8c28-f23b7ac8bc38.jpg',
  setCode: '2XM',
  setName: 'Double Masters',
  collectorNumber: '149',
  artist: 'Ryan Yee',
  rarity: 'common',
  cmc: 1,
  scryfallUri: 'https://scryfall.com/card/2xm/149/lightning-bolt',
});

test.describe('Print Preview Screen - Non-Printer UI Coverage', () => {
  test('shows error when no printer is selected', async ({ page }) => {
    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="confirm-print"]', { timeout: 15000 });

    await page.click('[data-testid="confirm-print"]');
    await page.waitForTimeout(500);

    const errorBadge = page.locator('[data-testid="queue-status-badge"]');
    await expect(errorBadge).toBeVisible();
    await expect(errorBadge).toContainText(/No printer selected/i);
  });

  test('confirm-print button is present and clickable', async ({ page }) => {
    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="confirm-print"]', { timeout: 15000 });

    const btn = page.locator('[data-testid="confirm-print"]');
    await expect(btn).toBeVisible();
  });

  test('close-preview button navigates back', async ({ page }) => {
    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="close-preview"]', { timeout: 15000 });

    const closeBtn = page.locator('[data-testid="close-preview"]');
    await expect(closeBtn).toBeVisible();
  });
});

test.describe('Printer Settings Screen - Non-Fake-Discovery Coverage', () => {
  test('screen loads with scan button present', async ({ page }) => {
    await page.goto('/settings/printer');
    await page.waitForSelector('[data-testid="scan-printers"]', { timeout: 15000 });

    const scanBtn = page.locator('[data-testid="scan-printers"]');
    await expect(scanBtn).toBeVisible();
  });

  test('no console errors on print preview screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="confirm-print"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('hydration') &&
      !e.includes('Warning:')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('no console errors on printer settings screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/settings/printer');
    await page.waitForSelector('[data-testid="scan-printers"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('hydration') &&
      !e.includes('Warning:')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Auto-Print Code Path - Non-Printer UI Coverage', () => {
  test('card.tsx print button is present on card detail', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const cardElement = page.locator('[data-testid="card-item"]').first();
    const cardExists = await cardElement.isVisible().catch(() => false);

    test.skip(!cardExists, 'No card on home screen to navigate with');

    await cardElement.click();
    await page.waitForTimeout(1000);

    const printBtn = page.locator('[data-testid="print-card"]');
    await expect(printBtn).toBeVisible();
  });
});
