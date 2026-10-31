import type { LucideIcon } from 'lucide-react'

export type BrushShape = 'round' | 'flat' | 'square';
export type BrushType = 'normal' | 'oil' | 'watercolor';

export type ToolOption<Id extends string> = {
  id: Id
  label: string
  Icon: LucideIcon
  iconSize: number
}