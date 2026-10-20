# Widoken Commercial V4 — timeline and motion system

## Timeline

| Scene | Frames | Time | Message | Product state |
|---|---:|---:|---|---|
| 01 Brand | 0–71 | 0:00–0:02.4 | Widoken | Brand lockup |
| 02 Problem | 72–221 | 0:02.4–0:07.4 | Limits should not require multiple tabs | Editorial demo metrics |
| 03 Solution | 222–353 | 0:07.4–0:11.8 | Meet Widoken | Real horizontal widget |
| 04 Concept | 354–503 | 0:11.8–0:16.8 | Your AIs and limits at a glance | Real horizontal widget |
| 05 Consumption | 504–674 | 0:16.8–0:22.5 | Usage and renewal | Real Cursor usage popover |
| 06 Balance | 675–809 | 0:22.5–0:27.0 | Remaining monetary balance | Real balance popover |
| 07 Activity | 810–944 | 0:27.0–0:31.5 | Active provider state | 33 real captured activity frames |
| 08 Themes | 945–1055 | 0:31.5–0:35.2 | 11 themes | 11 real theme captures, three large at a time |
| 09 Benefit | 1056–1199 | 0:35.2–0:40.0 | Fewer tabs, more focus | Widget bridges two colour fields |
| 10 CTA | 1199–1394 | 0:40.0–0:46.5 | Download Widoken | Large real widget and verified public repository URL |

## Reusable motion grammar

- Text enter: 10 frames, 30 px vertical travel, `outExpo`.
- Text exit: 8–9 frames, grouped, `inOutCubic`.
- Product enter: 14–16 frames, 2D position/scale only.
- Product reposition: 18–28 frames, continuous camera interpolation.
- Colour wipe: 11–12 frames using official solid colours; never black.
- Capture switch: 12–14 frames through an external mask.
- Theme gallery: 11-frame horizontal slides with true holds between positions.
- Every scene owns enter, hold and exit phases. All values are frame-driven.

## Transition entities

1. 01→02: grouped logo opacity to white.
2. 02→03: coordinated metric exit and 11-frame orange wipe; scene 03 removes the same panel.
3. 03→04: exact shared horizontal-widget camera plus masked copy exit.
4. 04→05: 26-frame product camera move into the Cursor context and masked real capture switch.
5. 05→06: usage popover closes, horizontal widget exits left, vertical widget enters from the right.
6. 06→07: same vertical-widget camera retained across the cut.
7. 07→08: vertical widget pulls back and moves right before the gallery enters.
8. 08→09: gallery slides out behind a 12-frame green surface.
9. 09→10: green surface exits; brand icon and balance capture land in their exact final positions.

## Product fidelity

The commercial never redraws the product. `Shot` and `ActivityShot` only position unmodified PNG captures from `public/product`. Theme previews are the real application captures in `public/product/themes`. Product geometry comes from `src/v3/captures.json`, which was measured from the live DOM.
