import type { HslColor } from 'react-colorful'
import { HslColorPicker } from 'react-colorful'
import { HueRing } from '../HueRing/HueRing'
import './ColorPicker.css'

type ColorPickerProps = {
  color: HslColor
  currentHex: string
  onChange: (color: HslColor) => void
}

export function ColorPicker({ color, currentHex, onChange }: ColorPickerProps) {
  return (
    <section className="color-section">
      <div className="section-title">カラーピッカー</div>
      <div className="color-wheel-wrap">
        <div className="color-picker">
          <HueRing
            hue={color.h}
            onChange={(hue) => onChange({ ...color, h: hue })}
          />
          <HslColorPicker color={color} onChange={onChange} />
        </div>
      </div>
      <div className="active-color-row">
        <span className="active-swatch" style={{ backgroundColor: currentHex }} />
        <span>選択中の色</span>
        <code>{currentHex.toUpperCase()}</code>
      </div>
    </section>
  )
}
