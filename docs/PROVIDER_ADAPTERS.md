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

`ProviderManager` loads enabled adapters, fetches immediately, polls every 30–3600 seconds, caches the latest snapshot, and converts thrown errors into an explicit `error` state. The summary ring displays the maximum percentage among a provider's limits.

## Present adapters

Claude, Cursor, ChatGPT/Codex, and GitHub Copilot use real read-only adapters. Claude reads `~/.claude/.credentials.json` and requests `https://api.anthropic.com/api/oauth/usage`; Cursor reads the editor's session fields from `~/.config/Cursor/User/globalStorage/state.vscdb` and requests `https://cursor.com/api/usage-summary`; Codex reads `~/.codex/auth.json` and requests `https://chatgpt.com/backend-api/wham/usage`; Copilot borrows `GH_TOKEN`, `GITHUB_TOKEN`, GitHub CLI `hosts.yml`, or `gh auth token` and requests `https://api.github.com/copilot_internal/user`. Antigravity remains mock/unavailable until its provider-specific authentication and usage contract is implemented.

## Adding a real adapter

1. Use a supported vendor endpoint or an explicitly approved local integration.
2. Keep all credentials in the main process; use OS-protected storage when persistence is needed.
3. Never read browser cookies or CLI credential files without clear, provider-specific consent.
4. Return `unavailable` when the provider cannot expose limits; do not report a failed request as 0% usage.
5. Add adapter contract tests for success, authentication failure, rate limiting, offline behavior, and malformed payloads.

Provider integrations are intentionally incremental: personal-plan limit APIs are not interchangeable, and a provider returns `unavailable` or `error` instead of a fabricated percentage when its local session or endpoint cannot provide a reading. Claude credentials are never renewed or written by widoken; the owning Claude Code client remains responsible for sign-in and token refresh. Copilot is disabled by default and can be enabled from Settings.
