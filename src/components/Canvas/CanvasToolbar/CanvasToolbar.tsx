import { Bug, Minus, Plus, Layers } from 'lucide-react'
import { TEXTURE_DEBUG_GROUPS, type TextureDebugField } from '../ThreeCanvas/TextureDebugFields'
import { HistoryControls } from '../../Tools/HistoryControls/HistoryControls'
import './CanvasToolbar.css'

type CanvasToolbarProps = {
  zoom: number
  onZoomChange: (zoom: number) => void
  debugMode: boolean
  onDebugModeChange: (enabled: boolean) => void
  debugField: TextureDebugField
  onDebugFieldChange: (field: TextureDebugField) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const ZOOM_STEP = 1.2

export function CanvasToolbar({
  zoom,
  onZoomChange,
  debugMode,
  onDebugModeChange,
  debugField,
  onDebugFieldChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: CanvasToolbarProps) {
  return (
    <div className={`canvas-toolbar${debugMode ? ' debug-mode' : ''}`}>
      <div className="canvas-meta">
        <span className="canvas-meta-icon"><Layers size={15} /></span>
        <span>キャンバス</span>
        <span className="meta-divider" />
        <strong>1024 × 1024</strong>
        <span className="ratio-badge">1:1</span>
      </div>
      <div className="canvas-toolbar-actions">
        <button
          className={`texture-debug-toggle${debugMode ? ' selected' : ''}`}
          aria-label="テクスチャデバッグモード"
          aria-pressed={debugMode}
          onClick={() => onDebugModeChange(!debugMode)}
        >
          <Bug size={14} />
          <span>デバッグ</span>
        </button>
        <HistoryControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />
        <div className="canvas-zoom">
          <button
            aria-label="縮小"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / ZOOM_STEP))}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="拡大"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * ZOOM_STEP))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      {debugMode && (
        <div className="texture-debug-fields" role="group" aria-label="デバッグ要素">
          {TEXTURE_DEBUG_GROUPS.map((group) => (
            <div className="texture-debug-field-group" key={group.label}>
              <span>{group.label}</span>
              <div>
                {group.fields.map((field) => (
                  <button
                    className={`texture-debug-field${debugField === field.id ? ' selected' : ''}`}
                    key={field.id}
                    aria-label={`${group.label}: ${field.label}`}
                    aria-pressed={debugField === field.id}
                    onClick={() => onDebugFieldChange(field.id)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
