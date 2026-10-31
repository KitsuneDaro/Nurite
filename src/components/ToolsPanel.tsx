import {
  Eraser,
  FolderOpen,
  Redo2,
  Save,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { brushShapes, paintTypes } from '../constants/paint'
import type { BrushShape, BrushType } from '../types'

type ToolsPanelProps = {
  brushShape: BrushShape
  paintType: BrushType
  eraserEnabled: boolean
  onBrushShapeChange: (shape: BrushShape) => void
  onPaintTypeChange: (type: BrushType) => void
  onEraserChange: (enabled: boolean) => void
}

export function ToolsPanel({
  brushShape,
  paintType,
  eraserEnabled,
  onBrushShapeChange,
  onPaintTypeChange,
  onEraserChange,
}: ToolsPanelProps) {
  return (
    <aside className="panel tools-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">TOOLS</span>
          <h2>ペイントツール</h2>
        </div>
        <button className="icon-button subtle-button" aria-label="設定"><SlidersHorizontal size={17} /></button>
      </div>

      <section className="control-section">
        <div className="section-title">ブラシ形状</div>
        <div className="choice-row shape-row">
          {brushShapes.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tool-choice ${brushShape === id ? 'selected' : ''}`}
              onClick={() => onBrushShapeChange(id)}
              aria-label={label}
              aria-pressed={brushShape === id}
              title={label}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="control-section">
        <div className="section-title">ペイントタイプ</div>
        <div className="choice-row paint-row">
          {paintTypes.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tool-choice ${paintType === id ? 'selected' : ''}`}
              onClick={() => onPaintTypeChange(id)}
              aria-pressed={paintType === id}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        className={`eraser-toggle ${eraserEnabled ? 'is-on' : ''}`}
        onClick={() => onEraserChange(!eraserEnabled)}
        aria-pressed={eraserEnabled}
      >
        <Eraser size={18} />
        <span>消しゴム</span>
        <span className={`toggle-track ${eraserEnabled ? 'checked' : ''}`}><span /></span>
      </button>

      <div className="history-buttons">
        <button className="action-tile" aria-label="元に戻す">
          <Undo2 size={20} /><span>元に戻す</span>
        </button>
        <button className="action-tile" aria-label="やり直す">
          <Redo2 size={20} /><span>やり直す</span>
        </button>
      </div>

      <div className="file-buttons">
        <button className="action-tile" aria-label="保存">
          <Save size={19} /><span>保存</span>
        </button>
        <button className="action-tile" aria-label="読み込み">
          <FolderOpen size={19} /><span>読み込み</span>
        </button>
      </div>

      <div className="panel-footer">
        <span className="status-indicator" />
        キャンバスは自動保存されます
      </div>
    </aside>
  )
}
