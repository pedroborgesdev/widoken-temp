import React from 'react'
import { Composition } from 'remotion'
import { WidokenAd } from './WidokenAd'
import { WidokenAdV2 } from './v2/WidokenAdV2'
import { WidokenAdV3 } from './v3/WidokenAdV3'
import { WidokenAdV4 } from './v4/WidokenAdV4'
import { DURATION, FPS, HEIGHT, WIDTH } from './brand/tokens'
import { DURATION as V2_DURATION, FPS as V2_FPS, HEIGHT as V2_HEIGHT, WIDTH as V2_WIDTH } from './v2/tokens'
import { DURATION as V3_DURATION, FPS as V3_FPS, HEIGHT as V3_HEIGHT, WIDTH as V3_WIDTH } from './v3/tokens'
import { DURATION as V4_DURATION, FPS as V4_FPS, HEIGHT as V4_HEIGHT, WIDTH as V4_WIDTH } from './v4/tokens'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WidokenAdV4"
        component={WidokenAdV4}
        durationInFrames={V4_DURATION}
        fps={V4_FPS}
        width={V4_WIDTH}
        height={V4_HEIGHT}
      />
      <Composition
        id="WidokenAdV3"
        component={WidokenAdV3}
        durationInFrames={V3_DURATION}
        fps={V3_FPS}
        width={V3_WIDTH}
        height={V3_HEIGHT}
      />
      {/* V2 — the shipping cut. */}
      <Composition
        id="WidokenAd"
        component={WidokenAdV2}
        durationInFrames={V2_DURATION}
        fps={V2_FPS}
        width={V2_WIDTH}
        height={V2_HEIGHT}
      />
      {/* V1 — retained for side-by-side comparison. */}
      <Composition
        id="WidokenAdV1"
        component={WidokenAd}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
