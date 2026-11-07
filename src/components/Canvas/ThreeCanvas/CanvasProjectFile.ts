import type { BrushShape, BrushType, ToolType } from '../../../types'
import { CANVAS_SIZE } from './CanvasConstants'
import type { ArchiveEntry } from '../../../utils/ZipArchive'
import { createZipArchive, downloadBlob, readZipArchive } from '../../../utils/ZipArchive'
import { sanitizeCanvasFileName } from '../../../utils/canvasFileName'

export type CanvasProjectSettings = {
  brushShape: BrushShape
  paintType: BrushType
  followDirection: boolean
  brushSize: number
  toolType: ToolType
  color: string
  paletteColors: string[]
  selectedPalette: number
}

export type CanvasProjectTextures = {
  metadata: Uint8Array
  color: Uint8Array
  drawingStateA: Uint8Array
  drawingStateB: Uint8Array
  drawingStateC: Uint8Array
}

export type CanvasProject = {
  name: string
  settings: CanvasProjectSettings
  textures: CanvasProjectTextures
}

const FORMAT_ID = 'webpainter-project'
const FORMAT_VERSION = 1
const TEXTURE_BYTE_LENGTH = CANVAS_SIZE * CANVAS_SIZE * 4
const TEXTURE_FILES = {
  metadata: 'textures/metadata.bin',
  color: 'textures/color.bin',
  drawingStateA: 'textures/drawing-state-a.bin',
  drawingStateB: 'textures/drawing-state-b.bin',
  drawingStateC: 'textures/drawing-state-c.bin',
} as const

export function createCanvasProjectArchive(
  name: string,
  settings: CanvasProjectSettings,
  textures: CanvasProjectTextures,
) {
  const manifest = {
    format: FORMAT_ID,
    version: FORMAT_VERSION,
    name,
    canvas: { width: CANVAS_SIZE, height: CANVAS_SIZE },
    settings,
    textures: Object.fromEntries(
      Object.entries(TEXTURE_FILES).map(([name, path]) => [
        name,
        { path, format: 'RGBA8', width: CANVAS_SIZE, height: CANVAS_SIZE },
      ]),
    ),
  }
  const entries: ArchiveEntry[] = [
    { name: 'project.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) },
    { name: 'textures/', data: new Uint8Array() },
    ...Object.entries(TEXTURE_FILES).map(([name, path]) => ({
      name: path,
      data: textures[name as keyof CanvasProjectTextures],
    })),
  ]
  return createZipArchive(entries)
}

export function downloadCanvasProject(project: CanvasProject) {
  const archive = createCanvasProjectArchive(project.name, project.settings, project.textures)
  downloadBlob(archive, `${sanitizeCanvasFileName(project.name)}.nrt`)
}

export async function readCanvasProject(file: File): Promise<CanvasProject> {
  const entries = await readZipArchive(file)
  const files = new Map(entries.map(({ name, data }) => [name, data]))
  const manifestBytes = files.get('project.json')
  if (!manifestBytes || manifestBytes.length > 1024 * 1024) {
    throw new Error('This ZIP does not contain a valid WebPainter project file.')
  }

  let manifest: unknown
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
  } catch (error) {
    throw new Error('The project settings file is invalid JSON.', { cause: error })
  }
  const project = validateManifest(manifest, getProjectNameFromFile(file.name))
  const expectedPaths = new Set(['project.json', 'textures/', ...Object.values(TEXTURE_FILES)])
  for (const name of files.keys()) {
    if (!expectedPaths.has(name)) throw new Error(`The project contains an unexpected file: ${name}`)
  }
  for (const path of Object.values(TEXTURE_FILES)) {
    if (!files.has(path)) throw new Error(`The project is missing a required texture: ${path}`)
  }
  if (files.size !== expectedPaths.size) {
    throw new Error('The project archive contains missing or unexpected entries.')
  }

  const textures = {} as CanvasProjectTextures
  for (const [key, path] of Object.entries(TEXTURE_FILES)) {
    const data = files.get(path)
    if (!data || data.length !== TEXTURE_BYTE_LENGTH) {
      throw new Error(`The project texture has an invalid size: ${path}`)
    }
    textures[key as keyof CanvasProjectTextures] = data
  }
  return { ...project, textures }
}

function validateManifest(value: unknown, fallbackName: string) {
  if (!isRecord(value) || value.format !== FORMAT_ID || value.version !== FORMAT_VERSION) {
    throw new Error('This ZIP is not a supported WebPainter project file.')
  }
  if (
    !isRecord(value.canvas)
    || value.canvas.width !== CANVAS_SIZE
    || value.canvas.height !== CANVAS_SIZE
    || !isRecord(value.settings)
    || !isRecord(value.textures)
  ) {
    throw new Error('The project file has an invalid structure or canvas size.')
  }

  const { settings, textures } = value
  const name = value.name === undefined ? fallbackName : value.name
  if (
    typeof name !== 'string'
    || name.trim().length === 0
    || name.length > 120
    || !isBrushShape(settings.brushShape)
    || !isBrushType(settings.paintType)
    || !isToolType(settings.toolType)
    || typeof settings.followDirection !== 'boolean'
    || typeof settings.brushSize !== 'number'
    || !Number.isFinite(settings.brushSize)
    || settings.brushSize < 1
    || settings.brushSize > 255
    || !isHexColor(settings.color)
    || !Array.isArray(settings.paletteColors)
    || settings.paletteColors.length < 1
    || settings.paletteColors.length > 4096
    || !settings.paletteColors.every(isHexColor)
    || typeof settings.selectedPalette !== 'number'
    || !Number.isInteger(settings.selectedPalette)
    || settings.selectedPalette < 0
    || settings.selectedPalette >= settings.paletteColors.length
  ) {
    throw new Error('The project contains invalid tool or color settings.')
  }

  for (const [key, path] of Object.entries(TEXTURE_FILES)) {
    const texture = textures[key]
    if (
      !isRecord(texture)
      || texture.path !== path
      || texture.format !== 'RGBA8'
      || texture.width !== CANVAS_SIZE
      || texture.height !== CANVAS_SIZE
    ) {
      throw new Error(`The project manifest has invalid texture metadata: ${key}`)
    }
  }

  return {
    name,
    settings: {
      brushShape: settings.brushShape,
      paintType: settings.paintType,
      followDirection: settings.followDirection,
      brushSize: settings.brushSize,
      toolType: settings.toolType,
      color: settings.color,
      paletteColors: [...settings.paletteColors],
      selectedPalette: settings.selectedPalette,
    },
  }
}

function getProjectNameFromFile(fileName: string) {
  const withoutExtension = fileName.replace(/\.nrt$/i, '')
  return withoutExtension.slice(0, 120) || 'Untitled'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBrushShape(value: unknown): value is BrushShape {
  return value === 'round' || value === 'flat' || value === 'square'
}

function isBrushType(value: unknown): value is BrushType {
  return value === 'normal' || value === 'oil' || value === 'watercolor'
}

function isToolType(value: unknown): value is ToolType {
  return value === 'brush' || value === 'eraser' || value === 'eyedropper'
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
}
