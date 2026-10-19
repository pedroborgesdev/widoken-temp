import { expect, test } from '@playwright/test'

test('uses dim icons and edge tuck by default and does not expose refresh timing', async ({ page }) => {
  await page.goto('/dashboard.html?page=widget&section=appearance')
  const unavailableStyle = page.locator('.settings-control').filter({ hasText: 'Unavailable provider' })
  await expect(unavailableStyle.locator('.settings-select__trigger')).toHaveText('Dim icon')

  await page.goto('/dashboard.html?page=widget&section=behavior')
  await expect(page.getByRole('checkbox', { name: 'Tuck into screen edge' })).toBeChecked()

  await page.goto('/dashboard.html?page=general')
  await expect(page.getByText('Refresh interval')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Data' })).toHaveCount(0)
})
