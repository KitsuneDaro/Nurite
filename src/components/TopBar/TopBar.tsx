import {
  ArrowDownToLine,
  FolderOpen,
  Save,
  Sparkles,
} from 'lucide-react'
import { useRef } from 'react'
import './TopBar.css'

type TopBarProps = {
  onSaveProject: () => void
  onLoadProject: (file: File) => void
  projectFileBusy: boolean
  projectFileStatus: string | null
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
  canvasName,
  onCanvasNameChange,
  onExportCanvas,
  exportingCanvas,
  canvasExportStatus,
}: TopBarProps) {
  const projectFileInputRef = useRef<HTMLInputElement>(null)

  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="WebPainter ホーム">
        <span className="brand-mark"><Sparkles size={18} /></span>
        <span>web<span>painter</span></span>
      </a>
      <div className="document-title">
        <span className="document-dot" />
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
          onClick={() => projectFileInputRef.current?.click()}
        >
          <FolderOpen size={16} />
          <span>LOAD</span>
        </button>
        <input
          ref={projectFileInputRef}
          className="project-file-input"
          type="file"
          accept=".zip,application/zip"
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
          <span className="project-file-status" role="status" aria-live="polite">
            {projectFileStatus}
          </span>
        )}
      </div>
    </header>
  )
}
