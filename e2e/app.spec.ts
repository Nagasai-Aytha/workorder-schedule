import { expect, test } from '@playwright/test';

test('loads the work order schedule page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Work Orders' })).toBeVisible();
  await expect(page.getByText('Work Center')).toBeVisible();
});
