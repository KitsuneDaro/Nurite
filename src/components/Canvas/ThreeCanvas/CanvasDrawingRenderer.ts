import * as THREE from 'three'
import type { BrushStrokeStyle, DrawingPoint, DrawingSegment } from '../../../types'
import {
  brushFragmentShader,
  brushVertexShader,
  textureDebugFragmentShader,
  textureDebugVertexShader,
} from './CanvasDrawingShader'
import { downloadTextureArchive } from './CanvasTextureExport'
import { CANVAS_SIZE } from './CanvasConstants'
import {
  DEFAULT_TEXTURE_DEBUG_FIELD,
  getTextureDebugField,
  type TextureDebugField,
  type TextureDebugSource,
} from './TextureDebugFields'
import type { TextureDataType } from 'three'

export { CANVAS_SIZE } from './CanvasConstants'
const MAX_BRUSH_SIZE = 63

const TEXTURE_NAMES = [
  'metadata',
  'color',
  'drawing-state-a',
  'drawing-state-b',
] as const

function createRenderTarget(type: TextureDataType = THREE.UnsignedByteType) {
  const target = new THREE.WebGLRenderTarget(CANVAS_SIZE, CANVAS_SIZE, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type,
    depthBuffer: false,
    stencilBuffer: false,
  })
  target.texture.generateMipmaps = false
  target.texture.colorSpace = THREE.NoColorSpace
  return target
}

export class CanvasDrawingRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly metadataTarget: THREE.WebGLRenderTarget
  private readonly colorTarget: THREE.WebGLRenderTarget
  private readonly drawingStateTargetA: THREE.WebGLRenderTarget
  private readonly drawingStateTargetB: THREE.WebGLRenderTarget
  private readonly brushMaterial: THREE.ShaderMaterial
  private readonly brushMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly brushScene: THREE.Scene
  private readonly brushCamera: THREE.OrthographicCamera
  private readonly displayScene: THREE.Scene
  private readonly displayCamera: THREE.OrthographicCamera
  private readonly debugScene: THREE.Scene
  private readonly debugCamera: THREE.OrthographicCamera
  private readonly debugMaterial: THREE.ShaderMaterial
  private debugMode = false
  private debugField = DEFAULT_TEXTURE_DEBUG_FIELD
  private disposed = false

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(CANVAS_SIZE, CANVAS_SIZE, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.setAttribute('aria-label', '1024×1024 Three.js キャンバス')
    container.appendChild(this.renderer.domElement)

    this.metadataTarget = createRenderTarget()
    this.colorTarget = createRenderTarget()
    this.drawingStateTargetA = createRenderTarget()
    this.drawingStateTargetB = createRenderTarget()

    this.brushMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uVelocity: { value: new THREE.Vector2() },
        uAcceleration: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uOutputType: { value: 0 },
        uStrokeIndex: { value: 0 },
        uFrameIndex: { value: 0 },
        uFollowDirection: { value: 0 },
        uColor: { value: new THREE.Color('#000000') },
        uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
        uMetadataTexture: { value: this.colorTarget.texture },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.brushMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.brushMaterial)
    this.brushMesh.frustumCulled = false
    this.brushScene = new THREE.Scene()
    this.brushScene.add(this.brushMesh)
    this.brushCamera = new THREE.OrthographicCamera(0, CANVAS_SIZE, 0, CANVAS_SIZE, 0.1, 10)
    this.brushCamera.position.z = 2

    const displayGeometry = new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE)
    const displayMaterial = new THREE.MeshBasicMaterial({ map: this.colorTarget.texture })
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color('#FFFFFF')
    this.displayScene.add(new THREE.Mesh(displayGeometry, displayMaterial))
    this.displayCamera = new THREE.OrthographicCamera(
      -CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      -CANVAS_SIZE / 2,
      0.1,
      10,
    )
    this.displayCamera.position.z = 2

    this.debugScene = new THREE.Scene()
    this.debugScene.background = new THREE.Color('#10141c')
    this.debugCamera = new THREE.OrthographicCamera(
      -CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      -CANVAS_SIZE / 2,
      0.1,
      10,
    )
    this.debugCamera.position.z = 2
    this.debugMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.metadataTarget.texture },
        uDebugField: { value: getTextureDebugField(this.debugField).mode },
      },
      vertexShader: textureDebugVertexShader,
      fragmentShader: textureDebugFragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.debugScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE),
      this.debugMaterial,
    ))

    this.clearTarget(this.metadataTarget, '#000000', 0)
    this.clearTarget(this.colorTarget, '#FFFFFF', 1)
    this.clearTarget(this.drawingStateTargetA, '#000000', 0)
    this.clearTarget(
      this.drawingStateTargetB,
      new THREE.Color().setRGB(128 / 255, 128 / 255, 128 / 255),
      1,
    )
    this.renderOutput()
  }

  setDebugField(field: TextureDebugField) {
    if (this.disposed || this.debugField === field) return
    const definition = getTextureDebugField(field)
    const targets: Record<TextureDebugSource, THREE.WebGLRenderTarget> = {
      metadata: this.metadataTarget,
      color: this.colorTarget,
      'drawing-state-a': this.drawingStateTargetA,
      'drawing-state-b': this.drawingStateTargetB,
    }
    this.debugField = field
    this.debugMaterial.uniforms.uTexture.value = targets[definition.source]!.texture
    this.debugMaterial.uniforms.uDebugField.value = definition.mode
    if (this.debugMode) this.renderOutput()
  }

  setDebugMode(enabled: boolean) {
    if (this.disposed || this.debugMode === enabled) return
    this.debugMode = enabled
    this.renderOutput()
  }

  async exportTextures() {
    if (this.disposed) throw new Error('Cannot export textures after the renderer is disposed.')

    const targets = [
      this.metadataTarget,
      this.colorTarget,
      this.drawingStateTargetA,
      this.drawingStateTargetB,
    ]
    const buffers = targets.map((target) => {
      const pixels = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * 4)
      this.renderer.readRenderTargetPixels(
        target,
        0,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE,
        pixels,
      )
      return pixels
    })
    await downloadTextureArchive(TEXTURE_NAMES, buffers)
  }

  drawFrame(
    segments: readonly DrawingSegment[],
    style: BrushStrokeStyle,
    strokeIndex: number,
    frameIndex: number,
  ) {
    if (this.disposed || segments.length === 0) return

    const previousAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(true)
    this.brushMaterial.uniforms.uBrushSize.value = Math.min(
      MAX_BRUSH_SIZE,
      Math.max(1, style.size),
    )
    this.brushMaterial.uniforms.uShape.value =
      style.shape === 'round' ? 0 : style.shape === 'flat' ? 1 : 2
    this.brushMaterial.uniforms.uStrokeIndex.value = strokeIndex
    this.brushMaterial.uniforms.uFrameIndex.value = frameIndex
    this.brushMaterial.uniforms.uFollowDirection.value = style.followDirection ? 1 : 0
    this.brushMaterial.uniforms.uColor.value.set(style.eraserEnabled ? '#FFFFFF' : style.color)

    for (const segment of segments) {
      this.setSegmentUniforms(
        segment.start,
        segment.end,
        Math.min(MAX_BRUSH_SIZE, Math.max(1, style.size)),
        segment.previousDirection,
      )
      this.brushMaterial.uniforms.uVelocity.value.set(
        segment.end.x - segment.start.x,
        segment.end.y - segment.start.y,
      )
      this.brushMaterial.uniforms.uAcceleration.value.set(
        segment.end.x - segment.start.x - (segment.previousDirection?.x ?? 0),
        segment.end.y - segment.start.y - (segment.previousDirection?.y ?? 0),
      )
      this.renderSegmentPass(this.metadataTarget, 0, this.colorTarget.texture)
      this.renderSegmentPass(this.drawingStateTargetA, 2, this.metadataTarget.texture)
      this.renderSegmentPass(this.drawingStateTargetB, 3, this.metadataTarget.texture)
      this.renderSegmentPass(this.colorTarget, 1, this.metadataTarget.texture)
    }

    this.renderer.setScissorTest(false)
    this.renderer.autoClear = previousAutoClear
    this.renderOutput()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.brushScene.remove(this.brushMesh)
    this.brushMesh.geometry.dispose()
    this.brushMaterial.dispose()
    this.displayScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
    this.metadataTarget.dispose()
    this.colorTarget.dispose()
    this.drawingStateTargetA.dispose()
    this.drawingStateTargetB.dispose()
    this.debugScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private clearTarget(target: THREE.WebGLRenderTarget, color: THREE.ColorRepresentation, alpha: number) {
    this.renderer.setRenderTarget(target)
    this.renderer.setClearColor(color, alpha)
    this.renderer.clear(true, false, false)
  }

  private renderOutput() {
    this.renderer.setRenderTarget(null)
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.render(
      this.debugMode ? this.debugScene : this.displayScene,
      this.debugMode ? this.debugCamera : this.displayCamera,
    )
  }

  private setSegmentUniforms(
    start: DrawingPoint,
    end: DrawingPoint,
    brushSize: number,
    previousDirection: DrawingPoint | null,
  ) {
    const boundsPadding = Math.ceil(brushSize) + 2
    const left = Math.max(0, Math.floor(Math.min(start.x, end.x) - boundsPadding))
    const right = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.x, end.x) + boundsPadding))
    const top = Math.max(0, Math.floor(Math.min(start.y, end.y) - boundsPadding))
    const bottom = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.y, end.y) + boundsPadding))
    if (right <= left || bottom <= top) return

    this.brushMaterial.uniforms.uStart.value.set(start.x, start.y)
    this.brushMaterial.uniforms.uEnd.value.set(end.x, end.y)
    this.brushMaterial.uniforms.uPreviousDirection.value.set(
      previousDirection?.x ?? 0,
      previousDirection?.y ?? 0,
    )
    this.brushMaterial.uniforms.uVelocity.value.set(end.x - start.x, end.y - start.y)
    this.brushMaterial.uniforms.uAcceleration.value.set(
      end.x - start.x - (previousDirection?.x ?? 0),
      end.y - start.y - (previousDirection?.y ?? 0),
    )
    this.brushMesh.position.set((left + right) / 2, (top + bottom) / 2, 0)
    this.brushMesh.scale.set(right - left, bottom - top, 1)
    this.renderer.setScissor(left, CANVAS_SIZE - bottom, right - left, bottom - top)
  }

  private renderSegmentPass(
    target: THREE.WebGLRenderTarget,
    outputType: number,
    metadataTexture: THREE.Texture,
  ) {
    this.brushMaterial.uniforms.uOutputType.value = outputType
    this.brushMaterial.uniforms.uMetadataTexture.value = metadataTexture
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.brushScene, this.brushCamera)
  }
}
