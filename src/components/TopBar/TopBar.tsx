import {
  ArrowDownToLine,
  ChevronDown,
  FileUp,
  Sparkles,
} from 'lucide-react'
import './TopBar.css'

export function TopBar() {
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
        <button className="export-button"><ArrowDownToLine size={16} /><span>エクスポート</span></button>
      </div>
    </header>
  )
}
