import { Check, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import './ColorPalette.css'

type ColorPaletteProps = {
  colors: readonly string[]
  currentHex: string
  selectedPalette: number
  onSelect: (hex: string, index: number) => void
  onAdd: () => void
  onRemove: () => void
  onMove: (fromIndex: number, toIndex: number) => void
}

export function ColorPalette({
  colors,
  currentHex,
  selectedPalette,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: ColorPaletteProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

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
            className={[
              'palette-swatch',
              selectedPalette === index ? 'active' : '',
              draggingIndex === index ? 'dragging' : '',
              dropTargetIndex === index && draggingIndex !== index ? 'drop-target' : '',
            ].filter(Boolean).join(' ')}
            style={{ backgroundColor: selectedPalette === index ? currentHex : hex }}
            draggable
            title="ドラッグして並べ替え"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', String(index))
              setDraggingIndex(index)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetIndex(index)
            }}
            onDrop={(event) => {
              event.preventDefault()
              const draggedIndex = event.dataTransfer.getData('text/plain')
              const fromIndex = Number(draggedIndex)
              if (draggedIndex !== '' && Number.isInteger(fromIndex)) {
                onMove(fromIndex, index)
              }
              setDraggingIndex(null)
              setDropTargetIndex(null)
            }}
            onDragEnd={() => {
              setDraggingIndex(null)
              setDropTargetIndex(null)
            }}
            onFocus={() => onSelect(hex, index)}
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
