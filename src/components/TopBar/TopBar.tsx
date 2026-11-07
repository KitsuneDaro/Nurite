import {
  ArrowDownToLine,
  FolderOpen,
  Save,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './TopBar.css'

type TopBarProps = {
  onSaveProject: () => void
  onLoadProject: (file: File) => void
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
  onSaveProject,
  onLoadProject,
  projectFileBusy,
  projectFileStatus,
  isProjectDirty,
  canvasName,
  onCanvasNameChange,
  onExportCanvas,
  exportingCanvas,
  canvasExportStatus,
}: TopBarProps) {
  const projectFileInputRef = useRef<HTMLInputElement>(null)

  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Nurite ホーム">
        <span className="brand-mark"><Sparkles size={18} /></span>
        <span>Nurite</span>
      </a>
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
          onClick={() => {
            if (
              !isProjectDirty
              || window.confirm('未保存の編集内容があります。破棄してファイルを読み込みますか？')
            ) {
              projectFileInputRef.current?.click()
            }
          }}
        >
          <FolderOpen size={16} />
          <span>LOAD</span>
        </button>
        <input
          ref={projectFileInputRef}
          className="project-file-input"
          type="file"
          accept=".nrt"
          aria-label="読み込む編集ファイル"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) onLoadProject(file)
          }}
        />
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
