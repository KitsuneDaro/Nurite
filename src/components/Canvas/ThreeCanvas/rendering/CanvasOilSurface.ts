import * as THREE from 'three'
import { oilDepthFragmentShader, oilNormalFragmentShader } from '../shaders/OilSurfaceShader'
import { CANVAS_SIZE } from '../CanvasConstants'
import { createRenderTarget } from '../CanvasTextureHistory'
import type { DrawingBounds } from './DrawingBounds'
import { textureDebugVertexShader } from '../shaders/TextureDebugShader'

export class CanvasOilSurface {
  readonly depthTarget: THREE.WebGLRenderTarget
  readonly normalTarget: THREE.WebGLRenderTarget
  private readonly renderer: THREE.WebGLRenderer
  private readonly depthMaterial: THREE.ShaderMaterial
  private readonly normalMaterial: THREE.ShaderMaterial
  private readonly scene: THREE.Scene
  private readonly geometry: THREE.PlaneGeometry
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly camera: THREE.OrthographicCamera

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.depthTarget = createRenderTarget(THREE.HalfFloatType)
    this.normalTarget = createRenderTarget(THREE.HalfFloatType)
    this.depthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDrawingStateA: { value: null },
        uDrawingStateC: { value: null },
        uDepthScale: { value: 0.12 },
      },
      vertexShader: textureDebugVertexShader,
      fragmentShader: oilDepthFragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.normalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDepthTexture: { value: this.depthTarget.texture },
        uTexelSize: {
          value: new THREE.Vector2(1 / CANVAS_SIZE, 1 / CANVAS_SIZE),
        },
        uNormalStrength: { value: 3 },
      },
      vertexShader: textureDebugVertexShader,
      fragmentShader: oilNormalFragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.geometry = new THREE.PlaneGeometry(2, 2)
    this.mesh = new THREE.Mesh(this.geometry, this.depthMaterial)
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this.camera.position.z = 2
  }

  update(
    drawingStateA: THREE.WebGLRenderTarget,
    drawingStateC: THREE.WebGLRenderTarget,
    bounds?: DrawingBounds,
  ) {
    this.depthMaterial.uniforms.uDrawingStateA.value = drawingStateA.texture
    this.depthMaterial.uniforms.uDrawingStateC.value = drawingStateC.texture

    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(bounds !== undefined)
    if (bounds) {
      this.renderer.setScissor(
        bounds.left,
        CANVAS_SIZE - bounds.bottom,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
      )
    }
    this.mesh.material = this.depthMaterial
    this.renderer.setRenderTarget(this.depthTarget)
    this.renderer.render(this.scene, this.camera)

    if (bounds) {
      const padding = 1
      const left = Math.max(0, bounds.left - padding)
      const right = Math.min(CANVAS_SIZE, bounds.right + padding)
      const top = Math.max(0, bounds.top - padding)
      const bottom = Math.min(CANVAS_SIZE, bounds.bottom + padding)
      this.renderer.setScissor(left, CANVAS_SIZE - bottom, right - left, bottom - top)
    }
    this.mesh.material = this.normalMaterial
    this.renderer.setRenderTarget(this.normalTarget)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setScissorTest(false)
  }

  dispose() {
    this.depthMaterial.dispose()
    this.normalMaterial.dispose()
    this.depthTarget.dispose()
    this.normalTarget.dispose()
    this.geometry.dispose()
  }
}
