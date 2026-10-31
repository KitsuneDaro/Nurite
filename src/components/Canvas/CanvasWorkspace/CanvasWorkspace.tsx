import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ThreeCanvas, type CanvasRenderStatus } from '../ThreeCanvas/ThreeCanvas'
import './CanvasWorkspace.css'

type CanvasWorkspaceProps = {
  zoom: number
  onZoomChange: (zoom: number) => void
}

type Point = {
  x: number
  y: number
}

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

export function CanvasWorkspace({ zoom, onZoomChange }: CanvasWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const touchPointsRef = useRef(new Map<number, Point>())
  const pinchStateRef = useRef<PinchState | null>(null)
  const zoomRef = useRef(zoom)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [renderStatus, setRenderStatus] = useState<CanvasRenderStatus>('loading')
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
    if (event.pointerType !== 'touch') return

    event.currentTarget.setPointerCapture(event.pointerId)
    touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touchPointsRef.current.size >= 2) {
      pinchStateRef.current = getPinchMetrics(Array.from(touchPointsRef.current.values()))
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || !touchPointsRef.current.has(event.pointerId)) return

    touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touchPointsRef.current.size < 2) return

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
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    touchPointsRef.current.delete(event.pointerId)
    pinchStateRef.current = null
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
        >
          <div
            className="canvas-frame"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          >
            <ThreeCanvas onStatusChange={handleStatusChange} />
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
