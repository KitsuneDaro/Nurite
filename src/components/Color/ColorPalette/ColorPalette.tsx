import { Check } from 'lucide-react'
import './ColorPalette.css'

type ColorPaletteProps = {
  colors: readonly string[]
  currentHex: string
  selectedPalette: number
  onSelect: (hex: string, index: number) => void
}

export function ColorPalette({
  colors,
  currentHex,
  selectedPalette,
  onSelect,
}: ColorPaletteProps) {
  return (
    <section className="palette-section">
      <div className="section-title">カラーパレット <span>24色</span></div>
      <div className="palette-grid">
        {colors.map((hex, index) => (
          <button
            key={`${hex}-${index}`}
            className={`palette-swatch ${selectedPalette === index ? 'active' : ''}`}
            style={{ backgroundColor: selectedPalette === index ? currentHex : hex }}
            onClick={() => onSelect(hex, index)}
            aria-label={`色 ${selectedPalette === index ? currentHex : hex}`}
            aria-pressed={selectedPalette === index}
          >
            {selectedPalette === index && <Check size={13} />}
          </button>
        ))}
      </div>
    </section>
  )
}
