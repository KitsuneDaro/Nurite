import { useRef, useState } from 'react'
import type { HslColor } from 'react-colorful'
import type { BrushShape, BrushType } from './types'
import type { CanvasDrawingHandle } from './components/Canvas/ThreeCanvas/ThreeCanvas'
import { CanvasWorkspace } from './components/Canvas/CanvasWorkspace/CanvasWorkspace'
import { CanvasToolbar } from './components/Canvas/CanvasToolbar/CanvasToolbar'
import { ColorPanel } from './components/Color/ColorPanel/ColorPanel'
import { ToolsPanel } from './components/Tools/ToolsPanel/ToolsPanel'
import { TopBar } from './components/TopBar/TopBar'
import { MobilePanelNav, type MobilePanel } from './components/MobilePanelNav/MobilePanelNav'
import { usePaletteStore } from './stores/paletteStore'
import {
  DEFAULT_TEXTURE_DEBUG_FIELD,
  type TextureDebugField,
} from './components/Canvas/ThreeCanvas/TextureDebugFields'
import { hslToHex, hexToHsl } from './utils/color'
import './App.css'

function App() {
  const [color, setColor] = useState<HslColor>(() => {
    const { colors, selectedIndex } = usePaletteStore.getState()
    return hexToHsl(colors[selectedIndex])
  })
  const [brushShape, setBrushShape] = useState<BrushShape>('round')
  const [paintType, setPaintType] = useState<BrushType>('oil')
  const [followDirection, setFollowDirection] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [eraserEnabled, setEraserEnabled] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [debugMode, setDebugMode] = useState(false)
  const [debugField, setDebugField] = useState<TextureDebugField>(DEFAULT_TEXTURE_DEBUG_FIELD)
  const [exportingTextures, setExportingTextures] = useState(false)
  const [textureExportStatus, setTextureExportStatus] = useState<string | null>(null)
  const [exportingCanvas, setExportingCanvas] = useState(false)
  const [canvasExportStatus, setCanvasExportStatus] = useState<string | null>(null)
  const drawingRef = useRef<CanvasDrawingHandle>(null)
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

  async function exportTextures() {
    if (!drawingRef.current) {
      setTextureExportStatus('キャンバスの準備ができていません')
      return
    }

    setExportingTextures(true)
    setTextureExportStatus(null)
    try {
      await drawingRef.current.exportTextures()
      setTextureExportStatus('テクスチャZIPを作成しました')
    } catch (error) {
      console.error('Failed to export canvas textures.', error)
      setTextureExportStatus('テクスチャのエクスポートに失敗しました')
    } finally {
      setExportingTextures(false)
    }
  }

  async function exportCanvas() {
    if (!drawingRef.current) {
      setCanvasExportStatus('キャンバスの準備ができていません')
      return
    }

    setExportingCanvas(true)
    setCanvasExportStatus(null)
    try {
      await drawingRef.current.exportCanvas()
      setCanvasExportStatus('キャンバス画像を保存しました')
    } catch (error) {
      console.error('Failed to export the canvas image.', error)
      setCanvasExportStatus('キャンバス画像のエクスポートに失敗しました')
    } finally {
      setExportingCanvas(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        onExportCanvas={exportCanvas}
        exportingCanvas={exportingCanvas}
        canvasExportStatus={canvasExportStatus}
      />

      <main className="workspace">
        <ToolsPanel
          mobileOpen={activeMobilePanel === 'tools'}
          brushShape={brushShape}
          paintType={paintType}
          eraserEnabled={eraserEnabled}
          followDirection={followDirection}
          onBrushShapeChange={setBrushShape}
          onPaintTypeChange={setPaintType}
          onEraserChange={setEraserEnabled}
          onFollowDirectionChange={setFollowDirection}
        />
        <CanvasToolbar
          zoom={canvasZoom}
          onZoomChange={setCanvasZoom}
          debugMode={debugMode}
          onDebugModeChange={setDebugMode}
          debugField={debugField}
          onDebugFieldChange={setDebugField}
          onExportTextures={exportTextures}
          exportingTextures={exportingTextures}
          textureExportStatus={textureExportStatus}
        />
        <CanvasWorkspace
          zoom={canvasZoom}
          onZoomChange={setCanvasZoom}
          brushShape={brushShape}
          paintType={paintType}
          brushSize={brushSize}
          brushColor={hslToHex(color)}
          followDirection={followDirection}
          eraserEnabled={eraserEnabled}
          debugMode={debugMode}
          debugField={debugField}
          drawingRef={drawingRef}
        />
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
