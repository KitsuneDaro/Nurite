import * as THREE from 'three'
import { CANVAS_SIZE } from '../CanvasConstants'
import type { DrawingBounds } from './DrawingBounds'

export class CanvasTextureCopy {
  private readonly renderer: THREE.WebGLRenderer
  private readonly material: THREE.ShaderMaterial
  private readonly scene: THREE.Scene
  private readonly camera: THREE.OrthographicCamera

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSource: { value: null },
        uOverrideTexture: { value: null },
        uMergeOverride: { value: 0 },
      },
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
        uniform sampler2D uOverrideTexture;
        uniform float uMergeOverride;
        void main() {
          vec4 source = texture2D(uSource, vUv);
          if (uMergeOverride > 0.5) {
            vec2 overrideDistance = texture2D(uOverrideTexture, vUv).rg;
            if (overrideDistance.g > 0.5) source.g = overrideDistance.r;
          }
          gl_FragColor = source;
        }
      `,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.scene = new THREE.Scene()
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material))
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this.camera.position.z = 2
  }

  copy(source: THREE.WebGLRenderTarget, destination: THREE.WebGLRenderTarget) {
    this.material.uniforms.uMergeOverride.value = 0
    this.material.uniforms.uSource.value = source.texture
    this.renderer.setRenderTarget(destination)
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(false)
    this.renderer.render(this.scene, this.camera)
  }

  mergeOverrideDistance(
    source: THREE.WebGLRenderTarget,
    override: THREE.WebGLRenderTarget,
    intermediate: THREE.WebGLRenderTarget,
    destination: THREE.WebGLRenderTarget,
    bounds: DrawingBounds,
  ) {
    const uniforms = this.material.uniforms
    uniforms.uSource.value = source.texture
    uniforms.uOverrideTexture.value = override.texture
    uniforms.uMergeOverride.value = 1
    this.renderer.setViewport(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    this.renderer.setScissorTest(true)
    this.renderer.setScissor(
      bounds.left,
      CANVAS_SIZE - bounds.bottom,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
    )
    this.renderer.setRenderTarget(intermediate)
    this.renderer.render(this.scene, this.camera)
    uniforms.uMergeOverride.value = 0
    uniforms.uSource.value = intermediate.texture
    this.renderer.setRenderTarget(destination)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    this.material.dispose()
  }
}
