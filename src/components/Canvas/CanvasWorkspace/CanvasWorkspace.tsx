import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BrushShape, BrushStrokeStyle, DrawingPoint } from '../../../types'
import {
  CANVAS_SIZE,
  ThreeCanvas,
  type CanvasDrawingHandle,
  type CanvasRenderStatus,
} from '../ThreeCanvas/ThreeCanvas'
import './CanvasWorkspace.css'

type CanvasWorkspaceProps = {
  zoom: number
  onZoomChange: (zoom: number) => void
  brushShape: BrushShape
  brushSize: number
  brushColor: string
  followDirection: boolean
  eraserEnabled: boolean
}

type Point = DrawingPoint

type PinchState = {
  distance: number
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8

function getPinchMetrics(points: Point[]) {
  const [first, second] = points
  const x = (first.x + second.x) / 2
  const y = (first.y + second.y) / 2
  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    center: { x, y },
  }
}

export function CanvasWorkspace({
  zoom,
  onZoomChange,
  brushShape,
  brushSize,
  brushColor,
  followDirection,
  eraserEnabled,
}: CanvasWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<CanvasDrawingHandle>(null)
  const touchPointsRef = useRef(new Map<number, Point>())
  const pinchStateRef = useRef<PinchState | null>(null)
  const activeDrawingPointerRef = useRef<number | null>(null)
  const pendingPointsRef = useRef<Point[]>([])
  const lastDrawnPointRef = useRef<Point | null>(null)
  const drawingFrameRef = useRef<number | null>(null)
  const drawingStyleRef = useRef<BrushStrokeStyle>({
    shape: brushShape,
    size: brushSize,
    color: brushColor,
    followDirection,
    eraserEnabled,
  })
  const zoomRef = useRef(zoom)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [renderStatus, setRenderStatus] = useState<CanvasRenderStatus>('loading')
  useLayoutEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
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
    drawingRef.current?.drawStroke(points, drawingStyleRef.current)
    lastDrawnPointRef.current = pending[pending.length - 1]
    pendingPointsRef.current = []
  }, [])

  const scheduleDrawingFrame = useCallback(() => {
    if (drawingFrameRef.current !== null) return

    drawingFrameRef.current = requestAnimationFrame(flushPendingPoints)
  }, [flushPendingPoints])

  useEffect(() => () => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
    }
  }, [])

  const zoomAtPoint = useCallback((nextZoom: number, anchor: Point, rect: DOMRect) => {
    const previousZoom = zoomRef.current
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    const previousCenter = {
      x: rect.width / 2 + offsetRef.current.x,
      y: rect.height / 2 + offsetRef.current.y,
    }
    const nextCenter = {
      x: anchor.x - (anchor.x - previousCenter.x) * (clampedZoom / previousZoom),
      y: anchor.y - (anchor.y - previousCenter.y) * (clampedZoom / previousZoom),
    }
    const nextOffset = {
      x: nextCenter.x - rect.width / 2,
      y: nextCenter.y - rect.height / 2,
    }

    zoomRef.current = clampedZoom
    offsetRef.current = nextOffset
    setOffset(nextOffset)
    onZoomChange(clampedZoom)
  }, [onZoomChange])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const activeViewport = viewport

    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = activeViewport.getBoundingClientRect()
      const nextZoom = zoomRef.current * Math.exp(-event.deltaY * 0.001)
      zoomAtPoint(
        nextZoom,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        rect,
      )
    }

    activeViewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => activeViewport.removeEventListener('wheel', handleWheel)
  }, [zoomAtPoint])

  const handleStatusChange = useCallback((status: CanvasRenderStatus) => {
    setRenderStatus(status)
  }, [])

  function getCanvasPoint(clientX: number, clientY: number) {
    const frame = frameRef.current
    if (!frame) return null

    const rect = frame.getBoundingClientRect()
    const scale = rect.width / frame.offsetWidth
    const borderLeft = Number.parseFloat(getComputedStyle(frame).borderLeftWidth) * scale
    const borderTop = Number.parseFloat(getComputedStyle(frame).borderTopWidth) * scale
    const contentWidth = frame.clientWidth * scale
    const contentHeight = frame.clientHeight * scale
    const left = rect.left + borderLeft
    const top = rect.top + borderTop
    const x = (clientX - left) / contentWidth * CANVAS_SIZE
    const y = (clientY - top) / contentHeight * CANVAS_SIZE

    return {
      point: {
        x: Math.min(CANVAS_SIZE, Math.max(0, x)),
        y: Math.min(CANVAS_SIZE, Math.max(0, y)),
      },
      inside: x >= 0 && x <= CANVAS_SIZE && y >= 0 && y <= CANVAS_SIZE,
    }
  }

  function startStroke(pointerId: number, point: Point) {
    flushPendingPoints()
    activeDrawingPointerRef.current = pointerId
    lastDrawnPointRef.current = null
    pendingPointsRef.current = [point]
    scheduleDrawingFrame()
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    if (event.pointerType === 'touch') {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (touchPointsRef.current.size >= 2) {
      flushPendingPoints()
      activeDrawingPointerRef.current = null
      pinchStateRef.current = getPinchMetrics(Array.from(touchPointsRef.current.values()))
      return
    }

    const canvasPoint = getCanvasPoint(event.clientX, event.clientY)
    if (canvasPoint?.inside) {
      startStroke(event.pointerId, canvasPoint.point)
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') {
      if (!touchPointsRef.current.has(event.pointerId)) return
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touchPointsRef.current.size >= 2) {
        const rect = event.currentTarget.getBoundingClientRect()
        const metrics = getPinchMetrics(Array.from(touchPointsRef.current.values()))
        const previousPinch = pinchStateRef.current
        if (previousPinch && previousPinch.distance > 0) {
          zoomAtPoint(
            zoomRef.current * (metrics.distance / previousPinch.distance),
            { x: metrics.center.x - rect.left, y: metrics.center.y - rect.top },
            rect,
          )
        }
        pinchStateRef.current = metrics
        return
      }
    }

    if (activeDrawingPointerRef.current !== event.pointerId) return
    const canvasPoint = getCanvasPoint(event.clientX, event.clientY)
    if (!canvasPoint) return
    pendingPointsRef.current.push(canvasPoint.point)
    scheduleDrawingFrame()
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    touchPointsRef.current.delete(event.pointerId)
    pinchStateRef.current = null
    if (activeDrawingPointerRef.current === event.pointerId) {
      flushPendingPoints()
      activeDrawingPointerRef.current = null
      lastDrawnPointRef.current = null
    }
  }

  return (
    <section className="canvas-workspace" aria-label="キャンバス">
      <div className="canvas-stage">
        <div
          ref={viewportRef}
          className="canvas-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          <div
            ref={frameRef}
            className="canvas-frame"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          >
            <ThreeCanvas ref={drawingRef} onStatusChange={handleStatusChange} />
          </div>
        </div>
        <span className="canvas-dimension dimension-top">1024 px</span>
        <span className="canvas-dimension dimension-bottom">1024 px</span>
      </div>
      <div className="canvas-statusbar">
        <span>
          {renderStatus !== 'error' && <span className="live-dot" />}
          {renderStatus === 'loading' && 'キャンバス読み込み中'}
          {renderStatus === 'ready' && 'キャンバス準備完了'}
          {renderStatus === 'error' && <span role="alert">テクスチャを読み込めませんでした</span>}
        </span>
        <span>X: 512 &nbsp; Y: 512</span>
      </div>
    </section>
  )
}
