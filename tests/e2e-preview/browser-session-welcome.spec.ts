import { expect, test } from '@playwright/test'

function welcomePath(theme = 'monokai-black', syncedTheme?: unknown): string {
  const query = new URLSearchParams({
    providerId: 'huggingface',
    displayName: 'Hugging Face',
    loginUrl: 'https://huggingface.co/login',
    reason: 'Hugging Face requires an authenticated website session for billing and inference usage.',
    collectedData: JSON.stringify([
      'Your account name, only to identify the connected session',
      'Your current USD billing balance',
      'Monthly Inference Providers request count and spend'
    ]),
    theme
  })
  if (syncedTheme) query.set('syncedTheme', JSON.stringify(syncedTheme))
  return `/browser-session.html?${query}`
}

test('explains provider browser access before redirecting to sign-in', async ({ page }) => {
  await page.goto(welcomePath('nord'))

  await expect(page.locator('main')).toHaveClass(/overlay-root--theme-nord/)
  await expect(page.getByRole('banner', { name: 'Widoken window' })).toContainText('Widoken')
  await expect(page.getByRole('button', { name: 'Minimize sign-in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close sign-in' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sign in to your Hugging Face account' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Widoken will only read' })).toBeVisible()
  await expect(page.getByText('Your current USD billing balance')).toBeVisible()
  await expect(page.getByText(/password, prompts, responses.*never read/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', 'https://huggingface.co/login')
  await expect(page.getByText(/secure sign-in page at huggingface.co/i)).toBeVisible()
})

test('keeps the disclosure usable in a narrow login window', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 540 })
  await page.goto(welcomePath())

  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  const overflowsHorizontally = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflowsHorizontally).toBe(false)
})

test('shows confirmation and the automatic close countdown after collecting the session', async ({ page }) => {
  await page.addInitScript(() => {
    const desktop = {
      window: {
        close: async () => undefined,
        minimize: async () => undefined,
        onConnected: (callback: (status: { providerId: string; displayName: string; accountLabel?: string }) => void) => {
          callback({ providerId: 'huggingface', displayName: 'Hugging Face', accountLabel: 'preview-user' })
          return () => undefined
        }
      }
    }
    Object.defineProperty(window, 'browserSessionDesktop', { value: desktop })
  })
  await page.goto(welcomePath())

  await expect(page.getByRole('heading', { name: 'Session collected' })).toBeVisible()
  await expect(page.getByText('Connected as preview-user')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to Widoken' })).toBeVisible()
  await expect(page.getByText(/close automatically in 1[45]s/i)).toBeVisible()
})

test('applies the synchronized widget palette to the whole window', async ({ page }) => {
  const colors = {
    accent: '#2457d6',
    balance: '#6f42c1',
    danger: '#c62828',
    elevated: '#ffffff',
    hover: '#dde5f5',
    muted: '#637083',
    onAccent: '#ffffff',
    shadow: '#00000040',
    strong: '#111827',
    success: '#27803b',
    surface: '#f4f6fa',
    text: '#273244',
    thumb: '#e8edf5',
    track: '#b8c2d1',
    warning: '#9a6700'
  }
  await page.goto(welcomePath('monokai-black', {
    name: 'Synchronized Light',
    colorScheme: 'light',
    colors
  }))

  await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(244, 246, 250)')
  await expect(page.getByRole('banner', { name: 'Widoken window' })).toHaveCSS('background-color', 'rgb(232, 237, 245)')
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCSS('background-color', 'rgb(36, 87, 214)')
})
