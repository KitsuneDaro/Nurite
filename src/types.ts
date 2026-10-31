import type { LucideIcon } from 'lucide-react'

export type BrushShape = 'round' | 'flat' | 'square';
export type BrushType = 'normal' | 'oil' | 'watercolor';

export type DrawingPoint = {
  x: number
  y: number
}

export type DrawingSegment = {
  start: DrawingPoint
  end: DrawingPoint
  previousDirection: DrawingPoint | null
}

export type BrushStrokeStyle = {
  shape: BrushShape
  size: number
  color: string
  followDirection: boolean
  eraserEnabled: boolean
}

export type ToolOption<Id extends string> = {
  id: Id
  label: string
  Icon: LucideIcon
  iconSize: number
}