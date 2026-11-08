import type { CSSProperties } from 'react'
import './BrushSizeControl.css'

type BrushSizeControlProps = {
  label?: string
  size: number
  onChange: (size: number) => void
}

export function BrushSizeControl({
  label = 'ブラシサイズ',
  size,
  onChange,
}: BrushSizeControlProps) {
  const progress = ((size - 1) / 254) * 100

  return (
    <section className="brush-size-section">
      <div className="brush-size-heading">
        <div className="section-title">{label}</div>
        <output>{size}<span> px</span></output>
      </div>
      <input
        type="range"
        min="1"
        max="255"
        value={size}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
      />
      <div className="range-labels"><span>1 px</span><span>255 px</span></div>
    </section>
  )
}
