import {
  ArrowDownToLine,
  ChevronDown,
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
  onExportCanvas: () => void
  exportingCanvas: boolean
  canvasExportStatus: string | null
}

export function TopBar({
  onSaveProject,
  onLoadProject,
  projectFileBusy,
  projectFileStatus,
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
        <span>Starry night study</span>
        <ChevronDown size={15} />
      </div>
      <div className="topbar-actions">
        <span className="saved-status"><span /> 色設定を自動保存</span>
        <button
          className="topbar-button"
          aria-label="編集ファイルを保存"
          disabled={projectFileBusy}
          onClick={onSaveProject}
        >
          <Save size={16} />
          <span>{projectFileBusy ? '処理中' : 'セーブ'}</span>
        </button>
        <button
          className="topbar-button"
          aria-label="編集ファイルを読み込み"
          disabled={projectFileBusy}
          onClick={() => projectFileInputRef.current?.click()}
        >
          <FolderOpen size={16} />
          <span>ロード</span>
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
          <span>{exportingCanvas ? '出力中' : 'エクスポート'}</span>
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
