import { brushShapes, paintTypes } from '../../../constants/paint'
import type { BrushShape, BrushType, ToolType } from '../../../types'
import { ToolTypeSelector } from '../ToolTypeSelector/ToolTypeSelector'
import { DirectionToggle } from '../DirectionToggle/DirectionToggle'
import { PanelHeading } from '../../Panel/PanelHeading/PanelHeading'
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
}: ToolsPanelProps) {
  return (
    <aside className={`panel tools-panel ${mobileOpen ? 'mobile-panel-open' : ''}`}>
      <PanelHeading
        eyebrow="TOOLS"
        title="ペイントツール"
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
    </aside>
  )
}
