import * as THREE from 'three'
import { CANVAS_SIZE } from '../CanvasConstants'
import {
  getTextureDebugField,
  type TextureDebugField,
  type TextureDebugSource,
} from '../TextureDebugFields'
import {
  textureDebugFragmentShader,
  textureDebugVertexShader,
} from '../shaders/TextureDebugShader'

export type DisplayTextureTargets = Record<TextureDebugSource, THREE.WebGLRenderTarget>

export class CanvasDisplay {
  private readonly displayScene: THREE.Scene
  private readonly displayCamera: THREE.OrthographicCamera
  private readonly displayMaterial: THREE.MeshStandardMaterial
  private readonly debugScene: THREE.Scene
  private readonly debugCamera: THREE.OrthographicCamera
  private readonly debugMaterial: THREE.ShaderMaterial

  constructor(
    color: THREE.Texture,
    normal: THREE.Texture,
    roughness: THREE.Texture,
    metadata: THREE.Texture,
    debugField: TextureDebugField,
  ) {
    this.displayMaterial = new THREE.MeshStandardMaterial({
      map: color,
      normalMap: normal,
      roughnessMap: roughness,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color('#FFFFFF')
    this.displayScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE),
      this.displayMaterial,
    ))
    this.displayScene.add(new THREE.AmbientLight(0xFFFFFF, 0.7))
    const oilLight = new THREE.DirectionalLight(0xFFFFFF, 2.2)
    oilLight.position.set(-360, 460, 720)
    this.displayScene.add(oilLight)
    this.displayCamera = createCanvasCamera()

    this.debugScene = new THREE.Scene()
    this.debugScene.background = new THREE.Color('#10141c')
    this.debugCamera = createCanvasCamera()
    this.debugMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: metadata },
        uDebugField: { value: getTextureDebugField(debugField).mode },
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
  }

  updateTextures(color: THREE.Texture, targets: DisplayTextureTargets, field: TextureDebugField) {
    this.displayMaterial.map = color
    const definition = getTextureDebugField(field)
    this.debugMaterial.uniforms.uTexture.value = targets[definition.source].texture
    this.debugMaterial.uniforms.uDebugField.value = definition.mode
  }

  getOutput(debugMode: boolean) {
    return debugMode
      ? { scene: this.debugScene, camera: this.debugCamera }
      : { scene: this.displayScene, camera: this.displayCamera }
  }

  dispose() {
    disposeScene(this.displayScene)
    disposeScene(this.debugScene)
  }
}

function createCanvasCamera() {
  const camera = new THREE.OrthographicCamera(
    -CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    -CANVAS_SIZE / 2,
    0.1,
    10,
  )
  camera.position.z = 2
  return camera
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose())
    } else {
      object.material.dispose()
    }
  })
}
