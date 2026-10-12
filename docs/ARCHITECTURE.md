# Architecture

Widoken is one Electron application with one main process and two independent renderer surfaces. The widget is the always-on-top overlay; the dashboard is the normal application window that owns settings now and can host additional features later.

```text
Electron main process
├── AppController
├── WidgetWindowManager
├── DashboardWindowManager
├── ProviderManager and adapters
├── SettingsRepository
└── typed IPC handlers
        │
        ├── widget preload → widget renderer
        │   ├── WidgetProvider
        │   ├── widget and usage rings
        │   ├── usage/app popovers
        │   └── drag and interaction regions
        │
        └── dashboard preload → dashboard renderer
            ├── DashboardProvider (settings, provider snapshots, route)
            ├── Widget page: Providers, Usage ring, Appearance, Behavior
            ├── Providers page: per-provider credentials and usage ring options
            └── General page: interface theme, startup, refresh, reset to defaults
```

## Shared models

`src/shared` holds the types that cross process boundaries plus the pure logic both renderers share. `provider.ts` describes snapshots, limits, and reference plan prices; `settings.ts` owns the defaults, the patch shape, and the sanitizers the repository relies on. Keeping these models pure and shared means the widget and the dashboard cannot disagree about what the main process reported.

## Process and window boundaries

The two `BrowserWindow` instances have separate renderer contexts, HTML entrypoints, React roots, state providers, and sandboxed preloads. They remain part of one installed application and share the Electron main process. Expensive or failure-prone provider work can later move to an Electron `utilityProcess` without splitting Widoken into separate executables.

The role-specific preloads deliberately expose different capabilities:

- the widget can manage overlay interaction regions, read provider snapshots, update widget settings, and open the dashboard;
- the dashboard can manage its own window, settings, providers, theme import, and application quit;
- neither renderer receives `ipcRenderer`, arbitrary channel access, filesystem access, provider credentials, or process execution.

## Ownership and lifecycle

`AppController` composes shared application services and registers IPC once. `WidgetWindowManager` owns every native resource associated with the overlay, including display watching, Windows cursor tracking, and the KDE/Wayland bridge. `DashboardWindowManager` independently owns the normal dashboard window.

`widget.enabled` is persisted in `settings.json`. Changing it in the dashboard causes the main process to create or destroy the widget window and all of its native resources. Closing the dashboard does not close an enabled widget, and disabling the widget does not close the dashboard. If Widoken starts with the widget disabled, the dashboard opens at startup so it can be turned back on. The dashboard uses the Monokai Black theme unless `dashboardFollowsWidgetTheme` is on, in which case it uses the widget theme, including a synced VS Code theme.

`ProviderManager` and settings are application services rather than widget services. Provider polling therefore has one source of truth and can serve both renderers without duplicated sessions or polling.

Provider activity is a separate, optional adapter capability. It is sampled on a short interval and merged into `ProviderView` without changing the slower quota refresh cadence. Codex, Cursor, Antigravity, and the DeepSeek Harness implement this capability from durable local turn boundaries; Hugging Face detects request-count increases from its billing usage endpoint. Codex bridges short completion gaps between tool phases, Hugging Face holds each detected increase for 15 seconds, and transient probe failures receive a five-second grace period. An active-to-idle transition triggers a targeted quota refresh.

## State and communication

The widget's reducer contains only overlay interaction state: `passive`, `provider-hover`, and `dragging`. Dashboard settings state lives in `DashboardProvider`; React state is never shared directly between the windows. Persisted changes and live snapshots cross the boundary through typed IPC events.

The dashboard has three top-level pages. Selecting Widget expands a second sidebar, to the right of the main one, with every widget setting. The widget can ask for a page when it opens the dashboard: both the widoken icon and the gear open Widget › Appearance. The main process sanitizes that `DashboardRoute`; a new window receives it as a query parameter, and an open window receives it over `dashboard:navigate`. Opening the dashboard without a route, such as at startup or from a second app instance, lands on Widget › Appearance.

Providers disabled under Providers are not polled, and their Widget visibility is managed separately under Widget › Providers.

Settings are atomically replaced under Electron's `userData` directory with owner-only file permissions. Free widget positions are stored as 0–1 ratios, together with the optional docked edge, so layout survives resolution changes.
