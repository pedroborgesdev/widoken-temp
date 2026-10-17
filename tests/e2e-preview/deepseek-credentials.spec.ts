import { expect, test } from '@playwright/test'

const PROVIDERS_PATH = '/dashboard.html?page=providers&section=deepseek'
const WIDGET_PROVIDERS_PATH = '/dashboard.html?page=widget&section=providers'
const WIDGET_PATH = '/widget.html'

test('manages the DeepSeek credential source from the preview settings', async ({ page }) => {
  await page.goto(PROVIDERS_PATH)
  const panel = page.getByTestId('deepseek-credentials')
  await expect(panel).toBeVisible()

  const sourceControl = panel.locator('.settings-control').filter({ hasText: 'DeepSeek credential source' })
  await expect(sourceControl.locator('.settings-select__trigger')).toHaveText('Automatic')
  await expect(panel.getByRole('term').filter({ hasText: 'Harness account' })).toBeVisible()
  await expect(panel.getByText('Detected')).toBeVisible()
  await expect(panel.getByText('Not saved')).toBeVisible()
  await expect(page.getByTestId('provider-settings-status')).toContainText('Connected')

  await sourceControl.locator('.settings-select__trigger').click()
  await page.getByRole('option', { name: 'API key' }).click()
  await expect(sourceControl.locator('.settings-select__trigger')).toHaveText('API key')

  const input = panel.getByLabel('DeepSeek API key')
  await expect(input).toHaveAttribute('type', 'password')
  await input.fill('preview-secret-value')
  await panel.getByRole('button', { name: 'Save API key' }).click()
  await expect(input).toHaveValue('')
  await expect(panel.getByText('API key saved.')).toBeVisible()
  await expect(panel.getByText('Saved', { exact: true })).toBeVisible()
  await expect(panel.getByText('preview-secret-value')).toHaveCount(0)

  await panel.getByRole('button', { name: 'Remove saved key' }).click()
  await expect(panel.getByText('Saved API key removed.')).toBeVisible()
  await expect(panel.getByText('Not saved')).toBeVisible()

  await sourceControl.locator('.settings-select__trigger').click()
  await page.getByRole('option', { name: 'Harness account' }).click()
  await page.reload()
  const reloadedSource = page.getByTestId('deepseek-credentials')
    .locator('.settings-control').filter({ hasText: 'DeepSeek credential source' })
  await expect(reloadedSource.locator('.settings-select__trigger')).toHaveText('Harness account')

  await reloadedSource.locator('.settings-select__trigger').click()
  await page.getByRole('option', { name: 'Automatic' }).click()
  await page.reload()
  await expect(
    page.getByTestId('deepseek-credentials')
      .locator('.settings-control').filter({ hasText: 'DeepSeek credential source' })
      .locator('.settings-select__trigger')
  ).toHaveText('Automatic')
})

test('keeps enabled DeepSeek visible with its balance and active source', async ({ page }) => {
  await page.goto(PROVIDERS_PATH)
  await expect(page.getByRole('checkbox', { name: 'Disable DeepSeek' })).toBeChecked()

  await page.goto(WIDGET_PROVIDERS_PATH)
  await expect(page.getByRole('checkbox', { name: 'Hide DeepSeek in widget' })).toBeChecked()

  await page.goto(WIDGET_PATH)
  const item = page.getByRole('button', { name: /^DeepSeek:/ })
  await expect(item).toBeVisible()
  await item.hover()
  await page.locator('.widget__visual').evaluate(async (visual) => {
    await Promise.all(visual.getAnimations().map(async (animation) => animation.finished))
  })
  await item.hover()
  const popover = page.locator('.usage-popover')
  await expect(popover).toBeVisible()
  await expect(popover.getByText('USD balance')).toBeVisible()
  await expect(popover.getByText(/remaining/).first()).toBeVisible()
  await expect(popover.getByText('80%')).toBeVisible()
  await expect(popover.getByText(/used/).first()).toBeVisible()

  await page.goto(PROVIDERS_PATH)
  const activeSource = page.getByTestId('deepseek-active-source')
  await expect(activeSource).toBeVisible()
  await expect(activeSource).toHaveText('Harness account')
})
