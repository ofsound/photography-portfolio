import { expect, test } from '@playwright/test';

test('search page smoke flow', async ({ page }) => {
  await page.goto('/search');

  await expect(page).toHaveTitle('Search');

  const searchInput = page.getByPlaceholder(
    'Title, description, gallery, category, tag'
  );
  await expect(searchInput).toBeVisible();
  await expect(page.getByLabel('Gallery')).toBeVisible();
  await expect(page.getByLabel('Category')).toBeVisible();
  await expect(page.getByLabel('Tag')).toBeVisible();

  await searchInput.fill('zzzz-playwright-smoke');
  await expect(page).toHaveURL(/\/search\?q=zzzz-playwright-smoke$/);

  await page.reload();
  await expect(page).toHaveURL(/\/search\?q=zzzz-playwright-smoke$/);
  await expect(searchInput).toHaveValue('zzzz-playwright-smoke');

  const clearFiltersButton = page.getByRole('button', {
    name: 'Clear filters'
  });

  if (await clearFiltersButton.isVisible()) {
    await clearFiltersButton.click();
    await expect(page).toHaveURL('http://127.0.0.1:4173/search');
    await expect(searchInput).toHaveValue('');
  }
});
