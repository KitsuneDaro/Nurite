import type { BucketFillMode, ToolType } from '../../../types'
import { BrushSizeControl } from '../../Color/BrushSizeControl/BrushSizeControl'
import './ToolOptions.css'

type ToolOptionsProps = {
  toolType: ToolType
  brushSize: number
  eraserSize: number
  bucketFillMode: BucketFillMode
  onBrushSizeChange: (size: number) => void
  onEraserSizeChange: (size: number) => void
  onBucketFillModeChange: (mode: BucketFillMode) => void
}

export function ToolOptions({
  toolType,
  brushSize,
  eraserSize,
  bucketFillMode,
  onBrushSizeChange,
  onEraserSizeChange,
  onBucketFillModeChange,
}: ToolOptionsProps) {
  return (
    <section className="tool-options" aria-label="ツールオプション">
      <h3>ツールオプション</h3>
      {toolType === 'brush' && (
        <BrushSizeControl
          label="ブラシサイズ"
          size={brushSize}
          onChange={onBrushSizeChange}
        />
      )}
      {toolType === 'eraser' && (
        <BrushSizeControl
          label="消しゴムサイズ"
          size={eraserSize}
          onChange={onEraserSizeChange}
        />
      )}
      {toolType === 'bucket' && (
        <div className="bucket-fill-options" role="group" aria-label="塗りつぶし参照">
          <button
            type="button"
            className={bucketFillMode === 'color' ? 'selected' : ''}
            aria-pressed={bucketFillMode === 'color'}
            onClick={() => onBucketFillModeChange('color')}
          >
            色参照
          </button>
          <button
            type="button"
            className={bucketFillMode === 'stroke' ? 'selected' : ''}
            aria-pressed={bucketFillMode === 'stroke'}
            onClick={() => onBucketFillModeChange('stroke')}
          >
            ストロークID参照
          </button>
        </div>
      )}
      {toolType === 'eyedropper' && (
        <p className="tool-options-empty">設定はありません</p>
      )}
    </section>
  )
}
