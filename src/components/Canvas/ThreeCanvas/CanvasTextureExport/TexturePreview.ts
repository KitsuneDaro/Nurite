import { CANVAS_SIZE } from '../CanvasConstants'

export type TexturePixels = Uint8Array
  | Uint16Array
export type TextureName =
  | 'metadata'
  | 'color'
  | 'drawing-state-a'
  | 'drawing-state-b'
  | 'drawing-state-c'

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

function halfFloatToNumber(value: number) {
  const sign = (value & 0x8000) === 0 ? 1 : -1
  const exponent = (value >> 10) & 0x1F
  const fraction = value & 0x03FF
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024)
  if (exponent === 0x1F) return fraction === 0 ? sign * Infinity : NaN
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024)
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
        const byte2 = values[sourceIndex + 2] ?? 0
        const byte3 = values[sourceIndex + 3] ?? 0
        const brushShapeId = byte2 % 16 + (byte3 % 4) * 16
        const paintStyleId = byte3 >> 2
        preview[targetIndex] = clampByte(brushShapeId / 63 * 255)
        preview[targetIndex + 1] = clampByte(paintStyleId / 63 * 255)
        preview[targetIndex + 2] = 0
        preview[targetIndex + 3] = 255
      } else if (name === 'drawing-state-c') {
        const values = pixels as Uint16Array
        const distance = halfFloatToNumber(values[sourceRow * CANVAS_SIZE * 2 + x * 2] ?? 0)
        const brushSize = halfFloatToNumber(values[sourceRow * CANVAS_SIZE * 2 + x * 2 + 1] ?? 0)
        preview[targetIndex] = clampByte(distance)
        preview[targetIndex + 1] = clampByte(brushSize)
        preview[targetIndex + 2] = 0
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

export async function createTexturePreviewPng(name: TextureName, pixels: TexturePixels) {
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
