# Platform support

| Platform | V1 status | Notes |
| --- | --- | --- |
| Windows | Supported target | Uses `BrowserWindow.setShape()`. |
| Linux X11 | Supported target | Uses `BrowserWindow.setShape()`. |
| Linux XWayland | Compatibility target | Available with `WIDOKEN_OZONE_PLATFORM=x11`; driver support varies. |
| KDE/Wayland | Supported target | Uses native Ozone Wayland plus a session-scoped KWin bridge for regional click-through and `keepAbove`. |
| Other Wayland compositors | Experimental | The widget renders, but regional click-through needs a compositor-specific cursor bridge. |
| macOS | Planned | Current fallback is not considered feature-complete for regional click-through. |

The V1 targets one display. The overlay starts on the primary display unless a display id is persisted. Display-change events are debounced until the desktop geometry settles, then the native window, click-through coordinates, and KDE/KWin bridge are reconciled together. The same reconciliation runs after sleep/wake. Normalized two-axis widget positioning preserves the approximate location while keeping the widget inside the current display margins.

Choosing another monitor explicitly can be added later using the already persisted optional display id. On native KDE/Wayland, when no configured display is available, the largest connected display remains the fallback target.
