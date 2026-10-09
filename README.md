<p align="center">
  <img src="resources/widoken.png" width="72" alt="Widoken icon">
</p>

<h1 align="center">Widoken</h1>

<p align="center"><strong>Your AI usage, living on the edge of the screen.</strong></p>

<p align="center">
  A small desktop widget for the limits spread across your AI tools.<br>
  See what is available, what is running, and what resets next—without opening another tab.
</p>

<p align="center">
  <img src="assets/readme/hero.png" alt="Widoken widget on the desktop with a provider usage popover open">
</p>

<p align="center">
  <a href="#the-widget">The widget</a> ·
  <a href="#providers">Providers</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#platform-support">Platforms</a> ·
  <a href="#privacy-and-local-data">Privacy</a> ·
  <a href="#development">Development</a>
</p>

## Why Widoken

Your limits are scattered across different products. Claude, ChatGPT, Cursor, Copilot, Antigravity, and DeepSeek each have their own place to check usage, usually after you have already hit a limit.

Widoken brings those readings into one persistent, compact view. The widget is the product: the dashboard exists to give you history and control when you need them, then gets out of the way.

## The widget

Each provider has a place on the strip. Its usage ring shows the percentage of a limit already used; when a provider exposes two limits, the left and right halves can show both at once. Choose the limits and their order in the dashboard.

<p align="center">
  <img src="assets/readme/widget-closeup.png" width="280" alt="Close-up of the Widoken widget and its usage rings">
</p>

Hover a provider to see the details it reports: limit names, usage, reset times, and available counts. Once Widoken has collected enough local samples, the popover can also show recent consumption and a projected exhaustion time. An unavailable or signed-out provider remains visible with an explicit state instead of a made-up percentage.

<p align="center">
  <img src="assets/readme/widget-horizontal.png" alt="Horizontal Widoken widget with a Cursor usage popover">
</p>

For providers with a reliable local activity signal—currently Codex, Cursor, and Antigravity—the ring animates while a turn is in progress. When that activity ends, Widoken requests fresh usage for that provider.

<p align="center">
  <img src="assets/readme/widget-working.png" width="280" alt="Widoken usage rings showing provider activity">
</p>

Move the widget to a screen edge or leave it free. It supports vertical and horizontal layouts, magnetic docking guides, edge tuck, adjustable scale and spacing, shadows, and provider ordering. The unused area of the overlay is designed to let pointer input reach the application underneath; the exact behavior depends on the desktop platform.

The Widoken icon on the strip opens the app menu. From there, open the dashboard without hunting for a tray icon or another window.

<p align="center">
  <img src="assets/readme/widget-menu.png" alt="Widoken app menu beside the widget">
</p>

### A dashboard when you want more

The dashboard shows a 31-day usage chart, current provider states, individual limit breakdowns, and summary metrics. History starts when Widoken begins recording samples; it cannot reconstruct past usage. Where a provider supplies an absolute amount, Widoken prefers that over an estimate derived from percentages. Any plan price shown is a reference list price, not a bill or a record of actual spending.

<p align="center">
  <img src="assets/readme/dashboard.png" alt="Widoken dashboard showing usage history and provider details">
</p>

Widget settings are grouped into Providers, Usage ring, Appearance, and Behavior. General settings cover startup, refresh frequency, and optional local insights. Disabling the widget leaves the dashboard available so you can turn it back on.

### Make it yours

Monokai Black is the default. Other presets include Dark, Slate, Dracula, Nord, Catppuccin Mocha, Tokyo Night, Gruvbox, One Dark, Solarized Dark, and Monokai. You can also import the colors of your active VS Code theme on demand, and choose whether the dashboard follows the widget theme.

<p align="center">
  <img src="assets/readme/widget-themes.png" alt="Widoken widget shown in a selection of available themes">
</p>

## Providers

Widoken uses sessions that already exist on your computer and does not ask you to paste tokens for most providers. DeepSeek is the exception and offers two explicit sources: a **Harness account** it reads (read-only) from `~/.dsh/.credentials.yaml`, or an **API key** you enter in the dashboard and that is encrypted locally. Availability and the exact limits shown depend on the provider, your account, and the data its client or service exposes.

| Provider | What Widoken reads | Before you start |
| --- | --- | --- |
| Claude | Session and weekly usage from Anthropic | Sign in with Claude Code. |
| ChatGPT / Codex | Primary and secondary Codex usage windows | Sign in through Codex; a browser-only ChatGPT session is not enough. |
| Cursor | Cursor Models, Other Models, and any available spend buckets | Sign in to the Cursor editor. |
| Antigravity | Model pools and available credits from its local language server | Run and sign in to Antigravity. |
| GitHub Copilot | Quotas exposed by GitHub, including premium requests | Enable it in **Widget → Providers** and provide an existing GitHub CLI or environment-token session. |
| DeepSeek | Account balance per currency from the DeepSeek Harness account or the DeepSeek API | Enable it in **Widget → Providers**, choose a credential source, and either sign in with the DeepSeek harness or save an API key. `DEEPSEEK_API_KEY` still works as a compatibility fallback. |

Claude, ChatGPT/Codex, Cursor, and Antigravity are enabled by default; Copilot and DeepSeek are off until you enable them. A disabled provider is not polled. If a service changes its usage response or a session expires, Widoken shows an unavailable or error state rather than treating the limit as zero.

DeepSeek offers an explicit panel to choose between the existing Harness account and an API key. The **DeepSeek credential source** selector offers Automatic, Harness account, and API key. Automatic tries the Harness account first and falls back to the saved (or environment) API key when the harness is missing or the request fails, remembering which source worked so later polls try it first and switch back only if it breaks. Fixed modes never fall back. The adapter reads the harness grant from `~/.dsh/.credentials.yaml` (or `DSH_HOME/.credentials.yaml`) only, accepts only the `https://platform.deepseek.com` issuer, and never writes to that file. Because a DeepSeek balance is a prepaid amount rather than a quota window, the ring is measured against the first balance observed for that source and currency: that reading becomes the capacity and usage is `(capacity - remaining) / capacity`. While the balance falls or stays equal, the capacity is kept. When the balance grows above the previous reading, the whole capacity is replaced by the new balance—a recharge resets usage to 0% instead of adding the difference—so the ring stays a fair proxy for how much of the observed baseline has been spent. The DeepSeek limit exposes the remaining balance, its currency, and the baseline-derived used and capacity, so the popover shows both the remaining amount and how much of the observed baseline has been spent.

For integration details and current limitations, see [Provider adapters](docs/PROVIDER_ADAPTERS.md).

## Getting started

### Run from source

Install a recent Node.js release and npm. The project uses Electron and a native SQLite module, so a platform may also need native build tools if a prebuilt module is unavailable.

```bash
npm ci
npm run dev
```

On first launch, the widget appears with the default Monokai Black theme. Sign in to the provider clients you use, hover their icons to inspect the reported limits, then open **Widget → Providers** to hide or reorder providers. Use **Widget → Usage ring** to choose which limits appear on each ring.

### Build an installer

Run the packaging command on the platform you are targeting:

```bash
# Linux: AppImage and .deb
npm run package:linux

# Windows: NSIS installer
npm run package:windows
```

Packages are written to `dist/`. Install the generated `.deb` with your package manager, run the AppImage after making it executable, or launch the Windows NSIS installer. The Linux command generates the required icon sizes and needs Python 3. The repository does not currently provide a macOS packaging command. `npm run package` creates an unpacked application for local inspection.

## Platform support

| Platform | Current status | Notes |
| --- | --- | --- |
| Windows | Supported target | Uses native overlay shaping and cursor tracking for click-through. NSIS packaging is configured. |
| Linux X11 | Supported target | Uses window shaping and a window-manager hint to keep the widget out of the taskbar. |
| KDE Plasma / Wayland | Supported target | Uses native Wayland and a session-scoped KWin bridge for click-through, always-on-top, and taskbar behavior. |
| Linux XWayland | Compatibility path | Set `WIDOKEN_OZONE_PLATFORM=x11`; behavior depends on the driver and compositor. |
| Other Wayland compositors | Experimental | Rendering works, but regional click-through needs compositor-specific support. |
| macOS | Planned | The current overlay fallback is not feature-complete and no installer target is configured. |

Multi-monitor behavior and platform-specific overlay constraints are described in [Platform support](docs/PLATFORM_SUPPORT.md) and [Overlay behavior](docs/OVERLAY_BEHAVIOR.md).

## Privacy and local data

Widoken has no separate account or cloud-sync service. Provider adapters read existing local sign-in material in the main process and use it to request usage directly from the corresponding provider endpoint. Cursor's adapter reads session fields from Cursor's local database and sends them as an authentication cookie to Cursor; Antigravity is queried through its local language server. DeepSeek differs by offering two explicit sources and a dashboard-managed API key: it can use the existing Harness account, whose grant is read without modification from `~/.dsh/.credentials.yaml` (or `DSH_HOME/.credentials.yaml`), or an API key you save in the dashboard, which is encrypted with Electron `safeStorage` and stored only as ciphertext in the `provider_credentials` table of `analytics.sqlite`; `DEEPSEEK_API_KEY` remains as a compatibility fallback. The harness token and the API key stay in the main process and are never exposed to the widget or dashboard renderers. These integrations require access to the clients' existing sessions, so enable only the providers you want Widoken to watch.

Settings and sampled usage history are stored under Electron's per-user application-data directory as `settings.json` and the local `analytics.sqlite` database. A DeepSeek API key you save is encrypted with Electron `safeStorage` and stored only as a ciphertext BLOB in the `provider_credentials` table of `analytics.sqlite`; it is never written in plain text and the dashboard only ever learns whether a key is stored. The DeepSeek adapter also keeps `deepseek-balance.json` there with the observed baseline per source and currency—the capacity, the last remaining balance, and a format marker—so the ring survives a restart; it holds no credential. `settings.json` and `deepseek-balance.json` are replaced atomically and written with owner-only file permissions where the platform supports it; `analytics.sqlite` remains a local database. Samples older than 90 days are pruned during active recording, while the dashboard displays a 31-day view. The **Local analytics** switch controls additional metrics read from local client data; it is off by default. Ordinary usage history is recorded independently of that switch.

The widget and dashboard have separate, sandboxed renderer processes. Provider credentials stay out of their exposed interfaces: the dashboard credential panel receives only non-secret availability flags, and the stored key never crosses the IPC boundary. The DeepSeek **Harness account** source reads this credential file: the dashboard performs a local, read-only check of `~/.dsh/.credentials.yaml` (or `DSH_HOME/.credentials.yaml`) to show whether a grant is available when it opens, while the token stays in the main process and is used to request the balance only while DeepSeek is enabled; Widoken never writes to that file. Widoken does not read browser cookies or ask for a new sign-in, but it does rely on the local sessions described above. See [Security](docs/SECURITY.md) for the process and IPC boundaries.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| A provider says **Unavailable** | Confirm that its desktop client is signed in. Codex usage requires a Codex session, not just a ChatGPT browser session. Antigravity also needs a running local language server. For DeepSeek, check the credential panel: the harness may not be signed in and no API key may be saved. |
| DeepSeek does not detect the Harness account | Sign in with the DeepSeek harness so `~/.dsh/.credentials.yaml` (or `DSH_HOME/.credentials.yaml`) contains the `deepseek-account-platform/default` grant, or switch the credential source to API key and save one. |
| DeepSeek says the key was rejected or rate limited | Verify the key with a call to `https://api.deepseek.com/user/balance`, then save it again or restart Widoken. If the API returned HTTP 429, wait and let the next refresh retry. |
| The Save API key button is disabled | The secure credential store must be available: `safeStorage` needs an OS keyring, and Linux `basic_text` backends are rejected on purpose. |
| Usage appears stale | Check the provider's error message and network access. The default refresh interval is 45 seconds; change it under **General → Data**. |
| The history chart is empty | History begins with Widoken's first successful usage samples. Let the app run through a few refreshes; old usage cannot be imported retrospectively. |
| The overlay does not pass clicks through on Wayland | Check the [platform matrix](#platform-support). KDE has a dedicated bridge; other Wayland compositors do not yet have equivalent support. |

When reporting a provider issue, include the OS, provider, and visible status or error—but never attach credentials, session files, or unredacted logs.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Electron app with live reload. |
| `npm run dev:web` | Run the browser preview with sample usage data for UI work and screenshots. |
| `npm run typecheck` | Check main, renderer, and test TypeScript projects. |
| `npm test` | Run unit tests. |
| `npm run test:e2e` | Build and run the Playwright Electron smoke tests. |
| `npm run build` | Type-check and create production app bundles. |

The Electron main process owns settings, provider adapters, analytics, and the native windows. The widget and dashboard are separate React renderers connected through narrow preload APIs. Start with [Architecture](docs/ARCHITECTURE.md) for the full layout and [Testing](docs/TESTING.md) for validation guidance.

Product screenshots are generated from the browser preview with the scripts in [`assets/readme/image-gen`](assets/readme/image-gen). Their wallpaper, cursors, and theme captures live in [`assets/readme/source`](assets/readme/source); keep these sources when updating the final images.

### Updating screenshots

The capture scripts expect the preview server on a fixed port. From the repository root, use two terminals for the main images:

```bash
# Terminal 1
npx vite --config vite.web.config.ts --port 5199
```

```bash
# Terminal 2
node assets/readme/image-gen/capture.mjs
node assets/readme/image-gen/compose-dashboard.mjs
```

For the theme comparison, start the preview server on port `5213`, then run:

```bash
node assets/readme/image-gen/capture-themes.mjs
node assets/readme/image-gen/compose-themes.mjs
```

These scripts use Playwright Chromium; install its browser binary if it is not already present. Keep the source wallpaper and cursor files in `assets/readme/source/` so regenerated images stay consistent.

## License

Widoken is released under the [MIT License](LICENSE).
