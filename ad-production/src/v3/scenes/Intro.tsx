import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BrandLockup } from '../art'
import { COLORS, EASE, clamp } from '../tokens'

export function Intro() {
  const frame = useCurrentFrame()
  const enter = EASE.inOutCubic(clamp((frame - 15) / 24))
  const exit = EASE.inOutCubic(clamp((frame - 66) / 15))
  return (
    <AbsoluteFill style={{ background: COLORS.paper, alignItems: 'center', justifyContent: 'center' }}>
      <BrandLockup iconSize={168} wordSize={166} gap={42} style={{ opacity: enter * (1 - exit), transform: 'translateY(-3px)' }} />
    </AbsoluteFill>
  )
}
