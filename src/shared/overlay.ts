/**
 * CSS pixels the idle shadow extends past a region, before widget scale.
 * Covers the widget drop-shadow (0 10px 13px) and the larger popover
 * box-shadow (0 12px 30px). The window shape clips painting, so the paint
 * region has to include this; hit testing stays on the widget itself.
 */
export const SHADOW_PAINT_OUTSET = 102

export function shadowPaintOutset(shadows: boolean, scale: number): number {
  if (!shadows) return 0
  return Math.ceil(SHADOW_PAINT_OUTSET * scale)
}
