import type { CSSProperties } from 'react'
import { Check, PaintBucket } from 'lucide-react'
import { HslColorPicker, type HslColor } from 'react-colorful'
import { palette } from '../constants/paint'
import { HueRing } from './HueRing'

type ColorPanelProps = {
  color: HslColor
  currentHex: string
  selectedPalette: number
  brushSize: number
  onColorChange: (color: HslColor) => void
  onPaletteSelect: (hex: string, index: number) => void
  onBrushSizeChange: (size: number) => void
}

export function ColorPanel({
  color,
  currentHex,
  selectedPalette,
  brushSize,
  onColorChange,
  onPaletteSelect,
  onBrushSizeChange,
}: ColorPanelProps) {
  return (
    <aside className="panel color-panel">
      <div className="panel-heading color-heading">
        <div>
          <span className="eyebrow">COLOR &amp; SETTINGS</span>
          <h2>カラーと設定</h2>
        </div>
        <button className="icon-button subtle-button" aria-label="カラー設定"><PaintBucket size={17} /></button>
      </div>

      <section className="color-section">
        <div className="section-title">カラーピッカー</div>
        <div className="color-wheel-wrap">
          <div className="color-picker">
            <HueRing
              hue={color.h}
              onChange={(hue) => onColorChange({ ...color, h: hue })}
            />
            <HslColorPicker color={color} onChange={onColorChange} />
          </div>
        </div>
        <div className="active-color-row">
          <span className="active-swatch" style={{ backgroundColor: currentHex }} />
          <span>選択中の色</span>
          <code>{currentHex.toUpperCase()}</code>
        </div>
      </section>

      <section className="palette-section">
        <div className="section-title">カラーパレット <span>24色</span></div>
        <div className="palette-grid">
          {palette.map((hex, index) => (
            <button
              key={`${hex}-${index}`}
              className={`palette-swatch ${selectedPalette === index ? 'active' : ''}`}
              style={{ backgroundColor: selectedPalette === index ? currentHex : hex }}
              onClick={() => onPaletteSelect(hex, index)}
              aria-label={`色 ${selectedPalette === index ? currentHex : hex}`}
              aria-pressed={selectedPalette === index}
            >
              {selectedPalette === index && <Check size={13} />}
            </button>
          ))}
        </div>
      </section>

      <section className="brush-size-section">
        <div className="brush-size-heading">
          <div className="section-title">ブラシサイズ</div>
          <output>{brushSize}<span> px</span></output>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(event) => onBrushSizeChange(Number(event.target.value))}
          aria-label="ブラシサイズ"
          style={{ '--range-progress': `${brushSize}%` } as CSSProperties}
        />
        <div className="range-labels"><span>1 px</span><span>100 px</span></div>
      </section>
    </aside>
  )
}
