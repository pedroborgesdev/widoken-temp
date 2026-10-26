import React from 'react'
import { Composition } from 'remotion'
import { WidokenAd } from './WidokenAd'
import { WidokenAdV2 } from './v2/WidokenAdV2'
import { WidokenAdV3 } from './v3/WidokenAdV3'
import { WidokenAdV4 } from './v4/WidokenAdV4'
import { WidokenAdV41 } from './v4/WidokenAdV41'
import { WidokenAdV42 } from './v4/WidokenAdV42'
import { WidokenAdV5 } from './v5/WidokenAdV5'
import { WidokenAdV6 } from './v6/WidokenAdV6'
import { WidokenAdV7 } from './v7/WidokenAdV7'
import { WidokenAdV8 } from './v8/WidokenAdV8'
import { WidokenAdV10 } from './v10/WidokenAdV10'
import { WidokenAdV9 } from './v9/WidokenAdV9'
import { DURATION, FPS, HEIGHT, WIDTH } from './brand/tokens'
import { DURATION as V2_DURATION, FPS as V2_FPS, HEIGHT as V2_HEIGHT, WIDTH as V2_WIDTH } from './v2/tokens'
import { DURATION as V3_DURATION, FPS as V3_FPS, HEIGHT as V3_HEIGHT, WIDTH as V3_WIDTH } from './v3/tokens'
import { DURATION as V4_DURATION, FPS as V4_FPS, HEIGHT as V4_HEIGHT, WIDTH as V4_WIDTH } from './v4/tokens'
import { DURATION as V5_DURATION, FPS as V5_FPS, HEIGHT as V5_HEIGHT, WIDTH as V5_WIDTH } from './v5/tokens'
import { DURATION as V6_DURATION, FPS as V6_FPS, HEIGHT as V6_HEIGHT, WIDTH as V6_WIDTH } from './v6/tokens'
import { DURATION as V7_DURATION, FPS as V7_FPS, HEIGHT as V7_HEIGHT, WIDTH as V7_WIDTH } from './v7/tokens'
import { DURATION as V8_DURATION, FPS as V8_FPS, HEIGHT as V8_HEIGHT, WIDTH as V8_WIDTH } from './v8/tokens'
import { DURATION as V10_DURATION, FPS as V10_FPS, HEIGHT as V10_HEIGHT, WIDTH as V10_WIDTH } from './v10/tokens'
import { DURATION as V9_DURATION, FPS as V9_FPS, HEIGHT as V9_HEIGHT, WIDTH as V9_WIDTH } from './v9/tokens'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WidokenAdV10"
        component={WidokenAdV10}
        durationInFrames={V10_DURATION}
        fps={V10_FPS}
        width={V10_WIDTH}
        height={V10_HEIGHT}
      />
      <Composition
        id="WidokenAdV9"
        component={WidokenAdV9}
        durationInFrames={V9_DURATION}
        fps={V9_FPS}
        width={V9_WIDTH}
        height={V9_HEIGHT}
      />
      <Composition
        id="WidokenAdV8"
        component={WidokenAdV8}
        durationInFrames={V8_DURATION}
        fps={V8_FPS}
        width={V8_WIDTH}
        height={V8_HEIGHT}
      />
      <Composition
        id="WidokenAdV7"
        component={WidokenAdV7}
        durationInFrames={V7_DURATION}
        fps={V7_FPS}
        width={V7_WIDTH}
        height={V7_HEIGHT}
      />
      <Composition
        id="WidokenAdV6"
        component={WidokenAdV6}
        durationInFrames={V6_DURATION}
        fps={V6_FPS}
        width={V6_WIDTH}
        height={V6_HEIGHT}
      />
      <Composition
        id="WidokenAdV5"
        component={WidokenAdV5}
        durationInFrames={V5_DURATION}
        fps={V5_FPS}
        width={V5_WIDTH}
        height={V5_HEIGHT}
      />
      <Composition
        id="WidokenAdV42"
        component={WidokenAdV42}
        durationInFrames={V4_DURATION}
        fps={V4_FPS}
        width={V4_WIDTH}
        height={V4_HEIGHT}
      />
      <Composition
        id="WidokenAdV41"
        component={WidokenAdV41}
        durationInFrames={V4_DURATION}
        fps={V4_FPS}
        width={V4_WIDTH}
        height={V4_HEIGHT}
      />
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
