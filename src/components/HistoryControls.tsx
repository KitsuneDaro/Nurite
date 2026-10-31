import { Redo2, Undo2 } from 'lucide-react'
import './ActionTile.css'
import './HistoryControls.css'

export function HistoryControls() {
  return (
    <div className="history-buttons">
      <button className="action-tile" aria-label="元に戻す">
        <Undo2 size={20} /><span>元に戻す</span>
      </button>
      <button className="action-tile" aria-label="やり直す">
        <Redo2 size={20} /><span>やり直す</span>
      </button>
    </div>
  )
}
