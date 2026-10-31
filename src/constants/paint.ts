import {
  Brush,
  Circle,
  Sparkles,
  Square,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type { BrushShape, BrushType } from '../types'

type ToolOption<Id extends string> = {
  id: Id
  label: string
  Icon: LucideIcon
}

export const palette = [
  '#1d9a95', '#f3e99b', '#a8c987', '#398773', '#767b51', '#527b72',
  '#82745d', '#527fa7', '#469ec0', '#168f98', '#93cdb8', '#f2d875',
  '#e5d53d', '#e7a52f', '#e87835', '#d84f42', '#ee8974', '#f3a18a',
  '#e87860', '#cf392c', '#8d3e35', '#873b71', '#777a80', '#111318',
] as const

export const brushShapes = [
  { id: 'round', label: '丸筆', Icon: Circle },
  { id: 'flat', label: '平筆', Icon: Brush },
  { id: 'square', label: '四角筆', Icon: Square },
] satisfies readonly ToolOption<BrushShape>[]

export const paintTypes = [
  { id: 'normal', label: 'ノーマル', Icon: Brush },
  { id: 'oil', label: '油彩', Icon: Sparkles },
  { id: 'watercolor', label: '水彩', Icon: Waves },
] satisfies readonly ToolOption<BrushType>[]
