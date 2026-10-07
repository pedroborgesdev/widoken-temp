# Architecture

Widoken is one Electron application with one main process and two independent renderer surfaces. The widget is the always-on-top overlay; the dashboard is the normal application window that owns settings now and can host additional features later.

```text
Electron main process
├── AppController
├── WidgetWindowManager
├── DashboardWindowManager
├── ProviderManager and adapters
├── SettingsRepository
├── AnalyticsService
└── typed IPC handlers
        │
        ├── widget preload → widget renderer
        │   ├── WidgetProvider
        │   ├── widget and usage rings
        │   ├── usage/app popovers
        │   └── drag and interaction regions
        │
        └── dashboard preload → dashboard renderer
            ├── DashboardProvider
            ├── settings navigation
            └── future dashboard features
```

## Process and window boundaries

The two `BrowserWindow` instances have separate renderer contexts, HTML entrypoints, React roots, state providers, and sandboxed preloads. They remain part of one installed application and share the Electron main process. Expensive or failure-prone provider work can later move to an Electron `utilityProcess` without splitting Widoken into separate executables.

The role-specific preloads deliberately expose different capabilities:

- the widget can manage overlay interaction regions, read provider snapshots, update widget settings, and open the dashboard;
- the dashboard can manage its own window, settings, providers, theme import, and application quit;
- neither renderer receives `ipcRenderer`, arbitrary channel access, filesystem access, provider credentials, or process execution.

## Ownership and lifecycle

`AppController` composes shared application services and registers IPC once. `WidgetWindowManager` owns every native resource associated with the overlay, including display watching, Windows cursor tracking, and the KDE/Wayland bridge. `DashboardWindowManager` independently owns the normal dashboard window.

`widget.enabled` is persisted in `settings.json`. Changing it in the dashboard causes the main process to create or destroy the widget window and all of its native resources. Closing the dashboard does not close an enabled widget, and disabling the widget does not close the dashboard. If Widoken starts with the widget disabled, the dashboard opens so the application remains reachable.

`ProviderManager`, analytics, and settings are application services rather than widget services. Provider polling therefore has one source of truth and can serve both renderers without duplicated sessions or polling.

Provider activity is a separate, optional adapter capability. It is sampled on a short interval and merged into `ProviderView` without changing the slower quota refresh cadence. Codex implements this capability from durable turn-boundary events in its local rollouts; an active-to-idle transition triggers a targeted quota refresh.

## State and communication

The widget's reducer contains only overlay interaction state: `passive`, `provider-hover`, and `dragging`. Dashboard settings state lives in `DashboardProvider`; React state is never shared directly between the windows. Persisted changes and live snapshots cross the boundary through typed IPC events.

Settings are atomically replaced under Electron's `userData` directory with owner-only file permissions. Free widget positions are stored as 0–1 ratios, together with the optional docked edge, so layout survives resolution changes.
