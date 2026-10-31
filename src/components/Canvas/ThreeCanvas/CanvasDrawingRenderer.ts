import * as THREE from 'three'
import type { BrushStrokeStyle, DrawingPoint, DrawingSegment } from '../../../types'
import { brushFragmentShader, brushVertexShader } from './CanvasDrawingShader'

export const CANVAS_SIZE = 1024

export class CanvasDrawingRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly target: THREE.WebGLRenderTarget
  private readonly brushMaterial: THREE.ShaderMaterial
  private readonly brushMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly brushScene: THREE.Scene
  private readonly brushCamera: THREE.OrthographicCamera
  private readonly displayScene: THREE.Scene
  private readonly displayCamera: THREE.OrthographicCamera
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

    this.target = new THREE.WebGLRenderTarget(CANVAS_SIZE, CANVAS_SIZE, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    })
    this.target.texture.generateMipmaps = false
    this.target.texture.colorSpace = THREE.NoColorSpace

    this.brushMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uStart: { value: new THREE.Vector2() },
        uEnd: { value: new THREE.Vector2() },
        uPreviousDirection: { value: new THREE.Vector2() },
        uBrushSize: { value: 1 },
        uShape: { value: 0 },
        uFollowDirection: { value: 0 },
        uColor: { value: new THREE.Color('#000000') },
        uResolution: { value: new THREE.Vector2(CANVAS_SIZE, CANVAS_SIZE) },
      },
      vertexShader: brushVertexShader,
      fragmentShader: brushFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.brushMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.brushMaterial)
    this.brushMesh.frustumCulled = false
    this.brushScene = new THREE.Scene()
    this.brushScene.add(this.brushMesh)
    this.brushCamera = new THREE.OrthographicCamera(0, CANVAS_SIZE, 0, CANVAS_SIZE, 0.1, 10)
    this.brushCamera.position.z = 2

    const displayGeometry = new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE)
    const displayMaterial = new THREE.MeshBasicMaterial({ map: this.target.texture })
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

    this.renderer.setClearColor('#FFFFFF', 1)
    this.renderer.setRenderTarget(this.target)
    this.renderer.clear(true, false, false)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.displayScene, this.displayCamera)
  }

  drawFrame(segments: readonly DrawingSegment[], style: BrushStrokeStyle) {
    if (this.disposed || segments.length === 0) return

    const previousAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setRenderTarget(this.target)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(true)
    this.brushMaterial.uniforms.uBrushSize.value = Math.max(1, style.size)
    this.brushMaterial.uniforms.uShape.value =
      style.shape === 'round' ? 0 : style.shape === 'flat' ? 1 : 2
    this.brushMaterial.uniforms.uFollowDirection.value = style.followDirection ? 1 : 0
    this.brushMaterial.uniforms.uColor.value.set(style.eraserEnabled ? '#FFFFFF' : style.color)

    for (const segment of segments) {
      this.renderSegment(
        segment.start,
        segment.end,
        style.size,
        segment.previousDirection,
      )
    }

    this.renderer.setScissorTest(false)
    this.renderer.setRenderTarget(null)
    this.renderer.autoClear = previousAutoClear
    this.renderer.render(this.displayScene, this.displayCamera)
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
    this.target.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private renderSegment(
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
    this.brushMesh.position.set((left + right) / 2, (top + bottom) / 2, 0)
    this.brushMesh.scale.set(right - left, bottom - top, 1)
    this.renderer.setScissor(left, CANVAS_SIZE - bottom, right - left, bottom - top)
    this.renderer.render(this.brushScene, this.brushCamera)
  }
}
