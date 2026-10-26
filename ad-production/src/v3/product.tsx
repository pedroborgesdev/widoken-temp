import React from 'react'
import { Img, staticFile } from 'remotion'
import manifest from '../v2/captures.json'

/**
 * PRODUCT LAYER — V2.
 *
 * Every pixel of the product comes from `scripts/capture-product.mjs`, which
 * runs the real React widget in the app's browser preview. This module only
 * frames that capture. It never redraws, recolours, retypes or rearranges a
 * single interface element.
 *
 * Coordinates inside `focus` are CSS pixels of the capture clip, measured
 * from the live DOM (`boxes` in the manifest), so a camera move can target
 * an actual icon instead of an estimate.
 */

interface Box {
  x: number
  y: number
  width: number
  height: number
}

interface CaptureSpec {
  file: string
  clip: Box
  viewport: { width: number; height: number }
  boxes: Record<string, Box>
}

const CAPTURES = manifest as unknown as Record<string, CaptureSpec>

export type CaptureName =
  | 'widget-vertical'
  | 'widget-horizontal'
  | 'widget-horizontal-1'
  | 'widget-horizontal-2'
  | 'widget-horizontal-3'
  | 'widget-horizontal-4'
  | 'widget-vertical-1'
  | 'widget-vertical-2'
  | 'widget-vertical-3'
  | 'widget-vertical-4'
  | 'widget-vertical-hot'
  | 'widget-horizontal-popover'
  | 'widget-horizontal-popover-cursor-2'
  | 'widget-horizontal-popover-cursor-3'
  | 'widget-horizontal-3-theme-monokai'
  | 'widget-horizontal-3-theme-catppuccin'
  | 'widget-horizontal-3-theme-dark'
  | 'widget-horizontal-3-theme-nord'
  | 'widget-vertical-popover'
  | 'widget-vertical-popover-cursor-3'
  | 'widget-vertical-popover-cursor-4'
  | 'widget-vertical-popover-balance'
  | 'widget-vertical-tucked'

export function capture(name: CaptureName): CaptureSpec {
  return CAPTURES[name]
}

export function box(name: CaptureName, node: string): Box {
  const spec = CAPTURES[name]
  if (!spec) throw new Error(`Missing product capture: ${name}`)
  const target = spec.boxes[node]
  if (!target) throw new Error(`Missing product capture node: ${name}.${node}`)
  return target
}

/** Centre of a named DOM node, in capture-clip CSS pixels. */
export function centre(name: CaptureName, node: string): { x: number; y: number } {
  const b = box(name, node)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

export interface Camera {
  /** Point of the capture (clip CSS px) that the shot centres on. */
  focusX: number
  focusY: number
  /** Where that point lands in the 1920x1080 frame. */
  atX: number
  atY: number
  /** Frame pixels per capture CSS pixel. */
  scale: number
}

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    focusX: m(a.focusX, b.focusX),
    focusY: m(a.focusY, b.focusY),
    atX: m(a.atX, b.atX),
    atY: m(a.atY, b.atY),
    scale: m(a.scale, b.scale)
  }
}

/**
 * One real capture, framed by a camera. The image is positioned so that
 * `focus` lands exactly on `at`; nothing else is transformed.
 */
export function Shot({
  name,
  camera,
  opacity = 1,
  clipTo,
  style
}: {
  name: CaptureName
  camera: Camera
  opacity?: number
  /** Optional rectangular clip in frame coordinates (hard mask). */
  clipTo?: { x: number; y: number; width: number; height: number }
  style?: React.CSSProperties
}) {
  const spec = CAPTURES[name]
  const left = camera.atX - camera.focusX * camera.scale
  const top = camera.atY - camera.focusY * camera.scale
  const width = spec.clip.width * camera.scale
  const height = spec.clip.height * camera.scale

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity,
        clipPath: clipTo
          ? `inset(${clipTo.y}px ${1920 - clipTo.x - clipTo.width}px ${
              1080 - clipTo.y - clipTo.height
            }px ${clipTo.x}px)`
          : undefined,
        ...style
      }}
    >
      <Img
        src={staticFile(spec.file)}
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          maxWidth: 'none',
          display: 'block'
        }}
      />
    </div>
  )
}

/**
 * The real activity animation: 33 captures of the live orbit across one
 * 2.2 s period, played back inside the same camera as the static widget.
 * Provider icons and ring geometry are identical to the static capture
 * because both were taken from the same DOM state.
 */
export function ActivityShot({
  camera,
  frame,
  from = 0,
  opacity = 1,
  variant = 'full'
}: {
  camera: Camera
  frame: number
  /** Absolute frame at which the orbit starts. */
  from?: number
  opacity?: number
  variant?: 'full' | 'compact-3' | 'horizontal-3'
}) {
  const captureName = variant === 'horizontal-3'
    ? 'activity-frames-horizontal-3'
    : variant === 'compact-3' ? 'activity-frames-3' : 'activity-frames'
  const directory = variant === 'horizontal-3'
    ? 'activity-horizontal-3'
    : variant === 'compact-3' ? 'activity-3' : 'activity'
  const spec = CAPTURES[captureName]
  const local = Math.max(0, frame - from)
  const index = Math.floor(local / 2) % 33
  const file = `product/${directory}/frame-${String(index).padStart(3, '0')}.png`
  const left = camera.atX - camera.focusX * camera.scale
  const top = camera.atY - camera.focusY * camera.scale
  const width = spec.clip.width * camera.scale
  const height = spec.clip.height * camera.scale

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity }}>
      <Img
        src={staticFile(file)}
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          maxWidth: 'none',
          display: 'block'
        }}
      />
    </div>
  )
}
