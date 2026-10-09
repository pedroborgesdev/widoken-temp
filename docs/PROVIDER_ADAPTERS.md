# Provider adapters

UI code depends only on `ProviderView` and `ProviderSnapshot`. Adapters implement:

```ts
interface ProviderAdapter {
  id: string
  name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  getUsage(): Promise<ProviderSnapshot>
  isConnected(): Promise<boolean>
}
```

`ProviderManager` loads enabled adapters, fetches immediately, polls every 30–3600 seconds, caches the latest snapshot, and converts thrown errors into an explicit `error` state. Providers with multiple metered limits use a split summary ring by default: the configured primary limit owns the left semicircle and the secondary limit owns the right, with no separator stroke. The dashboard's Widget › Usage ring page can disable the split and choose one limit, or choose the limit shown on each side; picking the other side's limit swaps the two. Limit choices use the stable IDs defined by each adapter; Claude aliases its alternate session and weekly IDs to the same two choices.

## Present adapters

Claude, Cursor, ChatGPT/Codex, GitHub Copilot, Antigravity, and DeepSeek use real read-only adapters. Claude reads `~/.claude/.credentials.json` and requests `https://api.anthropic.com/api/oauth/usage`; Cursor reads the editor's session fields from `%APPDATA%/Cursor/User/globalStorage/state.vscdb` on Windows, `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` on macOS, or `~/.config/Cursor/User/globalStorage/state.vscdb` on Linux and requests `https://cursor.com/api/usage-summary`, exposing the separate Cursor Models and Other Models pools; Codex reads `~/.codex/auth.json` and requests `https://chatgpt.com/backend-api/wham/usage`; Copilot borrows `GH_TOKEN`, `GITHUB_TOKEN`, GitHub CLI `hosts.yml`, or `gh auth token` and requests `https://api.github.com/copilot_internal/user`; DeepSeek reads the DeepSeek Harness grant from `~/.dsh/.credentials.yaml` (`DSH_HOME/.credentials.yaml` when set) and/or a `safeStorage`-encrypted API key saved from the dashboard, falling back to `DEEPSEEK_API_KEY`. Antigravity discovers its authenticated language server from the official `ANTIGRAVITY_LS_*` environment variables or the local `agy --hub` process, then requests `GetUserStatus` over loopback. Process discovery uses CIM on Windows and `ps` on macOS/Linux. Activity and optional local insights read the shared `~/.gemini/antigravity` tree on all three platforms.

Codex also has a read-only activity probe. It follows current and previous-day rollout files under `~/.codex/sessions`, treats `task_started`/`turn_started` as active and completion/abort markers as idle, and expires abandoned markers after 30 minutes. Activity is polled separately from quota usage so the widget can react within 750 ms. When a turn ends, Widoken refreshes that provider's quota immediately. Cursor has the same kind of probe over the agent transcripts under `~/.cursor/projects/*/agent-transcripts`: a user prompt marks the chat active and the `turn_ended` line (success, error, or abort) marks it idle. Subagent transcripts are skipped because the parent turn stays open while they run. Cursor only writes the agent's lines when the turn ends, so an unfinished prompt expires after 2 hours instead of 30 minutes. Antigravity follows presence locks and conversation transcripts below `~/.gemini/antigravity`; a `USER_INPUT` starts activity and a completed `PLANNER_RESPONSE` ends it. Other providers remain idle until their clients expose an equally reliable local activity boundary; file modification alone is not treated as a live request.

## Adding a real adapter

1. Use a supported vendor endpoint or an explicitly approved local integration.
2. Keep all credentials in the main process; use OS-protected storage when persistence is needed.
3. Never read browser cookies or CLI credential files without clear, provider-specific consent.
4. Return `unavailable` when the provider cannot expose limits; do not report a failed request as 0% usage.
5. Add adapter contract tests for success, authentication failure, rate limiting, offline behavior, and malformed payloads.

Provider integrations are intentionally incremental: personal-plan limit APIs are not interchangeable, and a provider returns `unavailable` or `error` instead of a fabricated percentage when its local session or endpoint cannot provide a reading. Claude credentials are never renewed or written by widoken; the owning Claude Code client remains responsible for sign-in and token refresh. Copilot and DeepSeek are disabled by default and can be enabled from the dashboard's Widget › Providers page.

## DeepSeek balance as quota

DeepSeek exposes no percentage or reset window, only a prepaid balance per currency. The adapter returns one `UsageLimit` per currency (`balance-usd`, `balance-cny`) and can read it from two sources:

- **Harness account** — parses the `deepseek-account-platform/default` record (`kind: grant`, payload `{ version, token, issuer }`) from `~/.dsh/.credentials.yaml` or `DSH_HOME/.credentials.yaml` using js-yaml's safe `JSON_SCHEMA`. Only with clear, user-enabled consent, read-only, and only when `issuer` is exactly `https://platform.deepseek.com`; a token must be non-empty ASCII. Widoken never modifies that file. The adapter then calls `GET https://platform.deepseek.com/api/v0/users/get_user_summary` with `redirect: 'error'`, a 15 s timeout, an `x-dsh-auth-token` header, an empty `x-client-bundle-id`, `x-client-platform` (`desktop-win`/`desktop-mac`/`web`), `x-client-version`, `x-client-locale` (`en_US`/`zh_CN`), and `x-client-timezone-offset` in seconds east of UTC. A `{ code: 0, data: { biz_code: 0, biz_data: { normal_wallets, bonus_wallets } } }` envelope is required; normal and bonus wallets are summed per USD/CNY currency, and balances may be decimal strings including scientific notation. HTTP 401 and envelope code `40003` mean the session was rejected.
- **API key** — `GET https://api.deepseek.com/user/balance` with `Authorization: Bearer`; the key comes first from the `safeStorage`-encrypted row in `analytics.sqlite`, then from `DEEPSEEK_API_KEY` as a compatibility fallback.

Each currency produces one limit. The `credentialSource` setting is `auto` by default and can be fixed to `harness-account` or `api-key`. `auto` prefers the Harness account; when it is missing, or any request/parse/auth step fails, the adapter tries the API key. After a source succeeds it is remembered, so later polls try it first and only switch when it breaks. Fixed modes use exactly one source and return an explicit `unavailable`/`error` state otherwise. The connected snapshot carries the active `authSource` (`harness-account` or `api-key`) — never the credential. With no usable credential, or on an HTTP 401/403, HTTP 429, offline request, or malformed payload, the adapter reports an explicit `unavailable` or `error` state instead of a synthetic percentage, and no error message includes the token, key, or response body.

DeepSeek exposes a prepaid balance rather than a quota window, so the ring is derived from an observed baseline rather than from an absolute balance value. The first balance observed for an `authSource:currency` pair becomes that pair's capacity. While the balance falls or stays equal, the capacity is kept and `percent = (capacity - remaining) / capacity * 100`, clamped to 0–100. When the balance is higher than the previous reading it is a recharge: the entire capacity is replaced by the new balance (the delta is not added), usage resets to zero, and the next drop is measured against the recharged value. A first observation at zero stays fully depleted. For example, 10 reads 0%, then 5 reads 50%, a recharge to 7 makes the capacity 7 and reads 0%, and a later 6 reads 14.2857%. Baselines are isolated per auth source and currency and persisted (capacity, last remaining balance, and a `baselineVersion: 2` marker) in `deepseek-balance.json` under Electron's userData directory, so a restart keeps the capacity. States written by earlier versions have no marker: they are migrated to the current key format, their capacity is reset to the persisted remaining balance, and the corrected state is written back. The DeepSeek limit exposes `percent`, `remaining`, `used`, `limit`, and `currency`, all derived from the observed baseline. The API key is never stored there: it lives only as a ciphertext BLOB in the `provider_credentials` table of `analytics.sqlite`, and never reaches a renderer.
