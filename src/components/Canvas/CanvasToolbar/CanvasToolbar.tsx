import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import './CanvasToolbar.css'

export function CanvasToolbar() {
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
        <button aria-label="前の表示"><ArrowLeft size={15} /></button>
        <span>100%</span>
        <button aria-label="次の表示"><ArrowRight size={15} /></button>
      </div>
    </div>
  )
}
