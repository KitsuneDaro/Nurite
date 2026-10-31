import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import textureImage from '../../../assets/CanvasTmpTexture.png'
import './ThreeCanvas.css'

export type CanvasRenderStatus = 'loading' | 'ready' | 'error'

type ThreeCanvasProps = {
  onStatusChange: (status: CanvasRenderStatus) => void
}

const CANVAS_SIZE = 1024

export function ThreeCanvas({ onStatusChange }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    onStatusChange('loading')

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(1)
    renderer.setSize(CANVAS_SIZE, CANVAS_SIZE, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-label', '1024×1024 Three.js キャンバス')
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#14213b')

    const camera = new THREE.OrthographicCamera(
      -CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      -CANVAS_SIZE / 2,
      0.1,
      10,
    )
    camera.position.z = 2

    const geometry = new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const plane = new THREE.Mesh(geometry, material)
    scene.add(plane)

    const texture = new THREE.TextureLoader().load(
      textureImage,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.NearestFilter
        loadedTexture.magFilter = THREE.NearestFilter
        loadedTexture.generateMipmaps = false
        loadedTexture.colorSpace = THREE.SRGBColorSpace
        material.map = loadedTexture
        material.needsUpdate = true
        renderer.render(scene, camera)
        onStatusChange('ready')
      },
      undefined,
      (error) => {
        console.error('Failed to load the canvas texture.', error)
        onStatusChange('error')
      },
    )

    renderer.render(scene, camera)

    return () => {
      scene.remove(plane)
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onStatusChange])

  return <div ref={containerRef} className="three-canvas" />
}
