import { CANVAS_SIZE } from './CanvasConstants'

type TexturePixels = Uint8Array
type TextureName = 'metadata' | 'color' | 'drawing-state-a' | 'drawing-state-b'

type ArchiveEntry = {
  name: string
  data: Uint8Array
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function linearToSrgb(value: number) {
  const linear = value / 255
  const srgb = linear <= 0.0031308
    ? linear * 12.92
    : 1.055 * linear ** (1 / 2.4) - 0.055
  return clampByte(srgb * 255)
}

function createPreviewPixels(name: TextureName, pixels: TexturePixels) {
  const preview = new Uint8ClampedArray(CANVAS_SIZE * CANVAS_SIZE * 4)

  for (let y = 0; y < CANVAS_SIZE; y += 1) {
    const sourceRow = CANVAS_SIZE - 1 - y
    for (let x = 0; x < CANVAS_SIZE; x += 1) {
      const sourceIndex = (sourceRow * CANVAS_SIZE + x) * 4
      const targetIndex = (y * CANVAS_SIZE + x) * 4
      if (name === 'drawing-state-a') {
        const values = pixels as Uint8Array
        const byte0 = values[sourceIndex] ?? 0
        const byte1 = values[sourceIndex + 1] ?? 0
        const byte2 = values[sourceIndex + 2] ?? 0
        const byte3 = values[sourceIndex + 3] ?? 0
        const endX = byte0 + (byte1 % 4) * 256
        const endY = Math.floor(byte1 / 4) + (byte2 % 16) * 64
        const edgeDistance = Math.floor(byte2 / 16) + (byte3 % 4) * 16
        preview[targetIndex] = clampByte(endX / 1023 * 255)
        preview[targetIndex + 1] = clampByte(endY / 1023 * 255)
        preview[targetIndex + 2] = clampByte(edgeDistance / 63 * 255)
        preview[targetIndex + 3] = 255
      } else {
        const values = pixels
        const isColorTexture = name === 'color'
        preview[targetIndex] = isColorTexture
          ? linearToSrgb(values[sourceIndex] ?? 0)
          : values[sourceIndex] ?? 0
        preview[targetIndex + 1] = isColorTexture
          ? linearToSrgb(values[sourceIndex + 1] ?? 0)
          : values[sourceIndex + 1] ?? 0
        preview[targetIndex + 2] = isColorTexture
          ? linearToSrgb(values[sourceIndex + 2] ?? 0)
          : values[sourceIndex + 2] ?? 0
        preview[targetIndex + 3] = 255
      }
    }
  }

  return preview
}

async function createPng(name: TextureName, pixels: TexturePixels) {
  const data = createPreviewPixels(name, pixels)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create a 2D context for texture previews.')
  context.putImageData(new ImageData(data, CANVAS_SIZE, CANVAS_SIZE), 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error(`Could not encode the ${name} texture preview.`))
    }, 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function getCrc32(data: Uint8Array) {
  let crc = 0xFFFFFFFF
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF]! ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function getDosTimestamp() {
  const now = new Date()
  return {
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
    date: ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
  }
}

function createZip(entries: readonly ArchiveEntry[]) {
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  const timestamp = getDosTimestamp()
  let localOffset = 0
  let centralSize = 0

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name)
    const checksum = getCrc32(entry.data)
    const localHeader = new Uint8Array(30 + name.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034B50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, timestamp.time, true)
    localView.setUint16(12, timestamp.date, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, entry.data.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(name, 30)
    localChunks.push(localHeader, entry.data)

    const centralHeader = new Uint8Array(46 + name.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014B50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, timestamp.time, true)
    centralView.setUint16(14, timestamp.date, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, entry.data.length, true)
    centralView.setUint32(24, entry.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    centralHeader.set(name, 46)
    centralChunks.push(centralHeader)
    localOffset += localHeader.length + entry.data.length
    centralSize += centralHeader.length
  }

  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, localOffset, true)
  endView.setUint16(20, 0, true)
  const archiveLength = [...localChunks, ...centralChunks, endRecord]
    .reduce((length, chunk) => length + chunk.length, 0)
  const archive = new Uint8Array(archiveLength)
  let archiveOffset = 0
  for (const chunk of [...localChunks, ...centralChunks, endRecord]) {
    archive.set(chunk, archiveOffset)
    archiveOffset += chunk.length
  }
  return new Blob([archive.buffer], { type: 'application/zip' })
}

function getRawBytes(pixels: TexturePixels) {
  const bytes = new Uint8Array(pixels.byteLength)
  bytes.set(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
  return bytes
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
    entries.push({ name: `preview/${name}.png`, data: await createPng(name, pixels) })
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
        channels: 'R=end X bits 0-7; G=end X bits 8-9 | end Y bits 0-5 shifted left 2; B=end Y bits 6-9 | edge distance bits 0-3 shifted left 4; A=edge distance bits 4-5 | brush size bits 0-5 shifted left 2.',
      },
      'drawing-state-b': {
        format: 'RGBA8',
        channels: 'R/G=velocity X/Y and B/A=acceleration X/Y, signed values biased by +128',
      },
    },
    binaryStorage: 'Raw render-target RGBA8 bytes in WebGL bottom-up row order.',
    previews: 'PNG previews are vertically oriented for normal image viewers; drawing-state-a previews normalize end X, end Y, and distance from edge.',
  }
  entries.push({
    name: 'manifest.json',
    data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  })

  const archive = createZip(entries)
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
