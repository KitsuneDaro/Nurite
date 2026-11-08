import * as THREE from 'three'
import type {
  BrushStrokeStyle,
  BucketFillMode,
  DrawingPoint,
  DrawingSegment,
} from '../../../types'
import {
  brushColorFragmentShader,
  brushMetadataFragmentShader,
  brushStateAFragmentShader,
  brushStateBFragmentShader,
  brushStrokeDistanceFragmentShader,
  brushVertexShader,
  squareBrushStrokeCapFragmentShader,
} from './CanvasDrawingShader'
import { bucketFillFragmentShader, bucketFillVertexShader } from './shaders/BucketFillShader'
import { exportCanvasImage } from './CanvasImageExport'
import { CANVAS_SIZE, MAX_STROKE_SEGMENTS } from './CanvasConstants'
import {
  DEFAULT_TEXTURE_DEBUG_FIELD,
  type TextureDebugField,
} from './TextureDebugFields'
import { CanvasTextureHistory, createRenderTarget } from './CanvasTextureHistory'
import type { CanvasHistoryState } from './CanvasTextureHistory'
import { CanvasTextureCopy } from './rendering/CanvasTextureCopy'
import { CanvasOilSurface } from './rendering/CanvasOilSurface'
import { CanvasDisplay } from './rendering/CanvasDisplay'
import type { DisplayTextureTargets } from './rendering/CanvasDisplay'
import { unionDrawingBounds } from './rendering/DrawingBounds'
import type { DrawingBounds } from './rendering/DrawingBounds'
import type { CanvasProjectTextures } from './CanvasProjectFile'

export { CANVAS_SIZE } from './CanvasConstants'
export type { CanvasHistoryState } from './CanvasTextureHistory'

const MAX_BRUSH_SIZE = 255
const CANVAS_PIXEL_COUNT = CANVAS_SIZE * CANVAS_SIZE

const PAINT_STYLE_IDS: Record<BrushStrokeStyle['paintType'], number> = {
  normal: 1,
  oil: 2,
  watercolor: 3,
}

type SquareStrokeDistanceCaps = {
  start: DrawingPoint
  startDirection: DrawingPoint | null
  startBrushSize: number
  startFollowDirection: number
  end: DrawingPoint
  endDirection: DrawingPoint | null
  endBrushSize: number
  endFollowDirection: number
}

function createMetadataMatchUniforms(metadataTexture: THREE.Texture) {
  return {
    uStrokeId: { value: 0 },
    uSegmentId: { value: 0 },
    uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
    uMetadataTexture: { value: metadataTexture },
  }
}

function getMaximumStrokeId(metadata: Uint8Array) {
  let maximumStrokeId = 0
  for (let offset = 0; offset < metadata.length; offset += 4) {
    const strokeId = (metadata[offset] ?? 0)
      + (metadata[offset + 1] ?? 0) * 0x100
      + ((metadata[offset + 2] ?? 0) & 0x0F) * 0x10000
    maximumStrokeId = Math.max(maximumStrokeId, strokeId)
  }
  return maximumStrokeId
}

function encodeStrokeMetadata(strokeId: number) {
  return new THREE.Vector4(
    strokeId % 256,
    Math.floor(strokeId / 256) % 256,
    Math.floor(strokeId / 65536) % 16,
    0,
  ).multiplyScalar(1 / 255)
}

function encodeColor(color: string) {
  const linearColor = new THREE.Color(color)
  return new THREE.Vector4(linearColor.r, linearColor.g, linearColor.b, 1)
}

function createColorBucketMask(
  color: Uint8Array,
  point: DrawingPoint,
) {
  const seedX = Math.floor(point.x)
  const seedY = CANVAS_SIZE - 1 - Math.floor(point.y)
  const seedPixel = seedY * CANVAS_SIZE + seedX
  const seedOffset = seedPixel * 4
  const mask = new Uint8Array(CANVAS_PIXEL_COUNT)

  const seedRed = color[seedOffset] ?? 0
  const seedGreen = color[seedOffset + 1] ?? 0
  const seedBlue = color[seedOffset + 2] ?? 0
  const matchesSeedColor = (pixel: number) => {
    const offset = pixel * 4
    return color[offset] === seedRed
      && color[offset + 1] === seedGreen
      && color[offset + 2] === seedBlue
  }
  if (!matchesSeedColor(seedPixel)) return null

  const queue = new Uint32Array(CANVAS_PIXEL_COUNT)
  let queueStart = 0
  let queueEnd = 1
  mask[seedPixel] = 255
  queue[0] = seedPixel

  while (queueStart < queueEnd) {
    const pixel = queue[queueStart] ?? 0
    queueStart += 1
    const x = pixel % CANVAS_SIZE
    const enqueue = (neighbor: number) => {
      if (mask[neighbor] !== 0 || !matchesSeedColor(neighbor)) return
      mask[neighbor] = 255
      queue[queueEnd] = neighbor
      queueEnd += 1
    }
    if (x > 0) enqueue(pixel - 1)
    if (x < CANVAS_SIZE - 1) enqueue(pixel + 1)
    if (pixel >= CANVAS_SIZE) enqueue(pixel - CANVAS_SIZE)
    if (pixel + CANVAS_SIZE < CANVAS_PIXEL_COUNT) enqueue(pixel + CANVAS_SIZE)
  }

  return mask
}

function getStrokeId(metadata: Uint8Array, offset: number) {
  return (metadata[offset] ?? 0)
    + (metadata[offset + 1] ?? 0) * 0x100
    + ((metadata[offset + 2] ?? 0) & 0x0F) * 0x10000
}

export class CanvasDrawingRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly canvasExportTarget: THREE.WebGLRenderTarget
  private readonly history: CanvasTextureHistory
  private readonly textureCopy: CanvasTextureCopy
  private readonly oilSurface: CanvasOilSurface
  private readonly overrideEdgeDistanceTarget: THREE.WebGLRenderTarget
  private readonly mergedEdgeDistanceTarget: THREE.WebGLRenderTarget
  private readonly bucketSourceMetadataTarget: THREE.WebGLRenderTarget
  private readonly metadataMaterial: THREE.ShaderMaterial
  private readonly colorMaterial: THREE.ShaderMaterial
  private readonly drawingStateMaterialA: THREE.ShaderMaterial
  private readonly drawingStateMaterialB: THREE.ShaderMaterial
  private readonly drawingStateMaterialC: THREE.ShaderMaterial
  private readonly overrideEdgeDistanceMaterial: THREE.ShaderMaterial
  private readonly squareStrokeCapMaterial: THREE.ShaderMaterial
  private readonly bucketFillMaterial: THREE.ShaderMaterial
  private readonly emptyBucketMaskTexture: THREE.DataTexture
  private readonly brushMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly brushScene: THREE.Scene
  private readonly brushCamera: THREE.OrthographicCamera
  private readonly canvasDisplay: CanvasDisplay
  private debugMode = false
  private debugField = DEFAULT_TEXTURE_DEBUG_FIELD
  private squareStrokeDistanceCaps: SquareStrokeDistanceCaps | null = null
  private oilSurfaceMapsDirty = true
  private disposed = false

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    const context = this.renderer.getContext()
    if (
      !context.getExtension('EXT_color_buffer_float')
      || !context.getExtension('EXT_float_blend')
    ) {
      this.renderer.dispose()
      throw new Error('This WebGL device does not support 16-bit floating-point texture blending.')
    }
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(CANVAS_SIZE, CANVAS_SIZE, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.setAttribute('aria-label', '1024×1024 Three.js キャンバス')
    container.appendChild(this.renderer.domElement)

    this.history = new CanvasTextureHistory((source, destination) => {
      this.copyTarget(source, destination)
    })
    this.textureCopy = new CanvasTextureCopy(this.renderer)
    this.oilSurface = new CanvasOilSurface(this.renderer)
    this.canvasExportTarget = createRenderTarget()
    this.canvasExportTarget.texture.colorSpace = THREE.SRGBColorSpace

    this.overrideEdgeDistanceTarget = createRenderTarget()
    this.mergedEdgeDistanceTarget = createRenderTarget()
    this.bucketSourceMetadataTarget = createRenderTarget()

    this.metadataMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uStrokeId: { value: 0 },
        uSegmentId: { value: 0 },
        uFollowDirection: { value: 0 },
        uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushMetadataFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.colorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...createMetadataMatchUniforms(this.metadataTarget.texture),
        uColor: { value: new THREE.Color('#000000') },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushColorFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.drawingStateMaterialA = new THREE.ShaderMaterial({
      uniforms: {
        ...createMetadataMatchUniforms(this.metadataTarget.texture),
        uEnd: { value: new THREE.Vector2() },
        uShape: { value: 0 },
        uPaintStyleId: { value: 0 },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushStateAFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.drawingStateMaterialB = new THREE.ShaderMaterial({
      uniforms: {
        ...createMetadataMatchUniforms(this.metadataTarget.texture),
        uVelocity: { value: new THREE.Vector2() },
        uAcceleration: { value: new THREE.Vector2() },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushStateBFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.drawingStateMaterialC = new THREE.ShaderMaterial({
      uniforms: {
        ...createMetadataMatchUniforms(this.metadataTarget.texture),
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uFollowDirection: { value: 0 },
        uOverridePass: { value: 0 },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushStrokeDistanceFragmentShader,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.overrideEdgeDistanceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...createMetadataMatchUniforms(this.metadataTarget.texture),
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uFollowDirection: { value: 0 },
        uOverridePass: { value: 1 },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushStrokeDistanceFragmentShader,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.squareStrokeCapMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uEndpoint: { value: new THREE.Vector2() },
        uDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uFollowDirection: { value: 0 },
        uStartCap: { value: 0 },
        uOverridePass: { value: 0 },
        uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
      },
      vertexShader: brushVertexShader,
      fragmentShader: squareBrushStrokeCapFragmentShader,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const emptyMaskTexture = new THREE.DataTexture(
      new Uint8Array([0]),
      1,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    )
    emptyMaskTexture.minFilter = THREE.NearestFilter
    emptyMaskTexture.magFilter = THREE.NearestFilter
    emptyMaskTexture.colorSpace = THREE.NoColorSpace
    emptyMaskTexture.needsUpdate = true
    this.emptyBucketMaskTexture = emptyMaskTexture
    this.bucketFillMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMask: { value: emptyMaskTexture },
        uMetadata: { value: this.metadataTarget.texture },
        uStrokeId: { value: new THREE.Vector3() },
        uUseStrokeId: { value: 0 },
        uWriteMetadata: { value: 0 },
        uValue: { value: new THREE.Vector4() },
      },
      vertexShader: bucketFillVertexShader,
      fragmentShader: bucketFillFragmentShader,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    this.brushMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.metadataMaterial)
    this.brushMesh.frustumCulled = false
    this.brushScene = new THREE.Scene()
    this.brushScene.add(this.brushMesh)
    this.brushCamera = new THREE.OrthographicCamera(0, CANVAS_SIZE, 0, CANVAS_SIZE, 0.1, 10)
    this.brushCamera.position.z = 2

    this.canvasDisplay = new CanvasDisplay(
      this.colorTarget.texture,
      this.oilSurface.normalTarget.texture,
      this.oilSurface.depthTarget.texture,
      this.metadataTarget.texture,
      this.debugField,
    )

    this.clearTarget(this.metadataTarget, '#000000', 0)
    this.clearTarget(this.colorTarget, '#FFFFFF', 1)
    this.clearTarget(this.drawingStateTargetA, '#000000', 0)
    this.clearTarget(
      this.drawingStateTargetB,
      new THREE.Color().setRGB(128 / 255, 128 / 255, 128 / 255),
      1,
    )
    this.clearTarget(this.drawingStateTargetC, '#000000', 0)
    this.renderOutput()
  }

  private get metadataTarget() {
    return this.history.currentTargets[0]
  }

  private get colorTarget() {
    return this.history.currentTargets[1]
  }

  private get drawingStateTargetA() {
    return this.history.currentTargets[2]
  }

  private get drawingStateTargetB() {
    return this.history.currentTargets[3]
  }

  private get drawingStateTargetC() {
    return this.history.currentTargets[4]
  }

  setDebugField(field: TextureDebugField) {
    if (this.disposed || this.debugField === field) return
    this.debugField = field
    this.canvasDisplay.updateTextures(
      this.colorTarget.texture,
      this.getDisplayTextureTargets(),
      field,
    )
    if (this.debugMode) this.renderOutput()
  }

  setDebugMode(enabled: boolean) {
    if (this.disposed || this.debugMode === enabled) return
    this.debugMode = enabled
    this.renderOutput()
  }

  exportProjectTextures(): CanvasProjectTextures {
    if (this.disposed) throw new Error('Cannot export project textures after the renderer is disposed.')
    return {
      metadata: this.readTargetPixels(this.metadataTarget),
      color: this.readTargetPixels(this.colorTarget),
      drawingStateA: this.readTargetPixels(this.drawingStateTargetA),
      drawingStateB: this.readTargetPixels(this.drawingStateTargetB),
      drawingStateC: this.readTargetPixels(this.drawingStateTargetC),
    }
  }

  importProjectTextures(textures: CanvasProjectTextures) {
    if (this.disposed) throw new Error('Cannot load project textures after the renderer is disposed.')

    const pixels = [
      textures.metadata,
      textures.color,
      textures.drawingStateA,
      textures.drawingStateB,
      textures.drawingStateC,
    ]
    this.history.replaceCurrentTargets((targets) => {
      for (let index = 0; index < targets.length; index += 1) {
        const data = pixels[index]
        const target = targets[index]
        if (!data || !target) throw new Error('A project texture is missing.')
        const texture = new THREE.DataTexture(
          data,
          CANVAS_SIZE,
          CANVAS_SIZE,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        )
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.generateMipmaps = false
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true
        try {
          this.textureCopy.copyTexture(texture, target)
        } finally {
          texture.dispose()
        }
      }
      return getMaximumStrokeId(textures.metadata)
    })
    this.clearTarget(this.overrideEdgeDistanceTarget, '#000000', 0)
    this.oilSurfaceMapsDirty = true
    this.squareStrokeDistanceCaps = null
    this.renderOutput()
  }

  resetCanvas() {
    if (this.disposed) throw new Error('Cannot reset the canvas after the renderer is disposed.')

    this.history.replaceCurrentTargets((targets) => {
      const [metadata, color, drawingStateA, drawingStateB, drawingStateC] = targets
      if (!metadata || !color || !drawingStateA || !drawingStateB || !drawingStateC) {
        throw new Error('The canvas texture targets are unavailable.')
      }

      this.clearTarget(metadata, '#000000', 0)
      this.clearTarget(color, '#FFFFFF', 1)
      this.clearTarget(drawingStateA, '#000000', 0)
      this.clearTarget(
        drawingStateB,
        new THREE.Color().setRGB(128 / 255, 128 / 255, 128 / 255),
        1,
      )
      this.clearTarget(drawingStateC, '#000000', 0)
      return 0
    })
    this.clearTarget(this.overrideEdgeDistanceTarget, '#000000', 0)
    this.oilSurfaceMapsDirty = true
    this.squareStrokeDistanceCaps = null
    this.renderOutput()
  }

  async exportCanvas(filename: string) {
    if (this.disposed) throw new Error('Cannot export the canvas after the renderer is disposed.')

    this.updateDisplayedTextures()
    const output = this.canvasDisplay.getOutput(this.debugMode)
    await exportCanvasImage(
      this.renderer,
      this.canvasExportTarget,
      output.scene,
      output.camera,
      () => this.renderOutput(),
      filename,
    )
  }

  sampleColor(point: DrawingPoint): string {
    if (
      !Number.isFinite(point.x)
      || !Number.isFinite(point.y)
      || point.x < 0
      || point.y < 0
      || point.x >= CANVAS_SIZE
      || point.y >= CANVAS_SIZE
    ) {
      throw new RangeError('The color sample point is outside the canvas.')
    }

    const pixel = new Uint8Array(4)
    this.renderer.readRenderTargetPixels(
      this.colorTarget,
      Math.floor(point.x),
      CANVAS_SIZE - 1 - Math.floor(point.y),
      1,
      1,
      pixel,
    )
    const linearToSrgb = (channel: number) => {
      const linear = channel / 255
      const srgb = linear <= 0.0031308
        ? linear * 12.92
        : 1.055 * linear ** (1 / 2.4) - 0.055
      return Math.round(Math.min(1, Math.max(0, srgb)) * 255)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${linearToSrgb(pixel[0] ?? 0)}${linearToSrgb(pixel[1] ?? 0)}${linearToSrgb(pixel[2] ?? 0)}`
  }

  beginStroke(): number | null {
    if (this.disposed) return null
    const strokeId = this.history.beginStroke()
    if (strokeId === null) return null
    this.clearTarget(this.overrideEdgeDistanceTarget, '#000000', 0)
    this.squareStrokeDistanceCaps = null
    return strokeId
  }

  endStroke(): CanvasHistoryState {
    this.renderSquareStrokeDistanceCaps()
    this.renderOutput()
    this.squareStrokeDistanceCaps = null
    return this.history.endStroke()
  }

  undo(): CanvasHistoryState {
    const state = this.history.undo()
    this.oilSurfaceMapsDirty = true
    this.renderOutput()
    return state
  }

  redo(): CanvasHistoryState {
    const state = this.history.redo()
    this.oilSurfaceMapsDirty = true
    this.renderOutput()
    return state
  }

  getHistoryState(): CanvasHistoryState {
    return this.history.getHistoryState()
  }

  drawFrame(
    segments: readonly DrawingSegment[],
    style: BrushStrokeStyle,
    strokeId: number,
    startingSegmentId: number,
  ) {
    if (this.disposed || segments.length === 0) return 0
    const processedSegmentCount = this.renderFrame(
      segments,
      style,
      strokeId,
      startingSegmentId,
    )
    if (processedSegmentCount > 0) this.history.markDrawing(strokeId)
    return processedSegmentCount
  }

  fillBucket(point: DrawingPoint, color: string, mode: BucketFillMode) {
    if (this.disposed) throw new Error('Cannot fill the canvas after the renderer is disposed.')
    if (
      !Number.isFinite(point.x)
      || !Number.isFinite(point.y)
      || point.x < 0
      || point.y < 0
      || point.x >= CANVAS_SIZE
      || point.y >= CANVAS_SIZE
    ) {
      return this.history.getHistoryState()
    }

    const seedX = Math.floor(point.x)
    const seedY = CANVAS_SIZE - 1 - Math.floor(point.y)
    const seedMetadata = this.readTargetPixel(this.metadataTarget, seedX, seedY)
    const seedStrokeId = getStrokeId(seedMetadata, 0)
    const maskData = mode === 'color'
      ? createColorBucketMask(this.readTargetPixels(this.colorTarget), point)
      : null
    if (mode === 'color' && !maskData) return this.history.getHistoryState()

    this.textureCopy.copy(this.metadataTarget, this.bucketSourceMetadataTarget)
    const historyStrokeId = this.history.beginStroke()
    if (historyStrokeId === null) return this.history.getHistoryState()

    const previousAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(false)
    let maskTexture: THREE.DataTexture | null = null
    let strokeEnded = false
    try {
      if (maskData) {
        maskTexture = new THREE.DataTexture(
          maskData,
          CANVAS_SIZE,
          CANVAS_SIZE,
          THREE.RedFormat,
          THREE.UnsignedByteType,
        )
        maskTexture.minFilter = THREE.NearestFilter
        maskTexture.magFilter = THREE.NearestFilter
        maskTexture.generateMipmaps = false
        maskTexture.colorSpace = THREE.NoColorSpace
        maskTexture.needsUpdate = true
        this.bucketFillMaterial.uniforms.uMask.value = maskTexture
      }
      this.bucketFillMaterial.uniforms.uMetadata.value =
        this.bucketSourceMetadataTarget.texture
      this.bucketFillMaterial.uniforms.uUseStrokeId.value = mode === 'stroke' ? 1 : 0
      this.bucketFillMaterial.uniforms.uStrokeId.value.set(
        seedStrokeId % 256,
        Math.floor(seedStrokeId / 256) % 256,
        Math.floor(seedStrokeId / 65536) % 16,
      )

      const targets = this.history.currentTargets
      const fillTargets = [targets[0], targets[1]]
      const values = [
        encodeStrokeMetadata(historyStrokeId),
        encodeColor(color),
      ]
      for (let index = 0; index < fillTargets.length; index += 1) {
        const target = fillTargets[index]
        const value = values[index]
        if (!target || !value) throw new Error('A bucket-fill render target is missing.')
        this.bucketFillMaterial.uniforms.uValue.value.copy(value)
        this.bucketFillMaterial.uniforms.uWriteMetadata.value = index === 0 ? 1 : 0
        this.brushMesh.material = this.bucketFillMaterial
        this.brushMesh.position.set(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0)
        this.brushMesh.scale.set(CANVAS_SIZE, CANVAS_SIZE, 1)
        this.renderer.setRenderTarget(target)
        this.renderer.render(this.brushScene, this.brushCamera)
      }
      this.bucketFillMaterial.uniforms.uWriteMetadata.value = 0
      this.history.markDrawing(historyStrokeId)
      this.oilSurfaceMapsDirty = true
      const state = this.history.endStroke()
      strokeEnded = true
      this.renderer.autoClear = previousAutoClear
      this.renderer.setScissorTest(false)
      this.renderer.setRenderTarget(null)
      this.renderOutput()
      return state
    } catch (error) {
      if (!strokeEnded) this.history.endStroke()
      throw error
    } finally {
      this.renderer.autoClear = previousAutoClear
      this.renderer.setScissorTest(false)
      this.renderer.setRenderTarget(null)
      maskTexture?.dispose()
      this.bucketFillMaterial.uniforms.uMask.value = this.emptyBucketMaskTexture
      this.bucketFillMaterial.uniforms.uUseStrokeId.value = 0
      this.bucketFillMaterial.uniforms.uWriteMetadata.value = 0
    }
  }

  private renderFrame(
    segments: readonly DrawingSegment[],
    style: BrushStrokeStyle,
    strokeId: number,
    startingSegmentId: number,
  ) {
    if (this.disposed || segments.length === 0) return 0
    this.updateDisplayedTextures()
    const previousAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(true)
    const brushSize = Math.min(
      MAX_BRUSH_SIZE,
      Math.max(1, style.size),
    )
    const shape = style.shape === 'round' ? 0 : style.shape === 'flat' ? 1 : 2
    const paintStyleId = style.eraserEnabled ? 0 : PAINT_STYLE_IDS[style.paintType]
    const followDirection = style.followDirection ? 1 : 0
    this.metadataMaterial.uniforms.uBrushSize.value = brushSize
    this.metadataMaterial.uniforms.uShape.value = shape
    this.metadataMaterial.uniforms.uStrokeId.value = strokeId
    this.metadataMaterial.uniforms.uFollowDirection.value = followDirection
    this.drawingStateMaterialA.uniforms.uShape.value = shape
    this.drawingStateMaterialA.uniforms.uPaintStyleId.value = paintStyleId
    this.drawingStateMaterialC.uniforms.uBrushSize.value = brushSize
    this.drawingStateMaterialC.uniforms.uShape.value = shape
    this.drawingStateMaterialC.uniforms.uFollowDirection.value = followDirection
    this.colorMaterial.uniforms.uColor.value.set(
      style.eraserEnabled ? '#FFFFFF' : style.color,
    )

    let processedSegmentCount = 0
    let surfaceBounds: DrawingBounds | null = null
    for (const segment of segments) {
      const segmentId = startingSegmentId + processedSegmentCount
      if (segmentId >= MAX_STROKE_SEGMENTS) break

      const bounds = this.setSegmentUniforms(
        segment.start,
        segment.end,
        brushSize,
        segment.previousDirection,
      )
      if (!bounds) continue
      surfaceBounds = unionDrawingBounds(surfaceBounds, bounds)

      this.updateSquareStrokeDistanceCaps(segment, brushSize, followDirection)
      this.metadataMaterial.uniforms.uSegmentId.value = segmentId
      for (const material of [
        this.colorMaterial,
        this.drawingStateMaterialA,
        this.drawingStateMaterialB,
        this.drawingStateMaterialC,
        this.overrideEdgeDistanceMaterial,
      ]) {
        material.uniforms.uStrokeId.value = strokeId
        material.uniforms.uSegmentId.value = segmentId
      }
      this.drawingStateMaterialA.uniforms.uEnd.value.copy(
        this.metadataMaterial.uniforms.uEnd.value,
      )
      this.drawingStateMaterialB.uniforms.uVelocity.value.set(
        segment.velocity?.x ?? segment.end.x - segment.start.x,
        segment.velocity?.y ?? segment.end.y - segment.start.y,
      )
      this.drawingStateMaterialB.uniforms.uAcceleration.value.set(
        segment.acceleration?.x
          ?? segment.end.x - segment.start.x - (segment.previousDirection?.x ?? 0),
        segment.acceleration?.y
          ?? segment.end.y - segment.start.y - (segment.previousDirection?.y ?? 0),
      )
      this.drawingStateMaterialC.uniforms.uStart.value.copy(
        this.metadataMaterial.uniforms.uStart.value,
      )
      this.drawingStateMaterialC.uniforms.uEnd.value.copy(
        this.metadataMaterial.uniforms.uEnd.value,
      )
      this.drawingStateMaterialC.uniforms.uPreviousDirection.value.copy(
        this.metadataMaterial.uniforms.uPreviousDirection.value,
      )
      for (const material of [
        this.drawingStateMaterialC,
        this.overrideEdgeDistanceMaterial,
      ]) {
        material.uniforms.uStrokeId.value = strokeId
        material.uniforms.uSegmentId.value = segmentId
        material.uniforms.uStart.value.copy(this.metadataMaterial.uniforms.uStart.value)
        material.uniforms.uEnd.value.copy(this.metadataMaterial.uniforms.uEnd.value)
        material.uniforms.uPreviousDirection.value.copy(
          this.metadataMaterial.uniforms.uPreviousDirection.value,
        )
        material.uniforms.uBrushSize.value = brushSize
        material.uniforms.uShape.value = shape
        material.uniforms.uFollowDirection.value = followDirection
      }
      this.renderSegmentPass(this.metadataTarget, this.metadataMaterial)
      this.renderSegmentPass(this.drawingStateTargetA, this.drawingStateMaterialA)
      this.renderSegmentPass(this.drawingStateTargetB, this.drawingStateMaterialB)
      this.renderSegmentPass(this.drawingStateTargetC, this.drawingStateMaterialC)
      this.renderSegmentPass(this.overrideEdgeDistanceTarget, this.overrideEdgeDistanceMaterial)
      this.mergeStrokeOverrideEdgeDistance(bounds)
      this.renderSegmentPass(this.colorTarget, this.colorMaterial)
      processedSegmentCount += 1
    }

    if (processedSegmentCount > 0 && surfaceBounds) {
      this.oilSurfaceMapsDirty = true
      this.updateOilSurfaceMaps(surfaceBounds)
    }
    this.renderer.setScissorTest(false)
    this.renderer.autoClear = previousAutoClear
    this.renderOutput()
    return processedSegmentCount
  }

  private updateSquareStrokeDistanceCaps(
    segment: DrawingSegment,
    brushSize: number,
    followDirection: number,
  ) {
    if (this.drawingStateMaterialC.uniforms.uShape.value !== 2) return

    const direction = {
      x: segment.end.x - segment.start.x,
      y: segment.end.y - segment.start.y,
    }
    const hasDirection = direction.x !== 0 || direction.y !== 0
    const existing = this.squareStrokeDistanceCaps
    if (!existing) {
      this.squareStrokeDistanceCaps = {
        start: { ...segment.start },
        startDirection: hasDirection ? direction : null,
        startBrushSize: brushSize,
        startFollowDirection: followDirection,
        end: { ...segment.end },
        endDirection: hasDirection ? direction : null,
        endBrushSize: brushSize,
        endFollowDirection: followDirection,
      }
      return
    }

    if (!existing.startDirection && hasDirection) {
      existing.startDirection = direction
    }
    existing.end = { ...segment.end }
    if (hasDirection) existing.endDirection = direction
    existing.endBrushSize = brushSize
    existing.endFollowDirection = followDirection
  }

  private renderSquareStrokeDistanceCaps() {
    const caps = this.squareStrokeDistanceCaps
    if (!caps) return

    const previousAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(true)
    const renderCap = (
      endpoint: DrawingPoint,
      direction: DrawingPoint | null,
      brushSize: number,
      followDirection: number,
      isStart: boolean,
    ) => {
      const uniforms = this.squareStrokeCapMaterial.uniforms
      uniforms.uEndpoint.value.set(endpoint.x, endpoint.y)
      uniforms.uDirection.value.set(direction?.x ?? 0, direction?.y ?? 0)
      uniforms.uBrushSize.value = brushSize
      uniforms.uFollowDirection.value = followDirection
      uniforms.uStartCap.value = isStart ? 1 : 0
      const bounds = this.setSegmentUniforms(endpoint, endpoint, brushSize, direction)
      if (!bounds) return
      uniforms.uOverridePass.value = 0
      this.renderSegmentPass(this.drawingStateTargetC, this.squareStrokeCapMaterial)
      uniforms.uOverridePass.value = 1
      this.renderSegmentPass(this.overrideEdgeDistanceTarget, this.squareStrokeCapMaterial)
      this.mergeStrokeOverrideEdgeDistance(bounds)
    }

    renderCap(
      caps.start,
      caps.startDirection,
      caps.startBrushSize,
      caps.startFollowDirection,
      true,
    )
    renderCap(
      caps.end,
      caps.endDirection,
      caps.endBrushSize,
      caps.endFollowDirection,
      false,
    )
    this.renderer.setScissorTest(false)
    this.renderer.autoClear = previousAutoClear
  }

  private mergeStrokeOverrideEdgeDistance(bounds: DrawingBounds) {
    this.textureCopy.mergeOverrideDistance(
      this.drawingStateTargetC,
      this.overrideEdgeDistanceTarget,
      this.mergedEdgeDistanceTarget,
      this.drawingStateTargetC,
      bounds,
    )
    this.oilSurfaceMapsDirty = true
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.history.dispose()
    this.brushScene.remove(this.brushMesh)
    this.brushMesh.geometry.dispose()
    this.textureCopy.dispose()
    this.oilSurface.dispose()
    this.canvasDisplay.dispose()
    this.overrideEdgeDistanceMaterial.dispose()
    this.overrideEdgeDistanceTarget.dispose()
    this.mergedEdgeDistanceTarget.dispose()
    this.bucketSourceMetadataTarget.dispose()
    this.metadataMaterial.dispose()
    this.colorMaterial.dispose()
    this.drawingStateMaterialA.dispose()
    this.drawingStateMaterialB.dispose()
    this.drawingStateMaterialC.dispose()
    this.squareStrokeCapMaterial.dispose()
    this.emptyBucketMaskTexture.dispose()
    this.bucketFillMaterial.dispose()
    this.canvasExportTarget.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private copyTarget(source: THREE.WebGLRenderTarget, destination: THREE.WebGLRenderTarget) {
    this.textureCopy.copy(source, destination)
  }

  private readTargetPixels(target: THREE.WebGLRenderTarget) {
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
  }

  private readTargetPixel(target: THREE.WebGLRenderTarget, x: number, y: number) {
    const pixel = new Uint8Array(4)
    this.renderer.readRenderTargetPixels(target, x, y, 1, 1, pixel)
    return pixel
  }

  private clearTarget(target: THREE.WebGLRenderTarget, color: THREE.ColorRepresentation, alpha: number) {
    this.renderer.setRenderTarget(target)
    this.renderer.setScissorTest(false)
    this.renderer.setClearColor(color, alpha)
    this.renderer.clear(true, false, false)
  }

  private renderOutput() {
    this.updateDisplayedTextures()
    if (this.oilSurfaceMapsDirty) this.updateOilSurfaceMaps()
    this.renderer.setRenderTarget(null)
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const output = this.canvasDisplay.getOutput(this.debugMode)
    this.renderer.render(output.scene, output.camera)
  }

  private updateDisplayedTextures() {
    for (const material of [
      this.colorMaterial,
      this.drawingStateMaterialA,
      this.drawingStateMaterialB,
      this.drawingStateMaterialC,
      this.overrideEdgeDistanceMaterial,
    ]) {
      material.uniforms.uMetadataTexture.value = this.metadataTarget.texture
    }
    this.canvasDisplay.updateTextures(
      this.colorTarget.texture,
      this.getDisplayTextureTargets(),
      this.debugField,
    )
  }

  private getDisplayTextureTargets(): DisplayTextureTargets {
    return {
      metadata: this.metadataTarget,
      color: this.colorTarget,
      'drawing-state-a': this.drawingStateTargetA,
      'drawing-state-b': this.drawingStateTargetB,
      'drawing-state-c': this.drawingStateTargetC,
      'oil-depth': this.oilSurface.depthTarget,
      'oil-normal': this.oilSurface.normalTarget,
    }
  }

  private updateOilSurfaceMaps(bounds?: DrawingBounds) {
    this.oilSurface.update(this.drawingStateTargetA, this.drawingStateTargetC, bounds)
    this.oilSurfaceMapsDirty = false
  }

  private setSegmentUniforms(
    start: DrawingPoint,
    end: DrawingPoint,
    brushSize: number,
    previousDirection: DrawingPoint | null,
  ): DrawingBounds | null {
    const boundsPadding = Math.ceil(brushSize) + 2
    const left = Math.max(0, Math.floor(Math.min(start.x, end.x) - boundsPadding))
    const right = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.x, end.x) + boundsPadding))
    const top = Math.max(0, Math.floor(Math.min(start.y, end.y) - boundsPadding))
    const bottom = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.y, end.y) + boundsPadding))
    if (right <= left || bottom <= top) return null

    this.metadataMaterial.uniforms.uStart.value.set(start.x, start.y)
    this.metadataMaterial.uniforms.uEnd.value.set(end.x, end.y)
    this.metadataMaterial.uniforms.uPreviousDirection.value.set(
      previousDirection?.x ?? 0,
      previousDirection?.y ?? 0,
    )
    this.brushMesh.position.set((left + right) / 2, (top + bottom) / 2, 0)
    this.brushMesh.scale.set(right - left, bottom - top, 1)
    this.renderer.setScissor(left, CANVAS_SIZE - bottom, right - left, bottom - top)
    return { left, right, top, bottom }
  }

  private renderSegmentPass(
    target: THREE.WebGLRenderTarget,
    material: THREE.ShaderMaterial,
  ) {
    this.brushMesh.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.brushScene, this.brushCamera)
  }
}
