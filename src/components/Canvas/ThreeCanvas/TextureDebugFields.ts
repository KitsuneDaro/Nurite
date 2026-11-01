export type TextureDebugSource =
  | 'metadata'
  | 'color'
  | 'drawing-state-a'
  | 'drawing-state-b'
  | 'drawing-state-c'

type TextureDebugFieldDefinition = {
  id: string
  label: string
  mode: number
  source: TextureDebugSource
}

type TextureDebugGroup = {
  label: string
  fields: readonly TextureDebugFieldDefinition[]
}

export const TEXTURE_DEBUG_GROUPS = [
  {
    label: 'メタ情報',
    fields: [
      { id: 'stroke-id', label: 'ストロークID', mode: 0, source: 'metadata' },
      { id: 'segment-id', label: 'セグメントID', mode: 1, source: 'metadata' },
    ],
  },
  {
    label: '色',
    fields: [
      { id: 'color-red', label: '赤', mode: 2, source: 'color' },
      { id: 'color-green', label: '緑', mode: 3, source: 'color' },
      { id: 'color-blue', label: '青', mode: 4, source: 'color' },
      { id: 'color-alpha', label: 'アルファ', mode: 5, source: 'color' },
    ],
  },
  {
    label: '描画状況 A',
    fields: [
      { id: 'position-x', label: '位置 X', mode: 6, source: 'drawing-state-a' },
      { id: 'position-y', label: '位置 Y', mode: 7, source: 'drawing-state-a' },
      { id: 'brush-shape-id', label: 'ブラシ形状ID', mode: 8, source: 'drawing-state-a' },
      { id: 'paint-style-id', label: 'ペイントスタイルID', mode: 9, source: 'drawing-state-a' },
    ],
  },
  {
    label: '描画状況 B',
    fields: [
      { id: 'velocity-x', label: '速度 X', mode: 10, source: 'drawing-state-b' },
      { id: 'velocity-y', label: '速度 Y', mode: 11, source: 'drawing-state-b' },
      { id: 'acceleration-x', label: '加速度 X', mode: 12, source: 'drawing-state-b' },
      { id: 'acceleration-y', label: '加速度 Y', mode: 13, source: 'drawing-state-b' },
    ],
  },
  {
    label: '描画状況 C',
    fields: [
      { id: 'stroke-edge-distance', label: 'ストローク縁距離', mode: 14, source: 'drawing-state-c' },
      { id: 'brush-size', label: 'ブラシサイズ', mode: 15, source: 'drawing-state-c' },
    ],
  },
] as const satisfies readonly TextureDebugGroup[]

export type TextureDebugField = (typeof TEXTURE_DEBUG_GROUPS)[number]['fields'][number]['id']

export const DEFAULT_TEXTURE_DEBUG_FIELD: TextureDebugField = 'stroke-id'

const debugFields: TextureDebugFieldDefinition[] = []
for (const group of TEXTURE_DEBUG_GROUPS) {
  debugFields.push(...group.fields)
}

export function getTextureDebugField(field: TextureDebugField): TextureDebugFieldDefinition {
  const definition = debugFields.find((entry) => entry.id === field)
  if (!definition) throw new Error(`Unknown texture debug field: ${field}`)
  return definition
}
