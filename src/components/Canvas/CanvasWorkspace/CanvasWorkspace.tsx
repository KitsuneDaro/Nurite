import { useCallback, useState } from 'react'
import { ThreeCanvas, type CanvasRenderStatus } from '../ThreeCanvas/ThreeCanvas'
import './CanvasWorkspace.css'

export function CanvasWorkspace() {
  const [renderStatus, setRenderStatus] = useState<CanvasRenderStatus>('loading')
  const handleStatusChange = useCallback((status: CanvasRenderStatus) => {
    setRenderStatus(status)
  }, [])

  return (
    <section className="canvas-workspace" aria-label="キャンバス">
      <div className="canvas-stage">
        <div className="canvas-frame">
          <ThreeCanvas onStatusChange={handleStatusChange} />
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
