import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import type { BrushStrokeStyle, DrawingPoint } from '../../../types'
import './ThreeCanvas.css'

export type CanvasRenderStatus = 'loading' | 'ready' | 'error'

export type CanvasDrawingHandle = {
  drawStroke: (points: readonly DrawingPoint[], style: BrushStrokeStyle) => void
}

type ThreeCanvasProps = {
  onStatusChange: (status: CanvasRenderStatus) => void
}

export const CANVAS_SIZE = 1024
type Rgba = readonly [number, number, number, number]

function parseColor(hex: string): Rgba {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((channel) => `${channel}${channel}`).join('')
    : value

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    255,
  ]
}

function writePixel(data: Uint8ClampedArray, x: number, y: number, color: Rgba) {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return

  const index = (y * CANVAS_SIZE + x) * 4
  data[index] = color[0]
  data[index + 1] = color[1]
  data[index + 2] = color[2]
  data[index + 3] = color[3]
}

function fillPolygon(image: ImageData, points: readonly DrawingPoint[], color: Rgba) {
  const data = image.data
  const minY = Math.max(0, Math.floor(Math.min(...points.map(({ y }) => y))))
  const maxY = Math.min(CANVAS_SIZE - 1, Math.ceil(Math.max(...points.map(({ y }) => y))))

  for (let y = minY; y <= maxY; y += 1) {
    const scanY = y + 0.5
    const intersections: number[] = []
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index]
      const end = points[(index + 1) % points.length]
      if ((start.y <= scanY && end.y > scanY) || (end.y <= scanY && start.y > scanY)) {
        intersections.push(start.x + ((scanY - start.y) / (end.y - start.y)) * (end.x - start.x))
      }
    }

    intersections.sort((a, b) => a - b)
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const from = Math.max(0, Math.ceil(intersections[index] - 0.5))
      const to = Math.min(CANVAS_SIZE - 1, Math.ceil(intersections[index + 1] - 0.5) - 1)
      for (let x = from; x <= to; x += 1) {
        writePixel(data, x, y, color)
      }
    }
  }
}

function fillCircle(image: ImageData, point: DrawingPoint, radius: number, color: Rgba) {
  const data = image.data
  const minY = Math.max(0, Math.floor(point.y - radius))
  const maxY = Math.min(CANVAS_SIZE - 1, Math.ceil(point.y + radius))
  const radiusSquared = radius * radius

  for (let y = minY; y <= maxY; y += 1) {
    const dy = y + 0.5 - point.y
    const dx = Math.sqrt(Math.max(0, radiusSquared - dy * dy))
    const from = Math.max(0, Math.ceil(point.x - dx - 0.5))
    const to = Math.min(CANVAS_SIZE - 1, Math.ceil(point.x + dx - 0.5) - 1)
    for (let x = from; x <= to; x += 1) {
      writePixel(data, x, y, color)
    }
  }
}

function getFlatStampCorners(point: DrawingPoint, size: number, angle: number) {
  const tangent = { x: Math.cos(angle), y: Math.sin(angle) }
  const normal = { x: -tangent.y, y: tangent.x }
  const halfWidth = size / 2
  const halfThickness = Math.max(0.5, size * 0.04)

  return [
    { x: point.x + normal.x * halfWidth + tangent.x * halfThickness, y: point.y + normal.y * halfWidth + tangent.y * halfThickness },
    { x: point.x - normal.x * halfWidth + tangent.x * halfThickness, y: point.y - normal.y * halfWidth + tangent.y * halfThickness },
    { x: point.x - normal.x * halfWidth - tangent.x * halfThickness, y: point.y - normal.y * halfWidth - tangent.y * halfThickness },
    { x: point.x + normal.x * halfWidth - tangent.x * halfThickness, y: point.y + normal.y * halfWidth - tangent.y * halfThickness },
  ]
}

function getConvexHull(points: DrawingPoint[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (origin: DrawingPoint, first: DrawingPoint, second: DrawingPoint) =>
    (first.x - origin.x) * (second.y - origin.y)
    - (first.y - origin.y) * (second.x - origin.x)

  const lower: DrawingPoint[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: DrawingPoint[] = []
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function drawFlatStroke(
  image: ImageData,
  points: readonly DrawingPoint[],
  size: number,
  followDirection: boolean,
  color: Rgba,
) {
  const lastIndex = points.length - 1

  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(lastIndex, index + 1)]
    const angle = followDirection
      ? Math.atan2(next.y - previous.y, next.x - previous.x)
      : 0
    fillPolygon(image, getFlatStampCorners(point, size, angle), color)
  })

  if (points.length === 1) {
    return
  }

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    if (start.x === end.x && start.y === end.y) continue
    const angle = followDirection
      ? Math.atan2(end.y - start.y, end.x - start.x)
      : 0
    fillPolygon(image, getConvexHull([
      ...getFlatStampCorners(start, size, angle),
      ...getFlatStampCorners(end, size, angle),
    ]), color)
  }
}

function getSquareCorners(point: DrawingPoint, size: number, angle: number) {
  const halfSize = size / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const corners: DrawingPoint[] = [
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ]

  return corners.map(({ x, y }) => ({
    x: point.x + x * cos - y * sin,
    y: point.y + x * sin + y * cos,
  }))
}

function drawSquareStroke(
  image: ImageData,
  points: readonly DrawingPoint[],
  size: number,
  followDirection: boolean,
  color: Rgba,
) {
  const lastIndex = points.length - 1
  const angles = points.map((_, index) => {
    if (!followDirection || points.length === 1) return 0
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(lastIndex, index + 1)]
    return Math.atan2(next.y - previous.y, next.x - previous.x)
  })
  const corners = points.map((point, index) => getSquareCorners(point, size, angles[index]))

  for (let index = 1; index < points.length; index += 1) {
    for (let corner = 0; corner < 4; corner += 1) {
      fillPolygon(image, [
        corners[index - 1][corner],
        corners[index - 1][(corner + 1) % 4],
        corners[index][(corner + 1) % 4],
        corners[index][corner],
      ], color)
    }
  }

  corners.forEach((square) => fillPolygon(image, square, color))
}

function drawRoundStroke(
  image: ImageData,
  points: readonly DrawingPoint[],
  size: number,
  color: Rgba,
) {
  const radius = size / 2
  points.forEach((point) => fillCircle(image, point, radius, color))

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.hypot(dx, dy)
    if (distance === 0) continue

    const normal = { x: -dy / distance * radius, y: dx / distance * radius }
    fillPolygon(image, [
      { x: start.x + normal.x, y: start.y + normal.y },
      { x: start.x - normal.x, y: start.y - normal.y },
      { x: end.x - normal.x, y: end.y - normal.y },
      { x: end.x + normal.x, y: end.y + normal.y },
    ], color)
  }
}

export const ThreeCanvas = forwardRef<CanvasDrawingHandle, ThreeCanvasProps>(
  function ThreeCanvas({ onStatusChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<ImageData | null>(null)
    const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null)
    const textureRef = useRef<THREE.CanvasTexture | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null)

    useImperativeHandle(ref, () => ({
      drawStroke(points, style) {
        const image = imageRef.current
        const context = drawingContextRef.current
        const texture = textureRef.current
        const renderer = rendererRef.current
        const scene = sceneRef.current
        const camera = cameraRef.current
        if (!image || !context || !texture || !renderer || !scene || !camera || points.length === 0) return

        const color = parseColor(style.eraserEnabled ? '#FFFFFF' : style.color)
        const size = Math.max(1, style.size)
        if (style.shape === 'round') {
          drawRoundStroke(image, points, size, color)
        } else if (style.shape === 'flat') {
          drawFlatStroke(image, points, size, style.followDirection, color)
        } else {
          drawSquareStroke(image, points, size, style.followDirection, color)
        }

        context.putImageData(image, 0, 0)
        texture.needsUpdate = true
        renderer.render(scene, camera)
      },
    }), [])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      onStatusChange('loading')
      const drawingCanvas = document.createElement('canvas')
      drawingCanvas.width = CANVAS_SIZE
      drawingCanvas.height = CANVAS_SIZE
      const drawingContext = drawingCanvas.getContext('2d')
      if (!drawingContext) {
        onStatusChange('error')
        console.error('Failed to create the canvas drawing context.')
        return
      }

      const image = drawingContext.createImageData(CANVAS_SIZE, CANVAS_SIZE)
      for (let index = 0; index < image.data.length; index += 4) {
        image.data[index] = 255
        image.data[index + 1] = 255
        image.data[index + 2] = 255
        image.data[index + 3] = 255
      }
      drawingContext.putImageData(image, 0, 0)

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
      scene.background = new THREE.Color('#FFFFFF')
      const camera = new THREE.OrthographicCamera(
        -CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        -CANVAS_SIZE / 2,
        0.1,
        10,
      )
      camera.position.z = 2

      const texture = new THREE.CanvasTexture(drawingCanvas)
      texture.minFilter = THREE.NearestFilter
      texture.magFilter = THREE.NearestFilter
      texture.generateMipmaps = false
      texture.colorSpace = THREE.SRGBColorSpace
      const geometry = new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE)
      const material = new THREE.MeshBasicMaterial({ map: texture })
      const plane = new THREE.Mesh(geometry, material)
      scene.add(plane)

      imageRef.current = image
      drawingContextRef.current = drawingContext
      textureRef.current = texture
      rendererRef.current = renderer
      sceneRef.current = scene
      cameraRef.current = camera
      renderer.render(scene, camera)
      onStatusChange('ready')

      return () => {
        imageRef.current = null
        drawingContextRef.current = null
        textureRef.current = null
        rendererRef.current = null
        sceneRef.current = null
        cameraRef.current = null
        scene.remove(plane)
        geometry.dispose()
        material.dispose()
        texture.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    }, [onStatusChange])

    return <div ref={containerRef} className="three-canvas" />
  },
)
