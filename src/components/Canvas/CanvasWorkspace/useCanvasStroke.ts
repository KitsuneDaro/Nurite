import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type {
  BrushShape,
  BrushType,
  BrushStrokeStyle,
  DrawingPoint,
  DrawingSegment,
} from '../../../types'
import type { CanvasDrawingHandle } from '../ThreeCanvas/ThreeCanvas'
import { CANVAS_SIZE } from '../ThreeCanvas/CanvasDrawingRenderer'

type CanvasStrokeOptions = {
  frameRef: RefObject<HTMLDivElement | null>
  drawingRef: RefObject<CanvasDrawingHandle | null>
  brushShape: BrushShape
  paintType: BrushType
  brushSize: number
  brushColor: string
  followDirection: boolean
  eraserEnabled: boolean
}

export function useCanvasStroke({
  frameRef,
  drawingRef,
  brushShape,
  paintType,
  brushSize,
  brushColor,
  followDirection,
  eraserEnabled,
}: CanvasStrokeOptions) {
  const activePointerRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<DrawingPoint[]>([])
  const lastDrawnPointRef = useRef<DrawingPoint | null>(null)
  const previousDirectionRef = useRef<DrawingPoint | null>(null)
  const nextStrokeIndexRef = useRef(0)
  const frameIndexRef = useRef(0)
  const activeStrokeIndexRef = useRef(0)
  const drawingFrameRef = useRef<number | null>(null)
  const drawingStyleRef = useRef<BrushStrokeStyle>({
    shape: brushShape,
    paintType,
    size: brushSize,
    color: brushColor,
    followDirection,
    eraserEnabled,
  })

  useLayoutEffect(() => {
    drawingStyleRef.current = {
      shape: brushShape,
      paintType,
      size: brushSize,
      color: brushColor,
      followDirection,
      eraserEnabled,
    }
  }, [brushShape, brushColor, brushSize, eraserEnabled, followDirection, paintType])

  const flushPendingPoints = useCallback(() => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }
    if (pendingPointsRef.current.length === 0) return

    const pending = pendingPointsRef.current
    const segments: DrawingSegment[] = []
    let previousPoint = lastDrawnPointRef.current
    let previousDirection = previousDirectionRef.current

    for (const point of pending) {
      if (previousPoint) {
        segments.push({
          start: previousPoint,
          end: point,
          previousDirection,
        })
        const direction = {
          x: point.x - previousPoint.x,
          y: point.y - previousPoint.y,
        }
        if (direction.x !== 0 || direction.y !== 0) {
          previousDirection = direction
        }
      } else {
        segments.push({
          start: point,
          end: point,
          previousDirection: null,
        })
      }
      previousPoint = point
    }

    drawingRef.current?.drawFrame(
      segments,
      drawingStyleRef.current,
      activeStrokeIndexRef.current,
      frameIndexRef.current,
    )
    frameIndexRef.current = Math.min(frameIndexRef.current + 1, 0xFFF)
    previousDirectionRef.current = previousDirection
    lastDrawnPointRef.current = pending[pending.length - 1]
    pendingPointsRef.current = []
  }, [drawingRef])

  const scheduleDrawingFrame = useCallback(() => {
    if (drawingFrameRef.current !== null) return
    drawingFrameRef.current = requestAnimationFrame(flushPendingPoints)
  }, [flushPendingPoints])

  useEffect(() => () => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
    }
  }, [])

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const frame = frameRef.current
    if (!frame) return null

    const rect = frame.getBoundingClientRect()
    const scale = rect.width / frame.offsetWidth
    const borderLeft = Number.parseFloat(getComputedStyle(frame).borderLeftWidth) * scale
    const borderTop = Number.parseFloat(getComputedStyle(frame).borderTopWidth) * scale
    const contentWidth = frame.clientWidth * scale
    const contentHeight = frame.clientHeight * scale
    const x = (clientX - rect.left - borderLeft) / contentWidth * CANVAS_SIZE
    const y = (clientY - rect.top - borderTop) / contentHeight * CANVAS_SIZE

    return {
      point: {
        x: Math.min(CANVAS_SIZE, Math.max(0, x)),
        y: Math.min(CANVAS_SIZE, Math.max(0, y)),
      },
      inside: x >= 0 && x <= CANVAS_SIZE && y >= 0 && y <= CANVAS_SIZE,
    }
  }, [frameRef])

  const startStroke = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const canvasPoint = getCanvasPoint(clientX, clientY)
    if (!canvasPoint?.inside) return

    flushPendingPoints()
    if (nextStrokeIndexRef.current > 0xFFFFF) {
      console.error('Canvas drawing has reached the metadata texture stroke-index limit.')
      return
    }
    activePointerRef.current = pointerId
    lastDrawnPointRef.current = null
    previousDirectionRef.current = null
    activeStrokeIndexRef.current = nextStrokeIndexRef.current
    nextStrokeIndexRef.current += 1
    frameIndexRef.current = 0
    pendingPointsRef.current = [canvasPoint.point]
    scheduleDrawingFrame()
  }, [flushPendingPoints, getCanvasPoint, scheduleDrawingFrame])

  const addStrokePoint = useCallback((pointerId: number, clientX: number, clientY: number) => {
    if (activePointerRef.current !== pointerId) return
    const canvasPoint = getCanvasPoint(clientX, clientY)
    if (!canvasPoint) return

    pendingPointsRef.current.push(canvasPoint.point)
    scheduleDrawingFrame()
  }, [getCanvasPoint, scheduleDrawingFrame])

  const endStroke = useCallback((pointerId: number) => {
    if (activePointerRef.current !== pointerId) return

    flushPendingPoints()
    activePointerRef.current = null
    lastDrawnPointRef.current = null
    previousDirectionRef.current = null
  }, [flushPendingPoints])

  const cancelStroke = useCallback(() => {
    if (activePointerRef.current !== null) {
      endStroke(activePointerRef.current)
    }
  }, [endStroke])

  return { startStroke, addStrokePoint, endStroke, cancelStroke }
}
