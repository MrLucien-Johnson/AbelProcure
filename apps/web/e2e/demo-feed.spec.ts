import { expect, test } from '@playwright/test';

test('demo deal feed ranks opportunities', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PC PARTS PROCUREMENT' })).toBeVisible();
  await expect(page.getByText('DEMO').first()).toBeVisible();
  await expect(page.getByText('Top opportunities')).toBeVisible();
  await page.getByRole('link', { name: 'Algorithm' }).click();
  await expect(page.getByRole('heading', { name: 'Algorithm explorer' })).toBeVisible();
});
