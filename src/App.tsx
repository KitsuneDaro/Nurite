import { useState } from 'react'
import type { HslColor } from 'react-colorful'
import type { BrushShape, BrushType } from './types'
import { CanvasWorkspace } from './components/Canvas/CanvasWorkspace/CanvasWorkspace'
import { ColorPanel } from './components/Color/ColorPanel/ColorPanel'
import { ToolsPanel } from './components/Tools/ToolsPanel/ToolsPanel'
import { TopBar } from './components/TopBar/TopBar'
import { hslToHex, hexToHsl } from './utils/color'
import './App.css'

function App() {
  const [color, setColor] = useState<HslColor>(() => hexToHsl('#168f98'))
  const [selectedPalette, setSelectedPalette] = useState(9)
  const [brushShape, setBrushShape] = useState<BrushShape>('round')
  const [paintType, setPaintType] = useState<BrushType>('oil')
  const [brushSize, setBrushSize] = useState(30)
  const [eraserEnabled, setEraserEnabled] = useState(false)

  function choosePalette(hex: string, index: number) {
    setSelectedPalette(index)
    setColor(hexToHsl(hex))
  }

  return (
    <div className="app-shell">
      <TopBar />

      <main className="workspace">
        <ToolsPanel
          brushShape={brushShape}
          paintType={paintType}
          eraserEnabled={eraserEnabled}
          onBrushShapeChange={setBrushShape}
          onPaintTypeChange={setPaintType}
          onEraserChange={setEraserEnabled}
        />
        <CanvasWorkspace />
        <ColorPanel
          color={color}
          currentHex={hslToHex(color)}
          selectedPalette={selectedPalette}
          brushSize={brushSize}
          onColorChange={setColor}
          onPaletteSelect={choosePalette}
          onBrushSizeChange={setBrushSize}
        />
      </main>

      <footer className="app-footer">
        <span>WebPainter <span className="footer-separator">/</span> 新しい作品</span>
        <span>作品はこのデバイスに保存されます</span>
      </footer>
    </div>
  )
}

export default App
