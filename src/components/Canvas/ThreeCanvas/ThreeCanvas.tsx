import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { BrushStrokeStyle, DrawingSegment } from '../../../types'
import { CanvasDrawingRenderer } from './CanvasDrawingRenderer'
import './ThreeCanvas.css'

export type CanvasRenderStatus = 'loading' | 'ready' | 'error'

export type CanvasDrawingHandle = {
  drawFrame: (
    segments: readonly DrawingSegment[],
    style: BrushStrokeStyle,
    strokeIndex: number,
    frameIndex: number,
  ) => void
  setDebugMode: (enabled: boolean) => void
  exportTextures: () => Promise<void>
}

type ThreeCanvasProps = {
  onStatusChange: (status: CanvasRenderStatus) => void
  debugMode: boolean
}

export const ThreeCanvas = forwardRef<CanvasDrawingHandle, ThreeCanvasProps>(
  function ThreeCanvas({ onStatusChange, debugMode }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const drawingRendererRef = useRef<CanvasDrawingRenderer | null>(null)

    useImperativeHandle(ref, () => ({
      drawFrame(segments, style, strokeIndex, frameIndex) {
        drawingRendererRef.current?.drawFrame(segments, style, strokeIndex, frameIndex)
      },
      setDebugMode(enabled) {
        drawingRendererRef.current?.setDebugMode(enabled)
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

    return (
      <div ref={containerRef} className="three-canvas">
        {debugMode && (
          <div className="texture-debug-labels" aria-label="テクスチャのデバッグ表示">
            <span>メタ情報</span>
            <span>色</span>
            <span>描画状況 A</span>
            <span>描画状況 B</span>
          </div>
        )}
      </div>
    )
  },
)
