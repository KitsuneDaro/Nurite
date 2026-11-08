import { useCallback, useEffect, useRef, useState } from 'react'
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

type KeyboardShortcutActions = {
  saveProject: () => void
  requestLoadProject: () => void
  requestNewCanvas: () => void
  toggleDebugMode: () => void
  undoStroke: () => void
  redoStroke: () => void
  setToolType: (toolType: ToolType) => void
  changeBrushSize: (delta: number) => void
}

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
  const [paintType, setPaintType] = useState<BrushType>('normal')
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
  const projectFileInputRef = useRef<HTMLInputElement>(null)
  const projectFileStatusIdRef = useRef(0)
  const keyboardShortcutsRef = useRef<KeyboardShortcutActions | null>(null)
  const paletteColors = usePaletteStore((state) => state.colors)
  const selectedPalette = usePaletteStore((state) => state.selectedIndex)
  const selectPaletteColor = usePaletteStore((state) => state.selectColor)
  const updateSelectedPaletteColor = usePaletteStore((state) => state.updateSelectedColor)
  const addPaletteColor = usePaletteStore((state) => state.addColor)
  const removeSelectedPaletteColor = usePaletteStore((state) => state.removeSelectedColor)
  const movePaletteColor = usePaletteStore((state) => state.moveColor)
  const resetPalette = usePaletteStore((state) => state.reset)
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
    if (usePaletteStore.getState().selectedIndex === index) return
    selectPaletteColor(index)
    setColor(hexToHsl(hex))
    setIsProjectDirty(true)
  }

  function updateColor(nextColor: HslColor) {
    setColor(nextColor)
    updateSelectedPaletteColor(hslToHex(nextColor))
    setIsProjectDirty(true)
  }

  function addCurrentColorToPalette() {
    addPaletteColor(hslToHex(color))
    setIsProjectDirty(true)
  }

  function removeCurrentPaletteColor() {
    const nextColor = removeSelectedPaletteColor()
    if (!nextColor) return
    setColor(hexToHsl(nextColor))
    setIsProjectDirty(true)
  }

  function movePaletteEntry(fromIndex: number, toIndex: number) {
    movePaletteColor(fromIndex, toIndex)
    if (fromIndex !== toIndex) setIsProjectDirty(true)
  }

  function updateToolType(nextToolType: ToolType) {
    if (toolType === nextToolType) return
    setToolType(nextToolType)
    setIsProjectDirty(true)
  }

  function createNewCanvas() {
    const drawing = drawingRef.current
    if (!drawing) {
      showProjectFileStatus('キャンバスの準備ができていません')
      return
    }

    try {
      drawing.resetCanvas()
      setCanvasName(createDefaultCanvasName())
      setBrushShape('round')
      setPaintType('normal')
      setFollowDirection(false)
      setBrushSize(30)
      setToolType('brush')
      resetPalette()
      setColor(hexToHsl(usePaletteStore.getState().colors[9]!))
      setCanvasHistory(drawing.getHistoryState())
      setCanvasZoom(1)
      setDebugMode(false)
      setDebugField(DEFAULT_TEXTURE_DEBUG_FIELD)
      setActiveMobilePanel(null)
      setIsProjectDirty(true)
      showProjectFileStatus('新しいキャンバスを作成しました')
    } catch (error) {
      console.error('Failed to create a new canvas.', error)
      showProjectFileStatus('新しいキャンバスを作成できませんでした')
    }
  }

  function requestNewCanvas() {
    if (projectFileBusy) return
    if (
      !isProjectDirty
      || window.confirm('未保存の編集内容があります。破棄して新しいキャンバスを作成しますか？')
    ) {
      createNewCanvas()
    }
  }

  function requestLoadProject() {
    if (projectFileBusy) return
    if (
      !isProjectDirty
      || window.confirm('未保存の編集内容があります。破棄してファイルを読み込みますか？')
    ) {
      projectFileInputRef.current?.click()
    }
  }

  async function saveProject() {
    if (projectFileBusy) return
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

  function changeBrushSize(delta: number) {
    const nextSize = Math.min(255, Math.max(1, brushSize + delta))
    if (nextSize === brushSize) return
    setBrushSize(nextSize)
    setIsProjectDirty(true)
  }

  useEffect(() => {
    keyboardShortcutsRef.current = {
      saveProject: () => { void saveProject() },
      requestLoadProject,
      requestNewCanvas,
      toggleDebugMode: () => setDebugMode((enabled) => !enabled),
      undoStroke,
      redoStroke,
      setToolType: updateToolType,
      changeBrushSize,
    }
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const actions = keyboardShortcutsRef.current
      if (!actions || event.altKey) return

      const key = event.key.toLowerCase()
      const modifierPressed = event.ctrlKey || event.metaKey
      const target = event.target
      const isEditingText = target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('input:not([type="range"]), textarea, select, [role="textbox"]')
      )

      if (modifierPressed) {
        if (key === 's') {
          event.preventDefault()
          actions.saveProject()
        } else if (key === 'l' || key === 'o') {
          event.preventDefault()
          actions.requestLoadProject()
        } else if (key === 'n') {
          event.preventDefault()
          actions.requestNewCanvas()
        } else if (key === 'd') {
          event.preventDefault()
          actions.toggleDebugMode()
        } else if (!isEditingText && key === 'z' && event.shiftKey) {
          event.preventDefault()
          actions.redoStroke()
        } else if (!isEditingText && key === 'z') {
          event.preventDefault()
          actions.undoStroke()
        } else if (!isEditingText && key === 'y') {
          event.preventDefault()
          actions.redoStroke()
        }
        return
      }

      if (isEditingText || event.shiftKey) return
      if (key === 'b') actions.setToolType('brush')
      else if (key === 'e') actions.setToolType('eraser')
      else if (key === 's') actions.setToolType('eyedropper')
      else if (key === 'l') actions.changeBrushSize(1)
      else if (key === 'j') actions.changeBrushSize(-1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell">
      <TopBar
        onRequestNewCanvas={requestNewCanvas}
        onSaveProject={saveProject}
        onRequestLoadProject={requestLoadProject}
        projectFileBusy={projectFileBusy}
        projectFileStatus={projectFileStatus}
        isProjectDirty={isProjectDirty}
        canvasName={canvasName}
        onCanvasNameChange={updateCanvasName}
        onExportCanvas={exportCanvas}
        exportingCanvas={exportingCanvas}
        canvasExportStatus={canvasExportStatus}
      />
      <input
        ref={projectFileInputRef}
        className="project-file-input"
        type="file"
        accept=".nrt"
        aria-label="読み込む編集ファイル"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void loadProject(file)
        }}
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
          onPaletteAdd={addCurrentColorToPalette}
          onPaletteRemove={removeCurrentPaletteColor}
          onPaletteMove={movePaletteEntry}
          onBrushSizeChange={(size) => { setBrushSize(size); setIsProjectDirty(true) }}
        />
      </main>

      <MobilePanelNav
        activePanel={activeMobilePanel}
        onPanelSelect={setActiveMobilePanel}
      />

    </div>
  )
}

export default App
