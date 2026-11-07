import {
  Brush,
  Circle,
  Sparkles,
  Square,
  Waves,
} from 'lucide-react'
import type { BrushShape, BrushType, ToolOption } from '../types'

export const palette = [
  '#1d9a95', '#a8c987', '#398773', '#767b51', '#527b72', '#111318',
  '#527fa7', '#469ec0', '#168f98', '#93cdb8', '#f3e99b', '#f2d875',
  '#e5d53d', '#e7a52f', '#e87835', '#d84f42', '#ee8974', '#f3a18a',
  '#e87860', '#cf392c', '#8d3e35', '#873b71', '#82745d', '#777a80',
] as const

export const brushShapes = [
  { id: 'round', label: '丸筆', Icon: Circle, iconSize: 20 },
  { id: 'flat', label: '平筆', Icon: Brush, iconSize: 20 },
  { id: 'square', label: '四角筆', Icon: Square, iconSize: 20 },
] satisfies readonly ToolOption<BrushShape>[]

export const paintTypes = [
  { id: 'normal', label: 'ノーマル', Icon: Brush, iconSize: 19 },
  { id: 'oil', label: '油彩', Icon: Sparkles, iconSize: 19 },
  { id: 'watercolor', label: '水彩', Icon: Waves, iconSize: 19 },
] satisfies readonly ToolOption<BrushType>[]
