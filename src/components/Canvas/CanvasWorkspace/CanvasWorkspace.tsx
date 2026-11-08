import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type {
  BrushShape,
  BrushType,
  BucketFillMode,
  DrawingPoint,
  ToolType,
} from '../../../types'
import type { RefObject } from 'react'
import {
  ThreeCanvas,
  type CanvasDrawingHandle,
  type CanvasRenderStatus,
} from '../ThreeCanvas/ThreeCanvas'
import type { TextureDebugField } from '../ThreeCanvas/TextureDebugFields'
import type { CanvasHistoryState } from '../ThreeCanvas/CanvasDrawingRenderer'
import { useCanvasStroke } from './useCanvasStroke'
import './CanvasWorkspace.css'

type CanvasWorkspaceProps = {
  zoom: number
  onZoomChange: (zoom: number) => void
  brushShape: BrushShape
  paintType: BrushType
  brushSize: number
  bucketFillMode: BucketFillMode
  brushColor: string
  followDirection: boolean
  toolType: ToolType
  onToolTypeChange: (toolType: ToolType) => void
  onTemporaryToolTypeChange: (toolType: ToolType) => void
  onEyedropperPick: (color: string) => void
  debugMode: boolean
  debugField: TextureDebugField
  drawingRef: RefObject<CanvasDrawingHandle | null>
  onHistoryChange: (history: CanvasHistoryState, contentChanged: boolean) => void
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
  paintType,
  brushSize,
  bucketFillMode,
  brushColor,
  followDirection,
  toolType,
  onToolTypeChange,
  onTemporaryToolTypeChange,
  onEyedropperPick,
  debugMode,
  debugField,
  drawingRef,
  onHistoryChange,
}: CanvasWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const touchPointsRef = useRef(new Map<number, Point>())
  const pinchStateRef = useRef<PinchState | null>(null)
  const rightClickPointerRef = useRef<number | null>(null)
  const stroke = useCanvasStroke({
    frameRef,
    drawingRef,
    brushShape,
    paintType,
    brushSize,
    brushColor,
    followDirection,
    eraserEnabled: toolType === 'eraser',
    bucketFillMode,
    onHistoryChange,
  })
  const zoomRef = useRef(zoom)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [renderStatus, setRenderStatus] = useState<CanvasRenderStatus>('loading')
  const [bucketFillError, setBucketFillError] = useState<string | null>(null)
  useLayoutEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
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

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button === 2) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      rightClickPointerRef.current = event.pointerId
      onTemporaryToolTypeChange('eyedropper')
      return
    }

    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    if (event.pointerType === 'touch') {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (touchPointsRef.current.size >= 2) {
      stroke.cancelStroke()
      pinchStateRef.current = getPinchMetrics(Array.from(touchPointsRef.current.values()))
      return
    }

    if (toolType === 'eyedropper') {
      const sampledColor = stroke.pickColor(event.clientX, event.clientY)
      if (sampledColor) {
        onEyedropperPick(sampledColor)
        onToolTypeChange('brush')
      }
      return
    }

    if (toolType === 'bucket') {
      try {
        stroke.fillBucket(event.clientX, event.clientY, brushColor)
        setBucketFillError(null)
      } catch (error) {
        console.error('Failed to fill the canvas.', error)
        setBucketFillError('塗りつぶしに失敗しました')
      }
      return
    }

    stroke.startStroke(event.pointerId, event.clientX, event.clientY)
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

    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.() ?? []
    let lastX: number | undefined
    let lastY: number | undefined
    for (const coalescedEvent of coalescedEvents) {
      stroke.addStrokePoint(event.pointerId, coalescedEvent.clientX, coalescedEvent.clientY)
      lastX = coalescedEvent.clientX
      lastY = coalescedEvent.clientY
    }
    if (lastX !== event.clientX || lastY !== event.clientY) {
      stroke.addStrokePoint(event.pointerId, event.clientX, event.clientY)
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (rightClickPointerRef.current === event.pointerId) {
      rightClickPointerRef.current = null
      if (event.type === 'pointerup') {
        const sampledColor = stroke.pickColor(event.clientX, event.clientY)
        if (sampledColor) onEyedropperPick(sampledColor)
      }
      onTemporaryToolTypeChange('brush')
      return
    }

    touchPointsRef.current.delete(event.pointerId)
    pinchStateRef.current = null
    stroke.endStroke(event.pointerId)
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
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            ref={frameRef}
            className="canvas-frame"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          >
            <ThreeCanvas
              ref={drawingRef}
              debugMode={debugMode}
              debugField={debugField}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>
      <div className="canvas-statusbar">
        <span>
          {renderStatus !== 'error' && <span className="live-dot" />}
          {renderStatus === 'loading' && 'キャンバス読み込み中'}
          {renderStatus === 'ready' && 'キャンバス準備完了'}
          {renderStatus === 'error' && <span role="alert">テクスチャを読み込めませんでした</span>}
        </span>
        {bucketFillError && <span role="alert">{bucketFillError}</span>}
      </div>
    </section>
  )
}
