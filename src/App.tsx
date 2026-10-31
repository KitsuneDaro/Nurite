import { useState } from 'react'
import type { HslColor } from 'react-colorful'
import type { BrushShape, BrushType } from './types'
import { CanvasWorkspace } from './components/Canvas/CanvasWorkspace/CanvasWorkspace'
import { ColorPanel } from './components/Color/ColorPanel/ColorPanel'
import { ToolsPanel } from './components/Tools/ToolsPanel/ToolsPanel'
import { TopBar } from './components/TopBar/TopBar'
import { MobilePanelNav, type MobilePanel } from './components/MobilePanelNav'
import { usePaletteStore } from './stores/paletteStore'
import { hslToHex, hexToHsl } from './utils/color'
import './App.css'

function App() {
  const [color, setColor] = useState<HslColor>(() => {
    const { colors, selectedIndex } = usePaletteStore.getState()
    return hexToHsl(colors[selectedIndex])
  })
  const [brushShape, setBrushShape] = useState<BrushShape>('round')
  const [paintType, setPaintType] = useState<BrushType>('oil')
  const [brushSize, setBrushSize] = useState(30)
  const [eraserEnabled, setEraserEnabled] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null)
  const paletteColors = usePaletteStore((state) => state.colors)
  const selectedPalette = usePaletteStore((state) => state.selectedIndex)
  const selectPaletteColor = usePaletteStore((state) => state.selectColor)
  const updateSelectedPaletteColor = usePaletteStore((state) => state.updateSelectedColor)

  function choosePalette(hex: string, index: number) {
    selectPaletteColor(index)
    setColor(hexToHsl(hex))
  }

  function updateColor(nextColor: HslColor) {
    setColor(nextColor)
    updateSelectedPaletteColor(hslToHex(nextColor))
  }

  return (
    <div className="app-shell">
      <TopBar />

      <main className="workspace">
        <ToolsPanel
          mobileOpen={activeMobilePanel === 'tools'}
          brushShape={brushShape}
          paintType={paintType}
          eraserEnabled={eraserEnabled}
          onBrushShapeChange={setBrushShape}
          onPaintTypeChange={setPaintType}
          onEraserChange={setEraserEnabled}
        />
        <CanvasWorkspace />
        <ColorPanel
          mobileOpen={activeMobilePanel === 'color'}
          color={color}
          currentHex={hslToHex(color)}
          paletteColors={paletteColors}
          selectedPalette={selectedPalette}
          brushSize={brushSize}
          onColorChange={updateColor}
          onPaletteSelect={choosePalette}
          onBrushSizeChange={setBrushSize}
        />
      </main>

      <MobilePanelNav
        activePanel={activeMobilePanel}
        onPanelSelect={setActiveMobilePanel}
      />

      <footer className="app-footer">
        <span>WebPainter <span className="footer-separator">/</span> 新しい作品</span>
        <span>作品はこのデバイスに保存されます</span>
      </footer>
    </div>
  )
}

export default App
