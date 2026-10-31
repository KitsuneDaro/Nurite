import { FolderOpen, Save } from 'lucide-react'
import './ActionTile.css'
import './FileControls.css'

export function FileControls() {
  return (
    <div className="file-buttons">
      <button className="action-tile" aria-label="保存">
        <Save size={19} /><span>保存</span>
      </button>
      <button className="action-tile" aria-label="読み込み">
        <FolderOpen size={19} /><span>読み込み</span>
      </button>
    </div>
  )
}
