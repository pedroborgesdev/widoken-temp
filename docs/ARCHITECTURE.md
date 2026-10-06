# Architecture

The application has one display-sized `BrowserWindow`; popovers, settings, and drag targets are React components in its renderer tree. No auxiliary windows are created.

```text
Electron main
├── window lifecycle and display bounds
├── interaction-region shaping
├── typed settings repository
├── provider manager and adapters
└── narrow IPC handlers
        ↓
sandboxed preload
        ↓
React renderer
├── OverlayContext reducer
├── Widget and dynamic usage rings
├── UsagePopover
├── SelectionGrid
└── minimal SettingsPanel
```

The main process owns persistence, native window operations, polling, and future credentials. The renderer receives provider snapshots, never secrets. `ProviderManager` polls adapters independently of hover; hover only reads the latest snapshot.

Settings are written atomically to `settings.json` under Electron's `userData` directory with owner-only file permissions. Free horizontal and vertical positions are stored as 0–1 ratios, together with the optional docked edge, so the layout survives resolution changes.

The reducer has four mutually exclusive modes: `passive`, `provider-hover`, `dragging`, and `settings`. This prevents conflicting popover, drag, and settings states.
