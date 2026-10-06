# widoken

`widoken` is a transparent, always-on-top Electron overlay for seeing AI-provider usage at a glance. The UI follows the supplied Figma nodes and keeps the desktop clickable outside the widget by shaping a full-display overlay `BrowserWindow` on Windows and Linux.

## Current status

The desktop MVP includes:

- one transparent, frameless overlay window and a separate settings window;
- a dynamic 1–4 provider widget with Figma assets and programmatic usage rings;
- healthy, loading, disconnected, unavailable, and error data states;
- vertical and horizontal widget layouts, usage popovers, free two-axis dragging, two full-height magnetic docking columns, and an 8 px screen margin;
- persisted provider order, enabled state, refresh interval, startup preference, docking state, and normalized horizontal/vertical position;
- a sandboxed preload API and typed IPC handlers;
- provider polling with a real read-only Cursor adapter, explicit unavailable/error states for providers not yet connected, unit tests, and an Electron smoke test;
- Electron Builder targets for Windows NSIS and Linux AppImage/deb.

Claude, Cursor, Codex, and GitHub Copilot usage are collected from their local sessions and official usage endpoints. Antigravity still needs a provider-specific adapter. The app does not scrape browser cookies; local session files are read only by the main process and only for the provider integrations described in [Provider adapters](docs/PROVIDER_ADAPTERS.md). GitHub Copilot is available in Settings and disabled by default.

## Development

Requirements: Node.js 22+ and npm 11+.

```bash
npm install
npm run dev
```

Para abrir somente o preview do renderer no navegador, com a mesma UI e dados mockados:

```bash
npm run dev:web
```

X11 uses Electron's shaped interaction region. Windows also shapes that region, and samples the cursor so the overlay stays click-through for native apps and other Chromium windows, including its own settings window, after a drag. On KDE/Wayland, a small local KWin script reports cursor movement over D-Bus so Electron enables input only over the widget, popovers, and settings; the invisible area remains click-through.

## Validation and packaging

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run package:linux
npm run package:windows
```

The operating-system click-through behavior still requires the manual matrix in [Testing](docs/TESTING.md); browser automation cannot prove that a click reached another native application below the overlay.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Figma mapping](docs/FIGMA_MAPPING.md)
- [Overlay behavior](docs/OVERLAY_BEHAVIOR.md)
- [Provider adapters](docs/PROVIDER_ADAPTERS.md)
- [Platform support](docs/PLATFORM_SUPPORT.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
