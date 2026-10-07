# Testing

Run the automated checks with:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Unit tests cover severity thresholds, summary usage, vertical/horizontal widget dimensions, two-axis normalization, free movement, magnetic docking zones, and provider failures. The Playwright Electron smoke test verifies both widget anatomies, healthy/unavailable popovers, the independent dashboard, widget stop/restart, free dragging, full-height columns, snapping, and the 8 px boundary margin.

Before a release, manually verify:

- 1920×1080 and 2560×1440 at 100%, 125%, and 150% scaling;
- docked and free positions across the screen, including the 8 px boundary margin;
- one through four enabled providers;
- healthy, high-usage, disconnected, unavailable, and network-error states;
- click-through into another native app outside every visible interaction region;
- click-through and hover on the dashboard window, and on another Chromium window, after dragging the widget;
- drag from the grab only, both full-height docking columns, magnetic capture on both sides, and persistence after restart;
- display metric changes and sleep/wake recovery;
- Windows, X11, and XWayland installer builds.

Click-through must be checked manually because Playwright cannot assert that an underlying native application received a mouse event.
