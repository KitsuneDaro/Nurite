import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type {
  BrushStrokeStyle,
  BucketFillMode,
  DrawingPoint,
  DrawingSegment,
} from '../../../types'
import type { CanvasProjectTextures } from './CanvasProjectFile'
import {
  CanvasDrawingRenderer,
  type CanvasHistoryState,
} from './CanvasDrawingRenderer'
import {
  getTextureDebugField,
  type TextureDebugField,
} from './TextureDebugFields'
import './ThreeCanvas.css'

export type CanvasRenderStatus = 'loading' | 'ready' | 'error'

export type CanvasDrawingHandle = {
  beginStroke: () => number | null
  endStroke: () => CanvasHistoryState
  drawFrame: (
    segments: readonly DrawingSegment[],
    style: BrushStrokeStyle,
    strokeId: number,
    startingSegmentId: number,
  ) => number
  fillBucket: (
    point: DrawingPoint,
    color: string,
    mode: BucketFillMode,
  ) => CanvasHistoryState
  setDebugMode: (enabled: boolean) => void
  setDebugField: (field: TextureDebugField) => void
  undo: () => CanvasHistoryState
  redo: () => CanvasHistoryState
  getHistoryState: () => CanvasHistoryState
  sampleColor: (point: DrawingPoint) => string
  exportCanvas: (filename: string) => Promise<void>
  exportProjectTextures: () => CanvasProjectTextures
  importProjectTextures: (textures: CanvasProjectTextures) => void
  resetCanvas: () => void
}

type ThreeCanvasProps = {
  onStatusChange: (status: CanvasRenderStatus) => void
  debugMode: boolean
  debugField: TextureDebugField
}

export const ThreeCanvas = forwardRef<CanvasDrawingHandle, ThreeCanvasProps>(
  function ThreeCanvas({ onStatusChange, debugMode, debugField }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const drawingRendererRef = useRef<CanvasDrawingRenderer | null>(null)

    useImperativeHandle(ref, () => ({
      beginStroke() {
        return drawingRendererRef.current?.beginStroke() ?? null
      },
      endStroke() {
        return drawingRendererRef.current?.endStroke() ?? { canUndo: false, canRedo: false }
      },
      drawFrame(segments, style, strokeId, startingSegmentId) {
        return drawingRendererRef.current?.drawFrame(
          segments,
          style,
          strokeId,
          startingSegmentId,
        ) ?? 0
      },
      fillBucket(point, color, mode) {
        const renderer = drawingRendererRef.current
        if (!renderer) throw new Error('The drawing renderer is not ready.')
        return renderer.fillBucket(point, color, mode)
      },
      setDebugMode(enabled) {
        drawingRendererRef.current?.setDebugMode(enabled)
      },
      setDebugField(field) {
        drawingRendererRef.current?.setDebugField(field)
      },
      undo() {
        return drawingRendererRef.current?.undo() ?? { canUndo: false, canRedo: false }
      },
      redo() {
        return drawingRendererRef.current?.redo() ?? { canUndo: false, canRedo: false }
      },
      getHistoryState() {
        return drawingRendererRef.current?.getHistoryState()
          ?? { canUndo: false, canRedo: false }
      },
      sampleColor(point) {
        const renderer = drawingRendererRef.current
        if (!renderer) throw new Error('The drawing renderer is not ready.')
        return renderer.sampleColor(point)
      },
      exportCanvas(filename) {
        return drawingRendererRef.current?.exportCanvas(filename)
          ?? Promise.reject(new Error('The drawing renderer is not ready.'))
      },
      exportProjectTextures() {
        const renderer = drawingRendererRef.current
        if (!renderer) throw new Error('The drawing renderer is not ready.')
        return renderer.exportProjectTextures()
      },
      importProjectTextures(textures) {
        const renderer = drawingRendererRef.current
        if (!renderer) throw new Error('The drawing renderer is not ready.')
        renderer.importProjectTextures(textures)
      },
      resetCanvas() {
        const renderer = drawingRendererRef.current
        if (!renderer) throw new Error('The drawing renderer is not ready.')
        renderer.resetCanvas()
      },
    }), [])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      onStatusChange('loading')
      let drawingRenderer: CanvasDrawingRenderer
      try {
        drawingRenderer = new CanvasDrawingRenderer(container)
      } catch (error) {
        console.error('Failed to initialize the canvas renderer.', error)
        onStatusChange('error')
        return
      }

      drawingRendererRef.current = drawingRenderer
      onStatusChange('ready')

      return () => {
        drawingRendererRef.current = null
        drawingRenderer.dispose()
      }
    }, [onStatusChange])

    useEffect(() => {
      drawingRendererRef.current?.setDebugMode(debugMode)
    }, [debugMode])

    useEffect(() => {
      drawingRendererRef.current?.setDebugField(debugField)
    }, [debugField])

    return (
      <div ref={containerRef} className="three-canvas">
        {debugMode && (
          <div className="texture-debug-label" aria-live="polite">
            {getTextureDebugField(debugField).label}
          </div>
        )}
      </div>
    )
  },
)
