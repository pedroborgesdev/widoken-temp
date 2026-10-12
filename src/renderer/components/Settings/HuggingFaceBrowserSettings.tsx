import {
  HUGGING_FACE_BROWSERS,
  type HuggingFaceBrowser,
  type ProviderSetting
} from '@shared/settings'
import { SettingsSelect } from './SettingsSelect'

const BROWSER_LABELS: Record<HuggingFaceBrowser, string> = {
  auto: 'Automatic',
  chrome: 'Google Chrome',
  chromium: 'Chromium',
  firefox: 'Firefox',
  brave: 'Brave',
  edge: 'Microsoft Edge'
}

interface HuggingFaceBrowserSettingsProps {
  provider: ProviderSetting
  onBrowserChange(browser: HuggingFaceBrowser): void
}

export function HuggingFaceBrowserSettings({
  provider,
  onBrowserChange
}: HuggingFaceBrowserSettingsProps): React.JSX.Element {
  return (
    <section className="grid gap-4 rounded-xl border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_48%,var(--color-overlay-surface))] p-5 max-[620px]:p-4" data-testid="huggingface-browser-settings">
      <div className="grid gap-1">
        <h4 className="m-0 text-[13.5px] font-medium text-overlay-strong">Browser session</h4>
        <p className="m-0 text-[12px] leading-[1.45] text-overlay-muted">
          Sign in to huggingface.co in the selected browser. Widoken reads that browser&apos;s local session without storing or displaying its cookies.
        </p>
      </div>
      <div className="rounded-lg border border-overlay-track bg-overlay-elevated/40 p-3.5">
        <SettingsSelect
          stacked
          label="Browser used for Hugging Face"
          value={provider.huggingFaceBrowser ?? 'auto'}
          options={HUGGING_FACE_BROWSERS.map((browser) => ({ value: browser, label: BROWSER_LABELS[browser] }))}
          onChange={(value) => onBrowserChange(value as HuggingFaceBrowser)}
        />
        <p className="mt-2.5 mb-0 text-[11.5px] leading-[1.45] text-overlay-muted">
          Automatic checks Chrome, Chromium, Firefox, Brave, and Edge in that order. Python and the bundled collector dependencies must be available locally.
        </p>
      </div>
    </section>
  )
}
