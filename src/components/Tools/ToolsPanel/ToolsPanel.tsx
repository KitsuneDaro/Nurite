import { SlidersHorizontal } from 'lucide-react'
import { brushShapes, paintTypes } from '../../../constants/paint'
import type { BrushShape, BrushType, ToolType } from '../../../types'
import { ToolTypeSelector } from '../ToolTypeSelector/ToolTypeSelector'
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
  toolType: ToolType
  followDirection: boolean
  onBrushShapeChange: (shape: BrushShape) => void
  onPaintTypeChange: (type: BrushType) => void
  onToolTypeChange: (toolType: ToolType) => void
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
  toolType,
  followDirection,
  onBrushShapeChange,
  onPaintTypeChange,
  onToolTypeChange,
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
      <ToolTypeSelector selected={toolType} onChange={onToolTypeChange} />
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
