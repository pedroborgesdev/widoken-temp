# Widoken Commercial V4 — creative and technical review

## Outcome

V4 is a complete redesign rather than an incremental V3 edit. It removes the tank, ant and every metaphor built around them. The film now establishes the product before 12 seconds, carries real product captures continuously across scenes and closes with a six-second commercial signature.

## V3 → V4

| Area | V3 | V4 |
|---|---|---|
| Opening | Abstract tank/ant metaphor delayed the product | Concrete multi-tab problem followed by the product at 7.4 s |
| Product presence | Small in several shots | Large horizontal or vertical capture in every proof scene |
| Themes | Dense 11-item mini-grid | Masked carousel, three large real previews per hold, all 11 shown |
| Usage proof | Capture appeared as a discrete card | Plain widget opens into the real Cursor popover and closes before handoff |
| Balance proof | Separate shot with weak continuity | Vertical widget is retained, opens the real balance popover and stays through activity |
| Activity | Tight crop reduced context | Full real widget plus the 33 captured activity states |
| Benefit | Tank-based scale metaphor | White/green editorial field: “Menos abas. Mais foco.” |
| CTA | Small URL and small product | Large CTA strip, 31 px URL, large product capture, 3.9 s final hold |
| Transitions | Frequent fades and an accidental dark interval | Wipes, masks, match cuts and camera moves; no black transition |

## Real Widoken assets used

- `product/brand/icon.png`
- `product/widget-horizontal.png`
- `product/widget-horizontal-popover.png`
- `product/widget-vertical.png`
- `product/widget-vertical-popover-balance.png`
- `product/activity/frame-000.png` through `frame-032.png`
- All 11 PNG captures in `product/themes/`
- DOM-measured geometry in `src/v3/captures.json`

The application UI is never redrawn. External typography, colour fields and demo metric diagrams are advertising graphics, not fake Widoken UI.

## URL validation

Checked on 2026-10-20:

- `https://github.com/pedroborgesdev/widoken/releases/latest` returned HTTP 404.
- The configured public remote `https://github.com/pedroborgesdev/widoken-temp` returned HTTP 200.
- `https://github.com/pedroborgesdev/widoken-temp/releases/latest` redirects to the releases index, which currently states that there are no releases.

The V4 footer therefore uses the reachable public repository URL instead of publishing a broken address. Before campaign publication, create the official release, rename/publish the final repository if intended, restore the canonical `/releases/latest` destination and rerender.

## QA method

- TypeScript compile with `tsc --noEmit`.
- Full 1920×1080 H.264/AAC render at 30 fps.
- Frame extraction every 0.5 seconds.
- Frame extraction at every frame from −5 to +5 and at ±0.2 s around scene/internal transitions.
- Ten representative scene frames exported at full resolution.
- Human visual review of the overview, transition sheets and corrected spot frames.
- `ffprobe` verification of duration, resolution, frame rate, pixel format and BT.709 tags.
- `loudnorm` measurement of integrated loudness and true peak.

## Publication gate

Visual and technical QA are complete. Public distribution remains gated only by creation of a real downloadable GitHub Release and replacement of the temporary repository path in the footer.
