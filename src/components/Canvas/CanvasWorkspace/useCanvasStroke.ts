import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { BrushShape, BrushStrokeStyle, DrawingPoint } from '../../../types'
import type { CanvasDrawingHandle } from '../ThreeCanvas/ThreeCanvas'
import { CANVAS_SIZE } from '../ThreeCanvas/CanvasDrawingRenderer'

type CanvasStrokeOptions = {
  frameRef: RefObject<HTMLDivElement | null>
  drawingRef: RefObject<CanvasDrawingHandle | null>
  brushShape: BrushShape
  brushSize: number
  brushColor: string
  followDirection: boolean
  eraserEnabled: boolean
}

export function useCanvasStroke({
  frameRef,
  drawingRef,
  brushShape,
  brushSize,
  brushColor,
  followDirection,
  eraserEnabled,
}: CanvasStrokeOptions) {
  const activePointerRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<DrawingPoint[]>([])
  const lastDrawnPointRef = useRef<DrawingPoint | null>(null)
  const previousDirectionRef = useRef<DrawingPoint | null>(null)
  const drawingFrameRef = useRef<number | null>(null)
  const drawingStyleRef = useRef<BrushStrokeStyle>({
    shape: brushShape,
    size: brushSize,
    color: brushColor,
    followDirection,
    eraserEnabled,
  })

  useLayoutEffect(() => {
    drawingStyleRef.current = {
      shape: brushShape,
      size: brushSize,
      color: brushColor,
      followDirection,
      eraserEnabled,
    }
  }, [brushShape, brushColor, brushSize, eraserEnabled, followDirection])

  const flushPendingPoints = useCallback(() => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }
    if (pendingPointsRef.current.length === 0) return

    const pending = pendingPointsRef.current
    const points = lastDrawnPointRef.current
      ? [lastDrawnPointRef.current, ...pending]
      : pending
    drawingRef.current?.drawStroke(
      points,
      drawingStyleRef.current,
      previousDirectionRef.current,
    )
    for (let index = points.length - 1; index > 0; index -= 1) {
      const current = points[index]
      const previous = points[index - 1]
      if (!current || !previous) continue

      const direction = {
        x: current.x - previous.x,
        y: current.y - previous.y,
      }
      if (direction.x !== 0 || direction.y !== 0) {
        previousDirectionRef.current = direction
        break
      }
    }
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
    activePointerRef.current = pointerId
    lastDrawnPointRef.current = null
    previousDirectionRef.current = null
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
