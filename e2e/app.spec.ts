import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('loads the work order schedule page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Work Orders' })).toBeVisible();
  await expect(page.getByText('Work Center')).toBeVisible();
});

test('can switch timescale to Week', async ({ page }) => {
  await page.goto('/');

  await page.locator('.timescale-trigger').click();
  await page.getByRole('button', { name: 'Week', exact: true }).click();

  await expect(page.locator('.timescale-trigger')).toContainText('Week');
});

test('opens create panel when timeline row is clicked', async ({ page }) => {
  await page.goto('/');

  await page.locator('.work-order-row').first().click();

  await expect(page.locator('.slide-panel')).toHaveClass(/open/);
  await expect(page.getByRole('heading', { name: 'Work Order Details' })).toBeVisible();
});

test('shows validation error when creating without work order name', async ({ page }) => {
  await page.goto('/');
  await page.locator('.work-order-row').first().click();

  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.getByText('Work order name is required.')).toBeVisible();
});

test('shows date-range validation error when end date is before start date', async ({ page }) => {
  await page.goto('/');
  await page.locator('.work-order-row').first().click();

  await page.locator('#order-name').fill('E2E Date Validation');
  await page.locator('#start-date').fill('2026-02-20');
  await page.locator('#end-date').fill('2026-02-10');
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.getByText('End date must be after start date.')).toBeVisible();
});
