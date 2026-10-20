# Widoken Commercial V4 — QA report

Master audited: `output/widoken-comercial-v4.mp4`

## Technical result

- Duration: 46.507 s / 1395 frames.
- Picture: 1920×1080, 30/1 fps, H.264 High, progressive.
- Pixel format: yuv420p; colour primaries, transfer and matrix tagged BT.709.
- Audio: AAC LC, 48 kHz, stereo.
- Integrated loudness: −18.5 LUFS.
- True peak: −1.0 dBTP.
- Loudness range: 9.2 LU.
- TypeScript: `tsc --noEmit` passed.
- Black-frame scan: no interval reported by `blackdetect=d=0.01:pix_th=0.02`.

## Visual inspection

Reviewed:

- Five overview sheets sampled every 0.5 s.
- Twelve transition sheets covering scene cuts, internal state switches, every frame from −5 to +5 and ±0.2 s.
- Ten full-resolution representative scene frames.
- Dedicated spot renders for the consumption popover, theme gallery groups and final 09→10 handoff.

Passed checks:

- No clipped headline, accent or CTA.
- No text/product collision in final hold states.
- No black flash or accidental dark transition.
- Product aspect ratios remain unchanged.
- Cursor usage semantics read “405 / 500 used = 81%”; LEFT/RIGHT remain the real split-ring labels.
- Harness/DeepSeek balance remains a real `$2.00 remaining` capture.
- Activity uses the 33 real application frames and preserves full-widget context.
- Theme gallery shows three complete large captures per hold and includes all 11 real themes.
- Final CTA is fully assembled before 42.6 s and remains unchanged through 46.5 s.
- V1, V2, V3 and the V3 MP4 remain untouched.

## Corrections made during visual QA

1. Fixed zero-area wrappers that hid the real usage popover and benefit-scene widget.
2. Reduced the gallery viewport and recalculated offsets to hold exactly three complete theme previews.
3. Removed orphan demo labels at scene starts and faded the last balance label before activity.
4. Added the missing white exit sweep over the green benefit field.
5. Added a one-frame overlap so the official icon and product cannot blink at 09→10.
6. Raised the audio master from −20.6 to −18.5 LUFS while retaining −1.0 dBTP.
7. Replaced the publicly broken 404 footer with the verified public repository address.

## Remaining publication dependency

The verified repository currently has no GitHub Release. The film is technically and visually approved, but its “Baixe” CTA should not be published as a binary-download campaign until a release is created. Once available, change the footer to the canonical public `/releases/latest` URL and rerender.
