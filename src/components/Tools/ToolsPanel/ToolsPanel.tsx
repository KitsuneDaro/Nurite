import { brushShapes, paintTypes } from '../../../constants/paint'
import type { BrushShape, BrushType, BucketFillMode, ToolType } from '../../../types'
import { ToolTypeSelector } from '../ToolTypeSelector/ToolTypeSelector'
import { DirectionToggle } from '../DirectionToggle/DirectionToggle'
import { ToolOptions } from '../ToolOptions/ToolOptions'
import { PanelHeading } from '../../Panel/PanelHeading/PanelHeading'
import { ToolOptionGroup } from '../ToolOptionGroup/ToolOptionGroup'
import './ToolsPanel.css'

type ToolsPanelProps = {
  mobileOpen: boolean
  brushShape: BrushShape
  paintType: BrushType
  toolType: ToolType
  brushSize: number
  eraserSize: number
  bucketFillMode: BucketFillMode
  followDirection: boolean
  onBrushShapeChange: (shape: BrushShape) => void
  onPaintTypeChange: (type: BrushType) => void
  onToolTypeChange: (toolType: ToolType) => void
  onFollowDirectionChange: (enabled: boolean) => void
  onBrushSizeChange: (size: number) => void
  onEraserSizeChange: (size: number) => void
  onBucketFillModeChange: (mode: BucketFillMode) => void
}

export function ToolsPanel({
  mobileOpen,
  brushShape,
  paintType,
  toolType,
  brushSize,
  eraserSize,
  bucketFillMode,
  followDirection,
  onBrushShapeChange,
  onPaintTypeChange,
  onToolTypeChange,
  onFollowDirectionChange,
  onBrushSizeChange,
  onEraserSizeChange,
  onBucketFillModeChange,
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
      <ToolOptions
        toolType={toolType}
        brushSize={brushSize}
        eraserSize={eraserSize}
        bucketFillMode={bucketFillMode}
        onBrushSizeChange={onBrushSizeChange}
        onEraserSizeChange={onEraserSizeChange}
        onBucketFillModeChange={onBucketFillModeChange}
      />
    </aside>
  )
}
