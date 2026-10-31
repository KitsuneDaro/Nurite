import type { KeyboardEvent, PointerEvent } from 'react'

type HueRingProps = {
  hue: number
  onChange: (hue: number) => void
}

function hueFromPointer(event: PointerEvent<SVGSVGElement>) {
  const bounds = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - bounds.left - bounds.width / 2
  const y = event.clientY - bounds.top - bounds.height / 2
  return (Math.atan2(y, x) * 180 / Math.PI + 450) % 360
}

export function HueRing({ hue, onChange }: HueRingProps) {
  const radians = (hue - 90) * Math.PI / 180
  const markerPositionX = 50 + 47.25 * Math.cos(radians)
  const markerPositionY = 50 + 47.25 * Math.sin(radians)

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange((hue + step) % 360)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange((hue - step + 360) % 360)
    }
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    onChange(hueFromPointer(event))
  }

  return (
    <div className="hue-ring">
      <svg
        className="hue-ring-control"
        viewBox="0 0 100 100"
        role="slider"
        tabIndex={0}
        aria-label="色相"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hue) % 360}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            onChange(hueFromPointer(event))
          }
        }}
      >
        <circle className="hue-ring-hit-area" cx="50" cy="50" r="43" />
      </svg>
      <span
        className="hue-ring-marker"
        style={{ left: `${markerPositionX}%`, top: `${markerPositionY}%` }}
      />
    </div>
  )
}
