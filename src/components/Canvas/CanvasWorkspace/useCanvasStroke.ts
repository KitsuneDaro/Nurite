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
import type { CanvasHistoryState } from '../ThreeCanvas/CanvasDrawingRenderer'
import { CANVAS_SIZE, MAX_STROKE_SEGMENTS } from '../ThreeCanvas/CanvasConstants'

const DIRECTION_SAMPLE_INTERVAL = 2

type CanvasStrokeOptions = {
  frameRef: RefObject<HTMLDivElement | null>
  drawingRef: RefObject<CanvasDrawingHandle | null>
  brushShape: BrushShape
  paintType: BrushType
  brushSize: number
  brushColor: string
  followDirection: boolean
  eraserEnabled: boolean
  onHistoryChange: (history: CanvasHistoryState, contentChanged: boolean) => void
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
  onHistoryChange,
}: CanvasStrokeOptions) {
  const activePointerRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<DrawingPoint[]>([])
  const lastDrawnPointRef = useRef<DrawingPoint | null>(null)
  const lastInputPointRef = useRef<DrawingPoint | null>(null)
  const distanceSinceDirectionSampleRef = useRef(0)
  const previousInputVelocityRef = useRef<DrawingPoint>({ x: 0, y: 0 })
  const previousInputAccelerationRef = useRef<DrawingPoint>({ x: 0, y: 0 })
  const previousDirectionRef = useRef<DrawingPoint | null>(null)
  const nextSegmentIdRef = useRef(0)
  const activeStrokeIdRef = useRef(0)
  const activeStrokeHasDrawingRef = useRef(false)
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

  const flushPendingPoints = useCallback((includeLatestPoint = false) => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }

    const pending = pendingPointsRef.current
    const style = drawingStyleRef.current
    const resampleDirection = style.followDirection
      && (style.shape === 'flat' || style.shape === 'square')
    const pointsToDraw: Array<{
      point: DrawingPoint
      velocity: DrawingPoint
      acceleration: DrawingPoint
    }> = []
    let lastInputPoint = lastInputPointRef.current
    let distanceSinceSample = distanceSinceDirectionSampleRef.current
    let previousInputVelocity = previousInputVelocityRef.current
    let previousInputAcceleration = previousInputAccelerationRef.current

    for (const point of pending) {
      if (!lastInputPoint) {
        previousInputAcceleration = { x: 0, y: 0 }
        pointsToDraw.push({
          point,
          velocity: { x: 0, y: 0 },
          acceleration: previousInputAcceleration,
        })
        lastInputPoint = point
        continue
      }

      const velocity = {
        x: point.x - lastInputPoint.x,
        y: point.y - lastInputPoint.y,
      }
      const acceleration = {
        x: velocity.x - previousInputVelocity.x,
        y: velocity.y - previousInputVelocity.y,
      }
      previousInputAcceleration = acceleration

      if (!resampleDirection) {
        pointsToDraw.push({ point, velocity, acceleration })
        lastInputPoint = point
        distanceSinceSample = 0
        previousInputVelocity = velocity
        continue
      }

      const segmentLength = Math.hypot(velocity.x, velocity.y)
      if (segmentLength > 0) {
        let distanceToSample = DIRECTION_SAMPLE_INTERVAL - distanceSinceSample
        while (distanceToSample <= segmentLength) {
          const ratio = distanceToSample / segmentLength
          pointsToDraw.push({
            point: {
              x: lastInputPoint.x + velocity.x * ratio,
              y: lastInputPoint.y + velocity.y * ratio,
            },
            velocity,
            acceleration,
          })
          distanceToSample += DIRECTION_SAMPLE_INTERVAL
        }
        distanceSinceSample = (distanceSinceSample + segmentLength) % DIRECTION_SAMPLE_INTERVAL
      }
      lastInputPoint = point
      previousInputVelocity = velocity
    }

    const latestDrawnPoint = pointsToDraw[pointsToDraw.length - 1]?.point
      ?? lastDrawnPointRef.current
    if (
      includeLatestPoint
      && lastInputPoint
      && (
        !latestDrawnPoint
        || latestDrawnPoint.x !== lastInputPoint.x
        || latestDrawnPoint.y !== lastInputPoint.y
      )
    ) {
      pointsToDraw.push({
        point: lastInputPoint,
        velocity: previousInputVelocity,
        acceleration: previousInputAcceleration,
      })
      distanceSinceSample = 0
    }

    pendingPointsRef.current = []
    lastInputPointRef.current = lastInputPoint
    distanceSinceDirectionSampleRef.current = distanceSinceSample
    previousInputVelocityRef.current = previousInputVelocity
    previousInputAccelerationRef.current = previousInputAcceleration
    if (pointsToDraw.length === 0) return

    const segments: DrawingSegment[] = []
    let previousPoint = lastDrawnPointRef.current
    let previousDirection = previousDirectionRef.current

    for (const sample of pointsToDraw) {
      const point = sample.point
      if (previousPoint) {
        segments.push({
          start: previousPoint,
          end: point,
          previousDirection,
          velocity: sample.velocity,
          acceleration: sample.acceleration,
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
          velocity: sample.velocity,
          acceleration: sample.acceleration,
        })
      }
      previousPoint = point
    }

    const processedSegmentCount = drawingRef.current?.drawFrame(
      segments,
      drawingStyleRef.current,
      activeStrokeIdRef.current,
      nextSegmentIdRef.current,
    ) ?? 0
    nextSegmentIdRef.current += processedSegmentCount
    activeStrokeHasDrawingRef.current ||= processedSegmentCount > 0
    lastDrawnPointRef.current = pointsToDraw[pointsToDraw.length - 1]?.point ?? previousPoint
    if (nextSegmentIdRef.current >= MAX_STROKE_SEGMENTS) {
      onHistoryChange(
        drawingRef.current?.endStroke() ?? { canUndo: false, canRedo: false },
        activeStrokeHasDrawingRef.current,
      )
      activePointerRef.current = null
      activeStrokeHasDrawingRef.current = false
      lastDrawnPointRef.current = null
      lastInputPointRef.current = null
      distanceSinceDirectionSampleRef.current = 0
      previousInputVelocityRef.current = { x: 0, y: 0 }
      previousInputAccelerationRef.current = { x: 0, y: 0 }
      previousDirectionRef.current = null
      return
    }

    previousDirectionRef.current = previousDirection
  }, [drawingRef, onHistoryChange])

  const scheduleDrawingFrame = useCallback(() => {
    if (drawingFrameRef.current !== null) return
    drawingFrameRef.current = requestAnimationFrame(() => flushPendingPoints())
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

  const pickColor = useCallback((clientX: number, clientY: number) => {
    const canvasPoint = getCanvasPoint(clientX, clientY)
    if (!canvasPoint?.inside) return null
    return drawingRef.current?.sampleColor(canvasPoint.point) ?? null
  }, [drawingRef, getCanvasPoint])

  const startStroke = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const canvasPoint = getCanvasPoint(clientX, clientY)
    if (!canvasPoint?.inside) return

    flushPendingPoints()
    const strokeId = drawingRef.current?.beginStroke()
    if (strokeId === null || strokeId === undefined) return
    activePointerRef.current = pointerId
    activeStrokeHasDrawingRef.current = false
    lastDrawnPointRef.current = null
    lastInputPointRef.current = null
    distanceSinceDirectionSampleRef.current = 0
    previousInputVelocityRef.current = { x: 0, y: 0 }
    previousInputAccelerationRef.current = { x: 0, y: 0 }
    previousDirectionRef.current = null
    activeStrokeIdRef.current = strokeId
    nextSegmentIdRef.current = 0
    pendingPointsRef.current = [canvasPoint.point]
    scheduleDrawingFrame()
  }, [drawingRef, flushPendingPoints, getCanvasPoint, scheduleDrawingFrame])

  const addStrokePoint = useCallback((pointerId: number, clientX: number, clientY: number) => {
    if (activePointerRef.current !== pointerId) return
    const canvasPoint = getCanvasPoint(clientX, clientY)
    if (!canvasPoint) return

    pendingPointsRef.current.push(canvasPoint.point)
    scheduleDrawingFrame()
  }, [getCanvasPoint, scheduleDrawingFrame])

  const endStroke = useCallback((pointerId: number) => {
    if (activePointerRef.current !== pointerId) return

    flushPendingPoints(true)
    if (activePointerRef.current !== pointerId) return
    activePointerRef.current = null
    lastDrawnPointRef.current = null
    lastInputPointRef.current = null
    distanceSinceDirectionSampleRef.current = 0
    previousInputVelocityRef.current = { x: 0, y: 0 }
    previousInputAccelerationRef.current = { x: 0, y: 0 }
    previousDirectionRef.current = null
    onHistoryChange(
      drawingRef.current?.endStroke() ?? { canUndo: false, canRedo: false },
      activeStrokeHasDrawingRef.current,
    )
    activeStrokeHasDrawingRef.current = false
  }, [drawingRef, flushPendingPoints, onHistoryChange])

  const cancelStroke = useCallback(() => {
    if (activePointerRef.current !== null) {
      endStroke(activePointerRef.current)
    }
  }, [endStroke])

  return { startStroke, addStrokePoint, endStroke, cancelStroke, pickColor }
}
