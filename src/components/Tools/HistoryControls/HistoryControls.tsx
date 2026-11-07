import { Redo2, Undo2 } from 'lucide-react'
import '../../Panel/ActionTile.css'
import './HistoryControls.css'

type HistoryControlsProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HistoryControlsProps) {
  return (
    <div className="history-buttons">
      <button
        className="action-tile"
        aria-label="元に戻す"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 size={20} /><span>UNDO</span>
      </button>
      <button
        className="action-tile"
        aria-label="やり直す"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Redo2 size={20} /><span>REDO</span>
      </button>
    </div>
  )
}
