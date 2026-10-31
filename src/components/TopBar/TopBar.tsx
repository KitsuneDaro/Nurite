import {
  ArrowDownToLine,
  ChevronDown,
  FileUp,
  Sparkles,
} from 'lucide-react'
import './TopBar.css'

type TopBarProps = {
  onExportCanvas: () => void
  exportingCanvas: boolean
  canvasExportStatus: string | null
}

export function TopBar({
  onExportCanvas,
  exportingCanvas,
  canvasExportStatus,
}: TopBarProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="WebPainter ホーム">
        <span className="brand-mark"><Sparkles size={18} /></span>
        <span>web<span>painter</span></span>
      </a>
      <div className="document-title">
        <span className="document-dot" />
        <span>Starry night study</span>
        <ChevronDown size={15} />
      </div>
      <div className="topbar-actions">
        <span className="saved-status"><span /> 色設定を自動保存</span>
        <button className="topbar-button" aria-label="インポート"><FileUp size={16} /><span>インポート</span></button>
        <button
          className="export-button"
          aria-label="キャンバス画像をエクスポート"
          disabled={exportingCanvas}
          onClick={onExportCanvas}
        >
          <ArrowDownToLine size={16} />
          <span>{exportingCanvas ? '出力中' : 'エクスポート'}</span>
        </button>
        {canvasExportStatus && (
          <span className="canvas-export-status" role="status" aria-live="polite">
            {canvasExportStatus}
          </span>
        )}
      </div>
    </header>
  )
}
