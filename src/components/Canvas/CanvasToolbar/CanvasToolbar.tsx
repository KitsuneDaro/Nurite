import { Minus, Plus, Layers } from 'lucide-react'
import './CanvasToolbar.css'

type CanvasToolbarProps = {
  zoom: number
  onZoomChange: (zoom: number) => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const ZOOM_STEP = 1.2

export function CanvasToolbar({ zoom, onZoomChange }: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-meta">
        <span className="canvas-meta-icon"><Layers size={15} /></span>
        <span>キャンバス</span>
        <span className="meta-divider" />
        <strong>1024 × 1024</strong>
        <span className="ratio-badge">1:1</span>
      </div>
      <div className="canvas-zoom">
        <button
          aria-label="縮小"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / ZOOM_STEP))}
        >
          <Minus size={15} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="拡大"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * ZOOM_STEP))}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}
