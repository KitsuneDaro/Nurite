import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import artwork from '../../../assets/canvas-art.svg'
import './CanvasWorkspace.css'

export function CanvasWorkspace() {
  return (
    <section className="canvas-workspace" aria-label="キャンバス">
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
      <div className="canvas-stage">
        <div className="canvas-frame">
          <img src={artwork} alt="青い夜空と丘の風景を描いたキャンバスのプレビュー" />
        </div>
        <span className="canvas-dimension dimension-top">1024 px</span>
        <span className="canvas-dimension dimension-bottom">1024 px</span>
      </div>
      <div className="canvas-statusbar">
        <span><span className="live-dot" /> キャンバス準備完了</span>
        <span>X: 512 &nbsp; Y: 512</span>
      </div>
    </section>
  )
}
