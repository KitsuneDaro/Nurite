import {
  ArrowDownToLine,
  BookOpenText,
  FilePlus2,
  FolderOpen,
  Save,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import nuriteIcon from '../../../public/nurite.svg?no-inline'
import shortcutGuide from '../../../prompts/AboutShortCutKey.md?raw'
import './TopBar.css'

const shortcutEntries = shortcutGuide.split(/\r?\n/).flatMap((line) => {
  if (!line.startsWith('- ')) return []
  const [label, keys] = line.slice(2).split(/[:：]\s*/, 2)
  return label && keys ? [{ label, keys }] : []
})

type TopBarProps = {
  onRequestNewCanvas: () => void
  onSaveProject: () => void
  onRequestLoadProject: () => void
  projectFileBusy: boolean
  projectFileStatus: { message: string; id: number } | null
  isProjectDirty: boolean
  canvasName: string
  onCanvasNameChange: (name: string) => void
  onExportCanvas: () => void
  exportingCanvas: boolean
  canvasExportStatus: string | null
}

export function TopBar({
  onRequestNewCanvas,
  onSaveProject,
  onRequestLoadProject,
  projectFileBusy,
  projectFileStatus,
  isProjectDirty,
  canvasName,
  onCanvasNameChange,
  onExportCanvas,
  exportingCanvas,
  canvasExportStatus,
}: TopBarProps) {
  const shortcutDialogRef = useRef<HTMLDialogElement>(null)

  return (
    <header className="topbar">
      <div className="brand-group">
        <a className="brand" href="#" aria-label="Nurite ホーム">
          <img className="brand-mark" src={nuriteIcon} alt="" />
          <span>Nurite</span>
        </a>
        <button
          className="shortcuts-help-button"
          type="button"
          aria-label="ショートカット一覧を表示"
          title="ショートカット一覧"
          onClick={() => shortcutDialogRef.current?.showModal()}
        >
          <BookOpenText size={18} />
        </button>
        <dialog
          ref={shortcutDialogRef}
          className="shortcuts-dialog"
          aria-labelledby="shortcuts-dialog-title"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const clickedOutside = event.clientX < bounds.left
              || event.clientX > bounds.right
              || event.clientY < bounds.top
              || event.clientY > bounds.bottom
            if (clickedOutside) event.currentTarget.close()
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="shortcuts-dialog-header">
            <h2 id="shortcuts-dialog-title">ショートカット一覧</h2>
            <button
              className="shortcuts-dialog-close"
              type="button"
              aria-label="閉じる"
              onClick={() => shortcutDialogRef.current?.close()}
            >
              <X size={18} />
            </button>
          </div>
          <ul className="shortcuts-list">
            {shortcutEntries.map(({ label, keys }) => (
              <li key={label}>
                <span>{label}</span>
                <kbd>{keys}</kbd>
              </li>
            ))}
          </ul>
        </dialog>
      </div>
      <div className="document-title">
        <span
          className={`document-dot${isProjectDirty ? '' : ' saved'}`}
          role="img"
          aria-label={isProjectDirty ? '未保存の編集があります' : '保存済み'}
          title={isProjectDirty ? '未保存' : '保存済み'}
        />
        <input
          className="document-name-input"
          type="text"
          aria-label="キャンバスファイル名"
          value={canvasName}
          maxLength={120}
          onChange={(event) => onCanvasNameChange(event.currentTarget.value)}
        />
      </div>
      <div className="topbar-actions">
        <button
          className="topbar-button"
          aria-label="新しいキャンバスを作成"
          disabled={projectFileBusy}
          onClick={onRequestNewCanvas}
        >
          <FilePlus2 size={16} />
          <span>NEW</span>
        </button>
        <button
          className="topbar-button"
          aria-label="編集ファイルを保存"
          disabled={projectFileBusy}
          onClick={onSaveProject}
        >
          <Save size={16} />
          <span>{projectFileBusy ? '処理中' : 'SAVE'}</span>
        </button>
        <button
          className="topbar-button"
          aria-label="編集ファイルを読み込み"
          disabled={projectFileBusy}
          onClick={onRequestLoadProject}
        >
          <FolderOpen size={16} />
          <span>LOAD</span>
        </button>
        <button
          className="export-button"
          aria-label="キャンバス画像をエクスポート"
          disabled={exportingCanvas}
          onClick={onExportCanvas}
        >
          <ArrowDownToLine size={16} />
          <span>{exportingCanvas ? '出力中' : 'EXPORT'}</span>
        </button>
        {canvasExportStatus && (
          <span className="canvas-export-status" role="status" aria-live="polite">
            {canvasExportStatus}
          </span>
        )}
        {projectFileStatus && (
          <TimedProjectStatus
            key={projectFileStatus.id}
            message={projectFileStatus.message}
          />
        )}
      </div>
    </header>
  )
}

function TimedProjectStatus({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimeout = window.setTimeout(() => setFading(true), 2500)
    const hideTimeout = window.setTimeout(() => setVisible(false), 3200)
    return () => {
      window.clearTimeout(fadeTimeout)
      window.clearTimeout(hideTimeout)
    }
  }, [])

  if (!visible) return null
  return (
    <span
      className={`project-file-status${fading ? ' fading' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </span>
  )
}
