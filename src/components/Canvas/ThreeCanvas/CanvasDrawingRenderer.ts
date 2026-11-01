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
import { exportTextureTargets } from './CanvasTextureExport'
import { exportCanvasImage } from './CanvasImageExport'
import { CANVAS_SIZE, MAX_STROKE_SEGMENTS } from './CanvasConstants'
import {
  DEFAULT_TEXTURE_DEBUG_FIELD,
  getTextureDebugField,
  type TextureDebugField,
  type TextureDebugSource,
} from './TextureDebugFields'
import { CanvasTextureHistory, createRenderTarget } from './CanvasTextureHistory'
import type { CanvasHistoryState } from './CanvasTextureHistory'

export { CANVAS_SIZE } from './CanvasConstants'
export type { CanvasHistoryState } from './CanvasTextureHistory'

const MAX_BRUSH_SIZE = 63

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
  private readonly history: CanvasTextureHistory
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

    this.history = new CanvasTextureHistory((source, destination) => {
      this.copyTarget(source, destination)
    })
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

    await exportTextureTargets(this.renderer, [
      this.metadataTarget,
      this.colorTarget,
      this.drawingStateTargetA,
      this.drawingStateTargetB,
    ])
  }

  async exportCanvas() {
    if (this.disposed) throw new Error('Cannot export the canvas after the renderer is disposed.')

    this.updateDisplayedTextures()
    await exportCanvasImage(
      this.renderer,
      this.canvasExportTarget,
      this.debugMode ? this.debugScene : this.displayScene,
      this.debugMode ? this.debugCamera : this.displayCamera,
      () => this.renderOutput(),
    )
  }

  beginStroke(): number | null {
    if (this.disposed) return null
    return this.history.beginStroke()
  }

  endStroke(): CanvasHistoryState {
    return this.history.endStroke()
  }

  undo(): CanvasHistoryState {
    const state = this.history.undo()
    this.renderOutput()
    return state
  }

  redo(): CanvasHistoryState {
    const state = this.history.redo()
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
    this.history.dispose()
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
