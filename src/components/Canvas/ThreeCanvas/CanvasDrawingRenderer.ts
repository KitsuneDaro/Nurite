import * as THREE from 'three'
import type { BrushStrokeStyle, DrawingPoint, DrawingSegment } from '../../../types'
import {
  brushColorFragmentShader,
  brushMetadataFragmentShader,
  brushStateAFragmentShader,
  brushStateBFragmentShader,
  brushVertexShader,
  textureDebugFragmentShader,
  textureDebugVertexShader,
} from './CanvasDrawingShader'
import { downloadBlob, downloadTextureArchive } from './CanvasTextureExport'
import { CANVAS_SIZE, MAX_STROKE_SEGMENTS } from './CanvasConstants'
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

const UNDO_LIMIT = 5
const HISTORY_SLOT_COUNT = UNDO_LIMIT + 1

export type CanvasHistoryState = {
  canUndo: boolean
  canRedo: boolean
}

type RenderTargetSet = [
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
]

type CanvasSnapshot = {
  strokeId: number
  targets: RenderTargetSet
}

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

function createRenderTargetSet(): RenderTargetSet {
  return [
    createRenderTarget(),
    createRenderTarget(),
    createRenderTarget(),
    createRenderTarget(),
  ]
}

function disposeRenderTargetSet(targets: RenderTargetSet) {
  targets.forEach((target) => target.dispose())
}

function createMetadataMatchUniforms(metadataTexture: THREE.Texture) {
  return {
    uStrokeId: { value: 0 },
    uSegmentId: { value: 0 },
    uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
    uMetadataTexture: { value: metadataTexture },
  }
}

export class CanvasDrawingRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly canvasExportTarget: THREE.WebGLRenderTarget
  private readonly snapshots: Array<CanvasSnapshot | null> =
    Array.from({ length: HISTORY_SLOT_COUNT }, () => null)
  private readonly copyMaterial: THREE.ShaderMaterial
  private readonly copyScene: THREE.Scene
  private readonly copyCamera: THREE.OrthographicCamera
  private readonly metadataMaterial: THREE.ShaderMaterial
  private readonly colorMaterial: THREE.ShaderMaterial
  private readonly drawingStateMaterialA: THREE.ShaderMaterial
  private readonly drawingStateMaterialB: THREE.ShaderMaterial
  private readonly brushMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly brushScene: THREE.Scene
  private readonly brushCamera: THREE.OrthographicCamera
  private readonly displayScene: THREE.Scene
  private readonly displayCamera: THREE.OrthographicCamera
  private readonly displayMaterial: THREE.MeshBasicMaterial
  private readonly debugScene: THREE.Scene
  private readonly debugCamera: THREE.OrthographicCamera
  private readonly debugMaterial: THREE.ShaderMaterial
  private debugMode = false
  private debugField = DEFAULT_TEXTURE_DEBUG_FIELD
  private disposed = false
  private currentStrokeId = 0
  private maxStrokeId = 0
  private activeStrokeId: number | null = null
  private activeStrokeHasDrawing = false

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

    this.snapshots[0] = { strokeId: 0, targets: createRenderTargetSet() }
    this.canvasExportTarget = createRenderTarget()
    this.canvasExportTarget.texture.colorSpace = THREE.SRGBColorSpace

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { uSource: { value: this.colorTarget.texture } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uSource;
        void main() {
          gl_FragColor = texture2D(uSource, vUv);
        }
      `,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.copyScene = new THREE.Scene()
    this.copyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial))
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this.copyCamera.position.z = 2

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
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uFollowDirection: { value: 0 },
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
    this.brushMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.metadataMaterial)
    this.brushMesh.frustumCulled = false
    this.brushScene = new THREE.Scene()
    this.brushScene.add(this.brushMesh)
    this.brushCamera = new THREE.OrthographicCamera(0, CANVAS_SIZE, 0, CANVAS_SIZE, 0.1, 10)
    this.brushCamera.position.z = 2

    const displayGeometry = new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE)
    this.displayMaterial = new THREE.MeshBasicMaterial({ map: this.colorTarget.texture })
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color('#FFFFFF')
    this.displayScene.add(new THREE.Mesh(displayGeometry, this.displayMaterial))
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

  private get metadataTarget() {
    return this.getCurrentTargets()[0]
  }

  private get colorTarget() {
    return this.getCurrentTargets()[1]
  }

  private get drawingStateTargetA() {
    return this.getCurrentTargets()[2]
  }

  private get drawingStateTargetB() {
    return this.getCurrentTargets()[3]
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

  async exportCanvas() {
    if (this.disposed) throw new Error('Cannot export the canvas after the renderer is disposed.')

    this.updateDisplayedTextures()
    this.renderer.setRenderTarget(this.canvasExportTarget)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(false)
    this.renderer.clear(true, false, false)
    this.renderer.render(
      this.debugMode ? this.debugScene : this.displayScene,
      this.debugMode ? this.debugCamera : this.displayCamera,
    )
    const pixels = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * 4)
    this.renderer.readRenderTargetPixels(
      this.canvasExportTarget,
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
      pixels,
    )
    this.renderOutput()

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

  beginStroke(): number | null {
    if (this.disposed) return null
    if (this.activeStrokeId !== null) {
      throw new Error('Cannot begin a stroke before ending the active stroke.')
    }
    const strokeId = this.currentStrokeId + 1
    if (strokeId > 0xFFFFF) {
      console.error('Canvas drawing has reached the metadata texture stroke-ID limit.')
      return null
    }

    this.discardRedoHistory()
    this.saveSnapshot(strokeId)
    this.activeStrokeId = strokeId
    this.activeStrokeHasDrawing = false
    return strokeId
  }

  endStroke(): CanvasHistoryState {
    if (this.activeStrokeId === null) return this.getHistoryState()

    const strokeId = this.activeStrokeId
    this.activeStrokeId = null
    if (!this.activeStrokeHasDrawing) {
      this.disposeSnapshot(strokeId)
      this.activeStrokeHasDrawing = false
      return this.getHistoryState()
    }

    this.currentStrokeId = strokeId
    this.maxStrokeId = strokeId
    this.activeStrokeHasDrawing = false
    return this.getHistoryState()
  }

  undo(): CanvasHistoryState {
    if (this.activeStrokeId !== null) throw new Error('Cannot undo while a stroke is active.')
    const previousStrokeId = this.currentStrokeId - 1
    if (previousStrokeId < 0 || !this.hasSnapshot(previousStrokeId)) {
      return this.getHistoryState()
    }

    this.currentStrokeId = previousStrokeId
    this.renderOutput()
    return this.getHistoryState()
  }

  redo(): CanvasHistoryState {
    if (this.activeStrokeId !== null) throw new Error('Cannot redo while a stroke is active.')
    const nextStrokeId = this.currentStrokeId + 1
    if (nextStrokeId > this.maxStrokeId || !this.hasSnapshot(nextStrokeId)) {
      return this.getHistoryState()
    }

    this.currentStrokeId = nextStrokeId
    this.renderOutput()
    return this.getHistoryState()
  }

  getHistoryState(): CanvasHistoryState {
    return {
      canUndo: this.currentStrokeId > 0 && this.hasSnapshot(this.currentStrokeId - 1),
      canRedo: this.currentStrokeId < this.maxStrokeId
        && this.hasSnapshot(this.currentStrokeId + 1),
    }
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
    if (this.activeStrokeId === strokeId && processedSegmentCount > 0) {
      this.activeStrokeHasDrawing = true
    }
    return processedSegmentCount
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
    const followDirection = style.followDirection ? 1 : 0
    this.metadataMaterial.uniforms.uBrushSize.value = brushSize
    this.metadataMaterial.uniforms.uShape.value = shape
    this.metadataMaterial.uniforms.uStrokeId.value = strokeId
    this.metadataMaterial.uniforms.uFollowDirection.value = followDirection
    this.drawingStateMaterialA.uniforms.uBrushSize.value = brushSize
    this.drawingStateMaterialA.uniforms.uShape.value = shape
    this.drawingStateMaterialA.uniforms.uFollowDirection.value = followDirection
    this.colorMaterial.uniforms.uColor.value.set(
      style.eraserEnabled ? '#FFFFFF' : style.color,
    )

    let processedSegmentCount = 0
    for (const segment of segments) {
      const segmentId = startingSegmentId + processedSegmentCount
      if (segmentId >= MAX_STROKE_SEGMENTS) break

      if (!this.setSegmentUniforms(
        segment.start,
        segment.end,
        brushSize,
        segment.previousDirection,
      )) continue

      this.metadataMaterial.uniforms.uSegmentId.value = segmentId
      for (const material of [
        this.colorMaterial,
        this.drawingStateMaterialA,
        this.drawingStateMaterialB,
      ]) {
        material.uniforms.uStrokeId.value = strokeId
        material.uniforms.uSegmentId.value = segmentId
      }
      this.drawingStateMaterialA.uniforms.uStart.value.copy(
        this.metadataMaterial.uniforms.uStart.value,
      )
      this.drawingStateMaterialA.uniforms.uEnd.value.copy(
        this.metadataMaterial.uniforms.uEnd.value,
      )
      this.drawingStateMaterialA.uniforms.uPreviousDirection.value.copy(
        this.metadataMaterial.uniforms.uPreviousDirection.value,
      )
      this.drawingStateMaterialB.uniforms.uVelocity.value.set(
        segment.end.x - segment.start.x,
        segment.end.y - segment.start.y,
      )
      this.drawingStateMaterialB.uniforms.uAcceleration.value.set(
        segment.end.x - segment.start.x - (segment.previousDirection?.x ?? 0),
        segment.end.y - segment.start.y - (segment.previousDirection?.y ?? 0),
      )
      this.renderSegmentPass(this.metadataTarget, this.metadataMaterial)
      this.renderSegmentPass(this.drawingStateTargetA, this.drawingStateMaterialA)
      this.renderSegmentPass(this.drawingStateTargetB, this.drawingStateMaterialB)
      this.renderSegmentPass(this.colorTarget, this.colorMaterial)
      processedSegmentCount += 1
    }

    this.renderer.setScissorTest(false)
    this.renderer.autoClear = previousAutoClear
    this.renderOutput()
    return processedSegmentCount
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const snapshot of this.snapshots) {
      if (snapshot) disposeRenderTargetSet(snapshot.targets)
    }
    this.snapshots.fill(null)
    this.brushScene.remove(this.brushMesh)
    this.brushMesh.geometry.dispose()
    this.copyScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
    })
    this.copyMaterial.dispose()
    this.metadataMaterial.dispose()
    this.colorMaterial.dispose()
    this.drawingStateMaterialA.dispose()
    this.drawingStateMaterialB.dispose()
    this.displayScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
    this.canvasExportTarget.dispose()
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

  private saveSnapshot(strokeId: number) {
    const index = strokeId % HISTORY_SLOT_COUNT
    const previousSnapshot = this.snapshots[index]
    if (previousSnapshot) disposeRenderTargetSet(previousSnapshot.targets)
    this.snapshots[index] = null

    const targets = createRenderTargetSet()
    try {
      const currentTargets = this.getDrawingTargets()
      for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
        const source = currentTargets[targetIndex]
        const target = targets[targetIndex]
        if (!source || !target) throw new Error('A texture snapshot target is missing.')
        this.copyTarget(source, target)
      }
      this.snapshots[index] = { strokeId, targets }
    } catch (error) {
      disposeRenderTargetSet(targets)
      throw error
    }
  }

  private hasSnapshot(strokeId: number) {
    return this.snapshots[strokeId % HISTORY_SLOT_COUNT]?.strokeId === strokeId
  }

  private disposeSnapshot(strokeId: number) {
    const index = strokeId % HISTORY_SLOT_COUNT
    const snapshot = this.snapshots[index]
    if (!snapshot || snapshot.strokeId !== strokeId) return
    disposeRenderTargetSet(snapshot.targets)
    this.snapshots[index] = null
  }

  private discardRedoHistory() {
    for (let strokeId = this.currentStrokeId + 1; strokeId <= this.maxStrokeId; strokeId += 1) {
      this.disposeSnapshot(strokeId)
    }
    this.maxStrokeId = this.currentStrokeId
  }

  private getDrawingTargets(): RenderTargetSet {
    const strokeId = this.activeStrokeId ?? this.currentStrokeId
    const snapshot = this.snapshots[strokeId % HISTORY_SLOT_COUNT]
    if (!snapshot || snapshot.strokeId !== strokeId) {
      throw new Error(`The texture set for current stroke ${strokeId} is unavailable.`)
    }
    return snapshot.targets
  }

  private getCurrentTargets() {
    return this.getDrawingTargets()
  }

  private copyTarget(source: THREE.WebGLRenderTarget, destination: THREE.WebGLRenderTarget) {
    this.copyMaterial.uniforms.uSource.value = source.texture
    this.renderer.setRenderTarget(destination)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(false)
    this.renderer.render(this.copyScene, this.copyCamera)
  }

  private clearTarget(target: THREE.WebGLRenderTarget, color: THREE.ColorRepresentation, alpha: number) {
    this.renderer.setRenderTarget(target)
    this.renderer.setClearColor(color, alpha)
    this.renderer.clear(true, false, false)
  }

  private renderOutput() {
    this.updateDisplayedTextures()
    this.renderer.setRenderTarget(null)
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.render(
      this.debugMode ? this.debugScene : this.displayScene,
      this.debugMode ? this.debugCamera : this.displayCamera,
    )
  }

  private updateDisplayedTextures() {
    this.displayMaterial.map = this.colorTarget.texture
    for (const material of [
      this.colorMaterial,
      this.drawingStateMaterialA,
      this.drawingStateMaterialB,
    ]) {
      material.uniforms.uMetadataTexture.value = this.metadataTarget.texture
    }
    const targets: Record<TextureDebugSource, THREE.WebGLRenderTarget> = {
      metadata: this.metadataTarget,
      color: this.colorTarget,
      'drawing-state-a': this.drawingStateTargetA,
      'drawing-state-b': this.drawingStateTargetB,
    }
    this.debugMaterial.uniforms.uTexture.value =
      targets[getTextureDebugField(this.debugField).source].texture
  }

  private setSegmentUniforms(
    start: DrawingPoint,
    end: DrawingPoint,
    brushSize: number,
    previousDirection: DrawingPoint | null,
  ): boolean {
    const boundsPadding = Math.ceil(brushSize) + 2
    const left = Math.max(0, Math.floor(Math.min(start.x, end.x) - boundsPadding))
    const right = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.x, end.x) + boundsPadding))
    const top = Math.max(0, Math.floor(Math.min(start.y, end.y) - boundsPadding))
    const bottom = Math.min(CANVAS_SIZE, Math.ceil(Math.max(start.y, end.y) + boundsPadding))
    if (right <= left || bottom <= top) return false

    this.metadataMaterial.uniforms.uStart.value.set(start.x, start.y)
    this.metadataMaterial.uniforms.uEnd.value.set(end.x, end.y)
    this.metadataMaterial.uniforms.uPreviousDirection.value.set(
      previousDirection?.x ?? 0,
      previousDirection?.y ?? 0,
    )
    this.brushMesh.position.set((left + right) / 2, (top + bottom) / 2, 0)
    this.brushMesh.scale.set(right - left, bottom - top, 1)
    this.renderer.setScissor(left, CANVAS_SIZE - bottom, right - left, bottom - top)
    return true
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
