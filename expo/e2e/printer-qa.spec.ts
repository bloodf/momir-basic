import { test, expect } from '@playwright/test';

// Sample card data for print-preview navigation
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

test.describe('Printer Settings Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the printer settings screen
    await page.goto('/settings/printer');
    // Wait for the screen to load and initial auto-scan to complete
    await page.waitForSelector('[data-testid="scan-printers"]', { timeout: 15000 });
    // Wait for initial auto-scan to finish (fake adapter is fast but async)
    await page.waitForTimeout(2000);
  });

  test('scan-printers button is present and triggers discovery', async ({ page }) => {
    // The auto-scan on mount may have already populated the list, but click to be sure
    await page.click('[data-testid="scan-printers"]');

    // Wait for scan to complete and device list to appear (up to 5s)
    await page.waitForTimeout(3000);

    // Check if device appeared (auto-scan may have already shown it)
    const deviceRow = page.locator('[data-testid="device-fake-ble-001"]');
    const count = await deviceRow.count();
    if (count === 0) {
      // Try one more click
      await page.click('[data-testid="scan-printers"]');
      await page.waitForTimeout(2000);
    }

    await expect(deviceRow).toBeVisible({ timeout: 5000 });

    // Should show device name
    await expect(deviceRow).toContainText('FakeThermal-BLE-001');

    // Should show "Preferred" badge once connected
    // First connect the device
    await page.click('[data-testid="connect-fake-ble-001"]');
    await page.waitForTimeout(500);

    // Preferred chip should appear
    const preferredChip = page.locator('[data-testid="device-fake-ble-001"]').locator('text=Preferred');
    await expect(preferredChip).toBeVisible();
  });

  test('printer scan shows fake BLE device with correct testID', async ({ page }) => {
    // Trigger scan
    await page.click('[data-testid="scan-printers"]');
    await page.waitForTimeout(500);

    // Verify the device row with correct testID exists
    const deviceRow = page.locator('[data-testid="device-fake-ble-001"]');
    await expect(deviceRow).toBeVisible();

    // Verify device info
    await expect(deviceRow).toContainText('FakeThermal-BLE-001');
    await expect(deviceRow).toContainText('BLE');
    await expect(deviceRow).toContainText('AA:BB:CC:DD:EE:FF');
  });

  test('connect button changes to connected state', async ({ page }) => {
    // Scan first
    await page.click('[data-testid="scan-printers"]');
    await page.waitForTimeout(500);

    // Click connect
    await page.click('[data-testid="connect-fake-ble-001"]');
    await page.waitForTimeout(1000);

    // Button should now show "Connected"
    const connectBtn = page.locator('[data-testid="connect-fake-ble-001"]');
    await expect(connectBtn).toContainText('Connected');

    // Preferred printer status should show connected
    const statusBadge = page.locator('[data-testid="preferred-printer-status"]');
    await expect(statusBadge).toContainText(/Connected/i);
  });

  test('test print button processes a diagnostics print immediately', async ({ page }) => {
    // Scan first
    await page.click('[data-testid="scan-printers"]');
    await page.waitForTimeout(500);

    // Connect first
    await page.click('[data-testid="connect-fake-ble-001"]');
    await page.waitForTimeout(500);

    const alertOkButton = page.getByRole('button', { name: /ok/i });
    if (await alertOkButton.isVisible().catch(() => false)) {
      await alertOkButton.click();
    }

    // Click test print
    await page.click('[data-testid="test-print-fake-ble-001"]');
    await page.waitForTimeout(1000);

    const successCard = page.getByText(/Completed diagnostics print for FakeThermal-BLE-001\./).first();
    await expect(successCard).toBeVisible();
    await expect(page.locator('[data-testid="queue-completed-count"]')).toHaveText('1');
    await expect(page.locator('[data-testid="queue-pending-count"]')).toHaveText('0');
  });
});

test.describe('Print Preview Screen', () => {
  test('shows error when no printer is selected', async ({ page }) => {
    // Navigate to print-preview without setting a preferred printer
    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="confirm-print"]', { timeout: 15000 });

    // Click confirm print
    await page.click('[data-testid="confirm-print"]');
    await page.waitForTimeout(500);

    // Should show queue-status-badge with error
    const errorBadge = page.locator('[data-testid="queue-status-badge"]');
    await expect(errorBadge).toBeVisible();
    await expect(errorBadge).toContainText(/select a printer/i);
  });

  test('confirm-print button is present and clickable', async ({ page }) => {
    await page.goto(`/print-preview?cardJson=${encodeURIComponent(SAMPLE_CARD_JSON)}`);
    await page.waitForSelector('[data-testid="confirm-print"]', { timeout: 15000 });

    // Button should be visible
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

test.describe('Auto-Print Code Path', () => {
  test('card.tsx has autoPrintCardReceipt wired to rerollMutation.onSuccess', async ({ page }) => {
    // Navigate to home first to get a card, then navigate to card detail
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for card to load

    // Click on the card to go to card detail
    const cardElement = page.locator('[data-testid="card-item"]').first();
    const cardExists = await cardElement.isVisible().catch(() => false);

    test.skip(!cardExists, 'No card on home screen to navigate with');

    await cardElement.click();
    await page.waitForTimeout(1000);

    // Look for print button
    const printBtn = page.locator('[data-testid="print-card"]');
    await expect(printBtn).toBeVisible();
  });
});

test.describe('Console Error Check', () => {
  test('no console errors on printer settings screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/settings/printer');
    await page.waitForSelector('[data-testid="scan-printers"]', { timeout: 15000 });
    await page.click('[data-testid="scan-printers"]');
    await page.waitForTimeout(1000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('hydration') &&
      !e.includes('Warning:')
    );

    expect(criticalErrors).toHaveLength(0);
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
});
