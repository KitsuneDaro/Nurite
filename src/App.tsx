import { useCallback, useRef, useState } from 'react'
import type { HslColor } from 'react-colorful'
import type { BrushShape, BrushType, ToolType } from './types'
import type { CanvasDrawingHandle } from './components/Canvas/ThreeCanvas/ThreeCanvas'
import type { CanvasHistoryState } from './components/Canvas/ThreeCanvas/CanvasDrawingRenderer'
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
import {
  downloadCanvasProject,
  readCanvasProject,
} from './components/Canvas/ThreeCanvas/CanvasProjectFile'
import { hslToHex, hexToHsl } from './utils/color'
import { createDefaultCanvasName } from './utils/canvasFileName'
import './App.css'

function App() {
  const [canvasName, setCanvasName] = useState(createDefaultCanvasName)
  const [isProjectDirty, setIsProjectDirty] = useState(true)
  const [canvasHistory, setCanvasHistory] = useState<CanvasHistoryState>({
    canUndo: false,
    canRedo: false,
  })
  const [color, setColor] = useState<HslColor>(() => {
    const { colors, selectedIndex } = usePaletteStore.getState()
    return hexToHsl(colors[selectedIndex])
  })
  const [brushShape, setBrushShape] = useState<BrushShape>('round')
  const [paintType, setPaintType] = useState<BrushType>('oil')
  const [followDirection, setFollowDirection] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [toolType, setToolType] = useState<ToolType>('brush')
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [debugMode, setDebugMode] = useState(false)
  const [debugField, setDebugField] = useState<TextureDebugField>(DEFAULT_TEXTURE_DEBUG_FIELD)
  const [projectFileBusy, setProjectFileBusy] = useState(false)
  const [projectFileStatus, setProjectFileStatus] = useState<{ message: string; id: number } | null>(null)
  const [exportingCanvas, setExportingCanvas] = useState(false)
  const [canvasExportStatus, setCanvasExportStatus] = useState<string | null>(null)
  const drawingRef = useRef<CanvasDrawingHandle>(null)
  const projectFileStatusIdRef = useRef(0)
  const paletteColors = usePaletteStore((state) => state.colors)
  const selectedPalette = usePaletteStore((state) => state.selectedIndex)
  const selectPaletteColor = usePaletteStore((state) => state.selectColor)
  const updateSelectedPaletteColor = usePaletteStore((state) => state.updateSelectedColor)
  const updateCanvasHistory = useCallback((history: CanvasHistoryState, contentChanged: boolean) => {
    setCanvasHistory(history)
    if (contentChanged) setIsProjectDirty(true)
  }, [])

  function showProjectFileStatus(message: string) {
    projectFileStatusIdRef.current += 1
    setProjectFileStatus({ message, id: projectFileStatusIdRef.current })
  }

  function updateCanvasName(name: string) {
    setCanvasName(name)
    setIsProjectDirty(true)
  }

  function choosePalette(hex: string, index: number) {
    selectPaletteColor(index)
    setColor(hexToHsl(hex))
    setIsProjectDirty(true)
  }

  function updateColor(nextColor: HslColor) {
    setColor(nextColor)
    updateSelectedPaletteColor(hslToHex(nextColor))
    setIsProjectDirty(true)
  }

  function updateToolType(nextToolType: ToolType) {
    setToolType(nextToolType)
    setIsProjectDirty(true)
  }

  async function saveProject() {
    if (!drawingRef.current) {
      showProjectFileStatus('キャンバスの準備ができていません')
      return
    }

    setProjectFileBusy(true)
    setProjectFileStatus(null)
    try {
      const projectName = canvasName.trim() || 'Untitled'
      setCanvasName(projectName)
      downloadCanvasProject({
        name: projectName,
        settings: {
          brushShape,
          paintType,
          followDirection,
          brushSize,
          toolType,
          color: hslToHex(color),
          paletteColors: [...paletteColors],
          selectedPalette,
        },
        textures: drawingRef.current.exportProjectTextures(),
      })
      setIsProjectDirty(false)
      showProjectFileStatus('編集ファイルを保存しました')
    } catch (error) {
      console.error('Failed to save the canvas project.', error)
      showProjectFileStatus('編集ファイルの保存に失敗しました')
    } finally {
      setProjectFileBusy(false)
    }
  }

  async function loadProject(file: File) {
    setProjectFileBusy(true)
    setProjectFileStatus(null)
    try {
      const project = await readCanvasProject(file)
      const drawing = drawingRef.current
      if (!drawing) throw new Error('The canvas renderer is not ready.')
      drawing.importProjectTextures(project.textures)
      setBrushShape(project.settings.brushShape)
      setPaintType(project.settings.paintType)
      setFollowDirection(project.settings.followDirection)
      setBrushSize(project.settings.brushSize)
      setToolType(project.settings.toolType)
      setColor(hexToHsl(project.settings.color))
      usePaletteStore.setState({
        colors: project.settings.paletteColors,
        selectedIndex: project.settings.selectedPalette,
      })
      setCanvasName(project.name)
      setCanvasHistory(drawing.getHistoryState())
      setIsProjectDirty(false)
      showProjectFileStatus('編集ファイルを読み込みました')
    } catch (error) {
      console.error('Failed to load the canvas project.', error)
      showProjectFileStatus(
        error instanceof Error
          ? `編集ファイルを読み込めませんでした: ${error.message}`
          : '編集ファイルを読み込めませんでした',
      )
    } finally {
      setProjectFileBusy(false)
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
      await drawingRef.current.exportCanvas(canvasName.trim() || 'Untitled')
      setCanvasExportStatus('キャンバス画像を保存しました')
    } catch (error) {
      console.error('Failed to export the canvas image.', error)
      setCanvasExportStatus('キャンバス画像のエクスポートに失敗しました')
    } finally {
      setExportingCanvas(false)
    }
  }

  function undoStroke() {
    const canUndo = drawingRef.current?.getHistoryState().canUndo ?? false
    const history = drawingRef.current?.undo()
    if (history) {
      setCanvasHistory(history)
      if (canUndo) setIsProjectDirty(true)
    }
  }

  function redoStroke() {
    const canRedo = drawingRef.current?.getHistoryState().canRedo ?? false
    const history = drawingRef.current?.redo()
    if (history) {
      setCanvasHistory(history)
      if (canRedo) setIsProjectDirty(true)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        projectFileBusy={projectFileBusy}
        projectFileStatus={projectFileStatus}
        isProjectDirty={isProjectDirty}
        canvasName={canvasName}
        onCanvasNameChange={updateCanvasName}
        onExportCanvas={exportCanvas}
        exportingCanvas={exportingCanvas}
        canvasExportStatus={canvasExportStatus}
      />

      <main className="workspace">
        <ToolsPanel
          mobileOpen={activeMobilePanel === 'tools'}
          brushShape={brushShape}
          paintType={paintType}
          toolType={toolType}
          followDirection={followDirection}
          onBrushShapeChange={(shape) => { setBrushShape(shape); setIsProjectDirty(true) }}
          onPaintTypeChange={(type) => { setPaintType(type); setIsProjectDirty(true) }}
          onToolTypeChange={updateToolType}
          onFollowDirectionChange={(follow) => { setFollowDirection(follow); setIsProjectDirty(true) }}
          canUndo={canvasHistory.canUndo}
          canRedo={canvasHistory.canRedo}
          onUndo={undoStroke}
          onRedo={redoStroke}
        />
        <CanvasToolbar
          zoom={canvasZoom}
          onZoomChange={setCanvasZoom}
          debugMode={debugMode}
          onDebugModeChange={setDebugMode}
          debugField={debugField}
          onDebugFieldChange={setDebugField}
        />
        <CanvasWorkspace
          zoom={canvasZoom}
          onZoomChange={setCanvasZoom}
          brushShape={brushShape}
          paintType={paintType}
          brushSize={brushSize}
          brushColor={hslToHex(color)}
          followDirection={followDirection}
          toolType={toolType}
          onToolTypeChange={updateToolType}
          onEyedropperPick={(hex) => updateColor(hexToHsl(hex))}
          debugMode={debugMode}
          debugField={debugField}
          drawingRef={drawingRef}
          onHistoryChange={updateCanvasHistory}
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
          onBrushSizeChange={(size) => { setBrushSize(size); setIsProjectDirty(true) }}
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
