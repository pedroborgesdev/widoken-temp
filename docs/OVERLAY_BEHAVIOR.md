# Overlay behavior

In passive mode, the native window is the size of the selected display, while its shape contains only the widget. Opening provider details or settings adds that component's rectangle to the shape.

On KDE/Wayland, the app uses native Ozone Wayland so the transparent surface is composed reliably. Since KWin does not honor Electron's partial `setShape()` for this surface, a bundled KWin script publishes the compositor's cursor position over the local session D-Bus. Electron then toggles `setIgnoreMouseEvents()` only when the pointer crosses the widget, popover, or settings rectangles. The same session-scoped script identifies the overlay by its process id and enforces KWin's `keepAbove` property. The bridge publishes cursor movement across the selected display so a freely positioned widget remains interactive; it captures no clicks or keys and installs no system-wide script.

Only the six-pixel grab affordance starts a drag. During drag, the entire window temporarily becomes interactive and the selection grid appears:

- the widget follows the pointer freely on both axes;
- one 54 px magnetic column appears on each side, without a secondary arrow lane;
- both columns are inset 8 px and fill the remaining viewport height;
- entering either magnetic target pulls the widget to that edge, inset by 8 px, and releasing docks it there;
- releasing elsewhere keeps the widget free and persists normalized horizontal and vertical coordinates;
- movement is clamped to an 8 px margin on every screen edge (equivalent to Tailwind's default `spacing-2`).

At pointer release, settings are persisted, the grid is hidden, and native interaction returns to the widget rectangle. Provider rows remain hover targets and never initiate widget movement.

In vertical layout, popovers open to the left or right as before. In horizontal layout, each popover is centered on its hovered provider and opens below or above the widget according to the available screen space, while preserving the 8 px viewport margin. Popovers and settings are included in the native interaction shape so moving across the gap does not hand the pointer to the underlying application.

On KDE/Wayland the KWin bridge applies the selected display's exact logical geometry instead of relying on compositor maximization. This prevents a 1920 px external display from inheriting the 1600 px horizontal limit of a scaled laptop panel.
