import { PaintBucket } from 'lucide-react'
import type { HslColor } from 'react-colorful'
import { ColorPalette } from '../ColorPalette/ColorPalette'
import { ColorPicker } from '../ColorPicker/ColorPicker'
import { PanelHeading } from '../../Panel/PanelHeading/PanelHeading'
import './ColorPanel.css'

type ColorPanelProps = {
  mobileOpen: boolean
  color: HslColor
  currentHex: string
  paletteColors: readonly string[]
  selectedPalette: number
  onColorChange: (color: HslColor) => void
  onPaletteSelect: (hex: string, index: number) => void
  onPaletteAdd: () => void
  onPaletteRemove: () => void
  onPaletteMove: (fromIndex: number, toIndex: number) => void
}

export function ColorPanel({
  mobileOpen,
  color,
  currentHex,
  paletteColors,
  selectedPalette,
  onColorChange,
  onPaletteSelect,
  onPaletteAdd,
  onPaletteRemove,
  onPaletteMove,
}: ColorPanelProps) {
  return (
    <aside className={`panel color-panel ${mobileOpen ? 'mobile-panel-open' : ''}`}>
      <PanelHeading
        eyebrow="COLOR &amp; SETTINGS"
        title="カラーと設定"
        actionLabel="カラー設定"
        ActionIcon={PaintBucket}
        className="color-heading"
      />
      <ColorPicker color={color} currentHex={currentHex} onChange={onColorChange} />
      <ColorPalette
        colors={paletteColors}
        currentHex={currentHex}
        selectedPalette={selectedPalette}
        onSelect={onPaletteSelect}
        onAdd={onPaletteAdd}
        onRemove={onPaletteRemove}
        onMove={onPaletteMove}
      />
    </aside>
  )
}
