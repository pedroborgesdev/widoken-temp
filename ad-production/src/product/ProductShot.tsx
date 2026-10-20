import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { EASE, clamp } from '../brand/tokens'

/**
 * PRODUCT LAYER.
 *
 * Every shot in the ad is a real capture of the running Widoken widget.
 * This component only frames, crops and moves those captures - it never
 * redraws the interface.
 */

export interface CaptureRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Natural pixel size of each capture plus the rect of the visible widget
 * inside it (device pixels, DPR 4). The pill rect is what the ad composes
 * against, so the product always lands exactly where the layout wants it.
 */
export const CAPTURES = {
  'widget-vertical': {
    image: { width: 488, height: 1976 },
    pill: { x: 136, y: 208, width: 215, height: 1559 }
  },
  'widget-vertical-hot': {
    image: { width: 488, height: 1976 },
    pill: { x: 136, y: 136, width: 215, height: 1703 }
  },
  'widget-horizontal': {
    image: { width: 1976, height: 488 },
    pill: { x: 210, y: 136, width: 1557, height: 215 }
  },
  'widget-horizontal-popover': {
    image: { width: 2156, height: 1488 },
    pill: { x: 208, y: 208, width: 1560, height: 216 }
  },
  'widget-vertical-popover': {
    image: { width: 1856, height: 2320 },
    pill: { x: 208, y: 208, width: 216, height: 1703 }
  },
  'widget-vertical-popover-balance': {
    image: { width: 1856, height: 2120 },
    pill: { x: 208, y: 208, width: 216, height: 1703 }
  },
  'widget-vertical-tucked': {
    image: { width: 136, height: 4400 },
    pill: { x: 0, y: 1356, width: 136, height: 1768 }
  }
} as const

export type CaptureName = keyof typeof CAPTURES

export interface ShotTransform {
  scale?: number
  x?: number
  y?: number
}

export interface ProductShotProps {
  capture: CaptureName
  /**
   * Without a crop, x / y / width describe where the visible widget lands in
   * the frame. With a crop, they describe the cropped region instead.
   */
  x: number
  y: number
  width?: number
  height?: number
  /** Region of the capture to show, in image pixels. */
  crop?: CaptureRect
  from?: ShotTransform
  to?: ShotTransform
  opacityFrom?: number
  opacityTo?: number
  /** Explicit scene-driven opacity for delayed entrances and crossfades. */
  opacity?: number
  style?: React.CSSProperties
  className?: string
}

export function ProductShot({
  capture,
  x,
  y,
  width,
  height,
  crop,
  from = {},
  to = {},
  opacityFrom = 1,
  opacityTo = 1,
  opacity: explicitOpacity,
  style,
  className
}: ProductShotProps) {
  const frame = useCurrentFrame()
  const spec = CAPTURES[capture]
  const region: CaptureRect = crop ?? { x: 0, y: 0, width: spec.image.width, height: spec.image.height }

  let scale: number
  let originX = x
  let originY = y

  if (crop) {
    scale = width ? width / region.width : height ? height / region.height : 1
  } else {
    // Compose against the widget itself, not against the capture padding.
    const pill = spec.pill
    scale = width ? width / pill.width : height ? height / pill.height : 1
    originX = x - pill.x * scale
    originY = y - pill.y * scale
  }

  const boxWidth = region.width * scale
  const boxHeight = region.height * scale

  const progress = EASE.outQuint(clamp(frame / 40))
  const startScale = from.scale ?? to.scale ?? 1
  const endScale = to.scale ?? from.scale ?? 1
  const motionScale = startScale + (endScale - startScale) * progress
  const motionX = (from.x ?? to.x ?? 0) + ((to.x ?? from.x ?? 0) - (from.x ?? to.x ?? 0)) * progress
  const motionY = (from.y ?? to.y ?? 0) + ((to.y ?? from.y ?? 0) - (from.y ?? to.y ?? 0)) * progress
  const opacity = explicitOpacity ?? opacityFrom + (opacityTo - opacityFrom) * progress

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: originX,
        top: originY,
        width: boxWidth,
        height: boxHeight,
        overflow: 'hidden',
        opacity,
        ...style
      }}
    >
      <Img
        src={staticFile(`product/${capture}.png`)}
        style={{
          position: 'absolute',
          left: -region.x * scale,
          top: -region.y * scale,
          width: spec.image.width * scale,
          height: spec.image.height * scale,
          transform: `translate(${motionX}px, ${motionY}px) scale(${motionScale})`,
          transformOrigin: 'center center'
        }}
      />
    </div>
  )
}

/**
 * The real activity animation, sampled from the running widget at 33 exact
 * phases of its 2200 ms orbit and played back as a deterministic sequence.
 */
export function ActivityStrip({
  x,
  y,
  width,
  crop,
  from = 0,
  frames = 33
}: {
  x: number
  y: number
  width: number
  crop: CaptureRect
  from?: number
  frames?: number
}) {
  const frame = useCurrentFrame()
  const local = frame - from
  const index = local < 0 ? 0 : Math.floor(local / 2) % frames
  const imageWidth = 488
  const imageHeight = 1976
  const scale = width / crop.width

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: crop.width * scale,
        height: crop.height * scale,
        overflow: 'hidden'
      }}
    >
      <Img
        src={staticFile(`product/activity/frame-${String(index).padStart(3, '0')}.png`)}
        style={{
          position: 'absolute',
          left: -crop.x * scale,
          top: -crop.y * scale,
          width: imageWidth * scale,
          height: imageHeight * scale
        }}
      />
    </div>
  )
}
