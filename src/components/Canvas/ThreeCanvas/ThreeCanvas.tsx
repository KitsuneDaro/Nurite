import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { BrushStrokeStyle, DrawingSegment } from '../../../types'
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
  setDebugMode: (enabled: boolean) => void
  setDebugField: (field: TextureDebugField) => void
  undo: () => CanvasHistoryState
  redo: () => CanvasHistoryState
  getHistoryState: () => CanvasHistoryState
  exportCanvas: () => Promise<void>
  exportTextures: () => Promise<void>
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
      exportCanvas() {
        return drawingRendererRef.current?.exportCanvas()
          ?? Promise.reject(new Error('The drawing renderer is not ready.'))
      },
      exportTextures() {
        return drawingRendererRef.current?.exportTextures()
          ?? Promise.reject(new Error('The drawing renderer is not ready.'))
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
