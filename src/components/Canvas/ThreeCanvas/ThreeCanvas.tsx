import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { BrushStrokeStyle, DrawingPoint } from '../../../types'
import { CanvasDrawingRenderer } from './CanvasDrawingRenderer'
import './ThreeCanvas.css'

export type CanvasRenderStatus = 'loading' | 'ready' | 'error'

export type CanvasDrawingHandle = {
  drawStroke: (
    points: readonly DrawingPoint[],
    style: BrushStrokeStyle,
    previousDirection: DrawingPoint | null,
  ) => void
}

type ThreeCanvasProps = {
  onStatusChange: (status: CanvasRenderStatus) => void
}

export const ThreeCanvas = forwardRef<CanvasDrawingHandle, ThreeCanvasProps>(
  function ThreeCanvas({ onStatusChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const drawingRendererRef = useRef<CanvasDrawingRenderer | null>(null)

    useImperativeHandle(ref, () => ({
      drawStroke(points, style, previousDirection) {
        drawingRendererRef.current?.drawStroke(points, style, previousDirection)
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

    return <div ref={containerRef} className="three-canvas" />
  },
)
