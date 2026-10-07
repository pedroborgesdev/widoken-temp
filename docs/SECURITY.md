# Security

Both renderers run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. The widget and dashboard use separate preloads: the widget receives only overlay, provider, settings, and dashboard-open operations; the dashboard receives provider, settings, theme-sync, dashboard-window, and quit operations. Neither exposes `ipcRenderer`, filesystem access, process execution, or arbitrary channel names.

Main-process handlers validate and clamp interaction rectangles and sanitize all persisted settings. Settings are atomically replaced and written with mode `0600`.

No provider secret is currently collected. A real adapter must keep tokens outside React and should use Electron `safeStorage` or an OS credential store. Automatic browser-cookie capture and silent reads of other applications' credential files are out of scope.

VS Code theme sync runs only after the user presses the sync button. The main process reads VS Code's local user/Profile settings, installed extension manifests, and the selected color-theme file. It does not read source files or send theme data over the network; only the resolved theme name and validated hexadecimal colors are persisted.

The Codex activity probe reads local rollout JSONL files and retains only the latest start/completion state, byte offset, and modification time for each recent file. Message text and tool output are not logged, persisted by Widoken, or sent to a renderer; renderers receive only `active` or `idle`.

Production dependencies currently have no known npm audit findings. Build-only transitive advisories should be reviewed before each release, along with Electron updates.
