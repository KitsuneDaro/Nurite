import {
  ArrowDownToLine,
  ChevronDown,
  Save,
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
        <span className="saved-status"><span /> すべて保存済み</span>
        <button className="topbar-button" aria-label="保存"><Save size={16} /><span>保存</span></button>
        <button className="export-button"><ArrowDownToLine size={16} /><span>書き出す</span></button>
        <button className="avatar" aria-label="プロフィール">Y</button>
      </div>
    </header>
  )
}
