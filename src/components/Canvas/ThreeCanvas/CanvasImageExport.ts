import type { Camera, Scene, WebGLRenderer, WebGLRenderTarget } from 'three'
import { CANVAS_SIZE } from './CanvasConstants'
import { downloadBlob } from './CanvasTextureExport'

export async function exportCanvasImage(
  renderer: WebGLRenderer,
  target: WebGLRenderTarget,
  scene: Scene,
  camera: Camera,
  restoreOutput: () => void,
) {
  renderer.setRenderTarget(target)
  renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  renderer.setScissorTest(false)
  renderer.clear(true, false, false)
  renderer.render(scene, camera)

  const pixels = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * 4)
  renderer.readRenderTargetPixels(
    target,
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
    pixels,
  )
  restoreOutput()

  const imageData = new Uint8ClampedArray(pixels.length)
  const rowLength = CANVAS_SIZE * 4
  for (let y = 0; y < CANVAS_SIZE; y += 1) {
    const sourceOffset = (CANVAS_SIZE - 1 - y) * rowLength
    imageData.set(pixels.subarray(sourceOffset, sourceOffset + rowLength), y * rowLength)
  }

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create a 2D context for the canvas image.')
  context.putImageData(new ImageData(imageData, CANVAS_SIZE, CANVAS_SIZE), 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('Could not encode the canvas image.'))
    }, 'image/png')
  })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  downloadBlob(blob, `webpainter-${timestamp}.png`)
}
