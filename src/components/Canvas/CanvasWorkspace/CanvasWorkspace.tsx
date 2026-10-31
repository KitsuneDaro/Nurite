import artwork from '../../../assets/canvas-art.svg'
import './CanvasWorkspace.css'

export function CanvasWorkspace() {
  return (
    <section className="canvas-workspace" aria-label="キャンバス">
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
