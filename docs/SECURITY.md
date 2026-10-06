# Security

The renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. Preload exposes only explicit overlay, provider, settings, and quit operations. It does not expose `ipcRenderer`, filesystem access, process execution, or arbitrary channel names.

Main-process handlers validate and clamp interaction rectangles and sanitize all persisted settings. Settings are atomically replaced and written with mode `0600`.

No provider secret is currently collected. A real adapter must keep tokens outside React and should use Electron `safeStorage` or an OS credential store. Automatic browser-cookie capture and silent reads of other applications' credential files are out of scope.

Production dependencies currently have no known npm audit findings. Build-only transitive advisories should be reviewed before each release, along with Electron updates.
