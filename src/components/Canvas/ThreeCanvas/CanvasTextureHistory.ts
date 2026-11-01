import * as THREE from 'three'
import { CANVAS_SIZE } from './CanvasConstants'
import type { PixelFormat, TextureDataType } from 'three'

const UNDO_LIMIT = 5
const HISTORY_SLOT_COUNT = UNDO_LIMIT + 1

type RenderTargetSet = [
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
  THREE.WebGLRenderTarget,
]

type CanvasSnapshot = {
  strokeId: number
  targets: RenderTargetSet
}

export type CanvasHistoryState = {
  canUndo: boolean
  canRedo: boolean
}

export function createRenderTarget(
  type: TextureDataType = THREE.UnsignedByteType,
  format: PixelFormat = THREE.RGBAFormat,
) {
  const target = new THREE.WebGLRenderTarget(CANVAS_SIZE, CANVAS_SIZE, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format,
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
    createRenderTarget(THREE.HalfFloatType, THREE.RGFormat),
  ]
}

function disposeRenderTargetSet(targets: RenderTargetSet) {
  targets.forEach((target) => target.dispose())
}

export class CanvasTextureHistory {
  private readonly snapshots: Array<CanvasSnapshot | null> =
    Array.from({ length: HISTORY_SLOT_COUNT }, () => null)
  private readonly copyTarget: (
    source: THREE.WebGLRenderTarget,
    destination: THREE.WebGLRenderTarget,
  ) => void
  private currentStrokeId = 0
  private maxStrokeId = 0
  private activeStrokeId: number | null = null
  private activeStrokeHasDrawing = false

  constructor(
    copyTarget: (
      source: THREE.WebGLRenderTarget,
      destination: THREE.WebGLRenderTarget,
    ) => void,
  ) {
    this.copyTarget = copyTarget
    this.snapshots[0] = { strokeId: 0, targets: createRenderTargetSet() }
  }

  get currentTargets(): RenderTargetSet {
    const strokeId = this.activeStrokeId ?? this.currentStrokeId
    const snapshot = this.snapshots[strokeId % HISTORY_SLOT_COUNT]
    if (!snapshot || snapshot.strokeId !== strokeId) {
      throw new Error(`The texture set for current stroke ${strokeId} is unavailable.`)
    }
    return snapshot.targets
  }

  beginStroke(): number | null {
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

  markDrawing(strokeId: number) {
    if (this.activeStrokeId === strokeId) this.activeStrokeHasDrawing = true
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
    return this.getHistoryState()
  }

  redo(): CanvasHistoryState {
    if (this.activeStrokeId !== null) throw new Error('Cannot redo while a stroke is active.')
    const nextStrokeId = this.currentStrokeId + 1
    if (nextStrokeId > this.maxStrokeId || !this.hasSnapshot(nextStrokeId)) {
      return this.getHistoryState()
    }

    this.currentStrokeId = nextStrokeId
    return this.getHistoryState()
  }

  getHistoryState(): CanvasHistoryState {
    return {
      canUndo: this.currentStrokeId > 0 && this.hasSnapshot(this.currentStrokeId - 1),
      canRedo: this.currentStrokeId < this.maxStrokeId
        && this.hasSnapshot(this.currentStrokeId + 1),
    }
  }

  dispose() {
    for (const snapshot of this.snapshots) {
      if (snapshot) disposeRenderTargetSet(snapshot.targets)
    }
    this.snapshots.fill(null)
  }

  private saveSnapshot(strokeId: number) {
    const index = strokeId % HISTORY_SLOT_COUNT
    const previousSnapshot = this.snapshots[index]
    if (previousSnapshot) disposeRenderTargetSet(previousSnapshot.targets)
    this.snapshots[index] = null

    const targets = createRenderTargetSet()
    try {
      const currentTargets = this.currentTargets
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
}
