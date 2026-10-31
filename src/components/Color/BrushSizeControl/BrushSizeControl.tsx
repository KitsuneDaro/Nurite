import type { CSSProperties } from 'react'
import './BrushSizeControl.css'

type BrushSizeControlProps = {
  size: number
  onChange: (size: number) => void
}

export function BrushSizeControl({ size, onChange }: BrushSizeControlProps) {
  const progress = ((size - 1) / 62) * 100

  return (
    <section className="brush-size-section">
      <div className="brush-size-heading">
        <div className="section-title">ブラシサイズ</div>
        <output>{size}<span> px</span></output>
      </div>
      <input
        type="range"
        min="1"
        max="63"
        value={size}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="ブラシサイズ"
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
      />
      <div className="range-labels"><span>1 px</span><span>63 px</span></div>
    </section>
  )
}
