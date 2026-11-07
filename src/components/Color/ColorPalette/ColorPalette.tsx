import { Check, Minus, Plus } from 'lucide-react'
import './ColorPalette.css'

type ColorPaletteProps = {
  colors: readonly string[]
  currentHex: string
  selectedPalette: number
  onSelect: (hex: string, index: number) => void
  onAdd: () => void
  onRemove: () => void
}

export function ColorPalette({
  colors,
  currentHex,
  selectedPalette,
  onSelect,
  onAdd,
  onRemove,
}: ColorPaletteProps) {
  return (
    <section className="palette-section">
      <div className="section-title">
        <span>カラーパレット</span>
        <div className="palette-actions">
          <span>{colors.length}色</span>
          <button type="button" aria-label="選択中の色を末尾に追加" title="選択中の色を追加" onClick={onAdd}>
            <Plus size={13} />
          </button>
          <button
            type="button"
            aria-label="選択中の色を削除"
            title={colors.length <= 1 ? 'パレットには最低1色必要です' : '選択中の色を削除'}
            onClick={onRemove}
            disabled={colors.length <= 1}
          >
            <Minus size={13} />
          </button>
        </div>
      </div>
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
