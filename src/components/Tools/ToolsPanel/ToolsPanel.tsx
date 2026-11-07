import { SlidersHorizontal } from 'lucide-react'
import { brushShapes, paintTypes } from '../../../constants/paint'
import type { BrushShape, BrushType } from '../../../types'
import { EraserToggle } from '../EraserToggle/EraserToggle'
import { DirectionToggle } from '../DirectionToggle/DirectionToggle'
import { HistoryControls } from '../HistoryControls/HistoryControls'
import { PanelHeading } from '../../Panel/PanelHeading/PanelHeading'
import { PanelStatus } from '../PanelStatus/PanelStatus'
import { ToolOptionGroup } from '../ToolOptionGroup/ToolOptionGroup'
import './ToolsPanel.css'

type ToolsPanelProps = {
  mobileOpen: boolean
  brushShape: BrushShape
  paintType: BrushType
  eraserEnabled: boolean
  followDirection: boolean
  onBrushShapeChange: (shape: BrushShape) => void
  onPaintTypeChange: (type: BrushType) => void
  onEraserChange: (enabled: boolean) => void
  onFollowDirectionChange: (enabled: boolean) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function ToolsPanel({
  mobileOpen,
  brushShape,
  paintType,
  eraserEnabled,
  followDirection,
  onBrushShapeChange,
  onPaintTypeChange,
  onEraserChange,
  onFollowDirectionChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolsPanelProps) {
  return (
    <aside className={`panel tools-panel ${mobileOpen ? 'mobile-panel-open' : ''}`}>
      <PanelHeading
        eyebrow="TOOLS"
        title="ペイントツール"
        actionLabel="設定"
        ActionIcon={SlidersHorizontal}
      />
      <ToolOptionGroup
        title="ブラシ形状"
        className="shape-row"
        options={brushShapes}
        selected={brushShape}
        onSelect={onBrushShapeChange}
        unavailable={['square']}
      />
      <DirectionToggle enabled={followDirection} onChange={onFollowDirectionChange} />
      <ToolOptionGroup
        title="ペイントタイプ"
        className="paint-row"
        options={paintTypes}
        selected={paintType}
        onSelect={onPaintTypeChange}
        unavailable={['watercolor']}
      />
      <EraserToggle enabled={eraserEnabled} onChange={onEraserChange} />
      <HistoryControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      <PanelStatus />
    </aside>
  )
}
