import { CANVAS_SIZE } from './CanvasConstants'
import { createTexturePreviewPng, type TextureName, type TexturePixels } from './CanvasTextureExport/TexturePreview'
import { createZipArchive, type ArchiveEntry } from './CanvasTextureExport/ZipArchive'
import { HalfFloatType, RGFormat } from 'three'
import type { WebGLRenderTarget, WebGLRenderer } from 'three'

const TEXTURE_NAMES = [
  'metadata',
  'color',
  'drawing-state-a',
  'drawing-state-b',
  'drawing-state-c',
] as const

function getRawBytes(pixels: TexturePixels) {
  const bytes = new Uint8Array(pixels.byteLength)
  bytes.set(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
  return bytes
}

export async function exportTextureTargets(
  renderer: WebGLRenderer,
  targets: readonly [
    WebGLRenderTarget,
    WebGLRenderTarget,
    WebGLRenderTarget,
    WebGLRenderTarget,
    WebGLRenderTarget,
  ],
) {
  const buffers = targets.map((target) => {
    const channelCount = target.texture.format === RGFormat ? 2 : 4
    const pixels = target.texture.type === HalfFloatType
      ? new Uint16Array(CANVAS_SIZE * CANVAS_SIZE * channelCount)
      : new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * channelCount)
    renderer.readRenderTargetPixels(target, 0, 0, CANVAS_SIZE, CANVAS_SIZE, pixels)
    return pixels
  })
  await downloadTextureArchive(TEXTURE_NAMES, buffers)
}

export async function downloadTextureArchive(
  names: readonly TextureName[],
  textures: readonly TexturePixels[],
) {
  if (names.length !== textures.length) {
    throw new Error('Texture names and data do not have matching lengths.')
  }

  const entries: ArchiveEntry[] = []
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]
    const pixels = textures[index]
    if (!name || !pixels) throw new Error(`Missing texture data at index ${index}.`)

    entries.push({ name: `raw/${name}.bin`, data: getRawBytes(pixels) })
    entries.push({ name: `preview/${name}.png`, data: await createTexturePreviewPng(name, pixels) })
  }

  const manifest = {
    canvasSize: [CANVAS_SIZE, CANVAS_SIZE],
    textures: {
      metadata: {
        format: 'RGBA8',
        channels: 'R=stroke ID bits 0-7, G=bits 8-15, B low nibble=bits 16-19 and high nibble=segment ID bits 0-3, A=segment ID bits 4-11.',
      },
      color: { format: 'RGBA8', channels: 'Linear RGBA color' },
      'drawing-state-a': {
        format: 'RGBA8',
        channels: 'R=end X bits 0-7; G=end X bits 8-9 | end Y bits 0-5 shifted left 2; B=end Y bits 6-9 | brush shape ID bits 0-3 shifted left 4; A=brush shape ID bits 4-5 | paint style ID bits 0-5 shifted left 2.',
      },
      'drawing-state-b': {
        format: 'RGBA8',
        channels: 'R/G=velocity X/Y and B/A=acceleration X/Y, signed values biased by +128',
      },
      'drawing-state-c': {
        format: 'RG16F',
        channels: 'R=maximum stroke edge distance, twice the geometric edge distance in pixels (0-255); G=maximum encoded brush size in pixels (integer 1-255). Both channels use MAX blending.',
      },
    },
    binaryStorage: 'Raw render-target bytes in WebGL bottom-up row order; RGBA8 textures use 8-bit channels and drawing-state-c uses 16-bit floating-point RG channels.',
    previews: 'PNG previews are vertically oriented for normal image viewers; drawing-state-a previews normalize end X and end Y and visualize shape/style IDs, while drawing-state-c maps distance and brush size to red and green.',
  }
  entries.push({
    name: 'manifest.json',
    data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  })

  const archive = createZipArchive(entries)
  downloadBlob(archive, 'webpainter-textures.zip')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
