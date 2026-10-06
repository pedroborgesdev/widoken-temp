# Figma mapping

Source file: `94ABqLCXTbNQxvRx8I1HEy`.

| React implementation | Figma node | Notes |
| --- | --- | --- |
| `Widget` | `9:7` | Four-item reference; implementation is dynamic. |
| One-, two-, and three-item widget heights | `9:232`, `9:192`, `9:142` | Generated from `28 + count × 32`. |
| Widget variants | `9:266` | State overview. |
| `UsagePopover` | `9:371` | 160 × 58 px healthy state. |
| `UnavailablePopover` | `9:375` | 160 × 33 px unavailable/error state. |
| `SelectionGrid` | `10:6` | Full left/right drag target set. |
| Left docking group | `10:116` | Simplified to one full-height magnetic column. |
| Right docking group | `10:7` | Simplified to one full-height magnetic column. |

The Figma MCP returned high-fidelity context and screenshots for nodes `9:7` and `9:269`. Original provider, gear, and grab assets were downloaded into `src/renderer/assets`; no temporary Figma URLs remain in source.

The Starter-plan MCP limit was reached before node `10:6` could be returned. A later product change intentionally simplifies it to one 54 px column per side, inset 8 px and extended through the available viewport height.

Settings has no finished Figma design. Its panel is intentionally small and functional, not a proposed final visual design.
