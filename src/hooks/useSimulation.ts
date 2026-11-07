import { useEffect, useState } from 'react'
import { phaseAt, RECORDING_DURATION } from '../model/recording'

export function useSimulation() {
  const [position, setPosition] = useState({ time: 0, playing: false })
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!position.playing) return

    let frame: number
    let previous = performance.now()

    function advance(now: number) {
      // Cap the step so returning to a backgrounded tab doesn't skip the example.
      const delta = Math.min(0.1, (now - previous) / 1000)
      previous = now
      setPosition((current) => {
        if (!current.playing) return current
        const time = Math.min(RECORDING_DURATION, current.time + delta * speed)
        return { time, playing: time < RECORDING_DURATION }
      })
      frame = requestAnimationFrame(advance)
    }

    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [position.playing, speed])

  return {
    ...position,
    speed,
    setSpeed,
    phase: phaseAt(position.time),
    togglePlayback() {
      setPosition(({ time, playing }) => ({
        time: time === RECORDING_DURATION ? 0 : time,
        playing: !playing,
      }))
    },
    seek(time: number) {
      setPosition({ time: Math.min(RECORDING_DURATION, Math.max(0, time)), playing: false })
    },
  }
}
