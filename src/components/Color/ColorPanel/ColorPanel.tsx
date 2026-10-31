import { PaintBucket } from 'lucide-react'
import type { HslColor } from 'react-colorful'
import { BrushSizeControl } from '../BrushSizeControl/BrushSizeControl'
import { ColorPalette } from '../ColorPalette/ColorPalette'
import { ColorPicker } from '../ColorPicker/ColorPicker'
import { PanelHeading } from '../../Panel/PanelHeading/PanelHeading'
import './ColorPanel.css'

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
      <PanelHeading
        eyebrow="COLOR &amp; SETTINGS"
        title="カラーと設定"
        actionLabel="カラー設定"
        ActionIcon={PaintBucket}
        className="color-heading"
      />
      <ColorPicker color={color} currentHex={currentHex} onChange={onColorChange} />
      <ColorPalette
        currentHex={currentHex}
        selectedPalette={selectedPalette}
        onSelect={onPaletteSelect}
      />
      <BrushSizeControl size={brushSize} onChange={onBrushSizeChange} />
    </aside>
  )
}
