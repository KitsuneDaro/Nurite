import { PaintBucket } from 'lucide-react'
import type { HslColor } from 'react-colorful'
import { BrushSizeControl } from '../BrushSizeControl/BrushSizeControl'
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
  brushSize: number
  onColorChange: (color: HslColor) => void
  onPaletteSelect: (hex: string, index: number) => void
  onPaletteAdd: () => void
  onPaletteRemove: () => void
  onBrushSizeChange: (size: number) => void
}

export function ColorPanel({
  mobileOpen,
  color,
  currentHex,
  paletteColors,
  selectedPalette,
  brushSize,
  onColorChange,
  onPaletteSelect,
  onPaletteAdd,
  onPaletteRemove,
  onBrushSizeChange,
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
      />
      <BrushSizeControl size={brushSize} onChange={onBrushSizeChange} />
    </aside>
  )
}
