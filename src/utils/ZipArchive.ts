export type ArchiveEntry = {
  name: string
  data: Uint8Array
}

export type ReadArchiveEntry = {
  name: string
  data: Uint8Array
}

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054B50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014B50
const LOCAL_FILE_SIGNATURE = 0x04034B50
const MAX_ARCHIVE_SIZE = 64 * 1024 * 1024
const MAX_ENTRY_COUNT = 32
const MAX_TOTAL_UNCOMPRESSED_SIZE = 24 * 1024 * 1024

function getCrc32(data: Uint8Array) {
  let crc = 0xFFFFFFFF
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF]! ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function getDosTimestamp() {
  const now = new Date()
  return {
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
    date: ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
  }
}

export function createZipArchive(entries: readonly ArchiveEntry[]) {
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  const timestamp = getDosTimestamp()
  let localOffset = 0
  let centralSize = 0

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name)
    const checksum = getCrc32(entry.data)
    const localHeader = new Uint8Array(30 + name.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, LOCAL_FILE_SIGNATURE, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, timestamp.time, true)
    localView.setUint16(12, timestamp.date, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, entry.data.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(name, 30)
    localChunks.push(localHeader, entry.data)

    const centralHeader = new Uint8Array(46 + name.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, CENTRAL_DIRECTORY_SIGNATURE, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, timestamp.time, true)
    centralView.setUint16(14, timestamp.date, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, entry.data.length, true)
    centralView.setUint32(24, entry.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    centralHeader.set(name, 46)
    centralChunks.push(centralHeader)
    localOffset += localHeader.length + entry.data.length
    centralSize += centralHeader.length
  }

  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, localOffset, true)
  endView.setUint16(20, 0, true)
  const chunks = [...localChunks, ...centralChunks, endRecord]
  const archiveLength = chunks.reduce((length, chunk) => length + chunk.length, 0)
  const archive = new Uint8Array(archiveLength)
  let archiveOffset = 0
  for (const chunk of chunks) {
    archive.set(chunk, archiveOffset)
    archiveOffset += chunk.length
  }
  return new Blob([archive.buffer], { type: 'application/zip' })
}

export async function readZipArchive(file: File): Promise<ReadArchiveEntry[]> {
  if (file.size < 22) {
    throw new Error('The selected file is not a valid ZIP archive.')
  }
  if (file.size > MAX_ARCHIVE_SIZE) {
    throw new Error('The ZIP file size is not supported.')
  }
  const archive = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)
  const endOffset = findEndRecord(view)
  const diskNumber = view.getUint16(endOffset + 4, true)
  const centralDisk = view.getUint16(endOffset + 6, true)
  const entriesOnDisk = view.getUint16(endOffset + 8, true)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralSize = view.getUint32(endOffset + 12, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  if (
    diskNumber !== 0
    || centralDisk !== 0
    || entriesOnDisk !== entryCount
    || entryCount > MAX_ENTRY_COUNT
    || entryCount === 0xFFFF
    || centralOffset === 0xFFFFFFFF
    || centralSize === 0xFFFFFFFF
    || centralOffset + centralSize > endOffset
  ) {
    throw new Error('The ZIP archive structure is not supported.')
  }

  const entries: ReadArchiveEntry[] = []
  const names = new Set<string>()
  let offset = centralOffset
  let totalUncompressedSize = 0
  for (let index = 0; index < entryCount; index += 1) {
    ensureRange(view, offset, 46)
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('The ZIP archive has an invalid central directory.')
    }

    const flags = view.getUint16(offset + 8, true)
    const compressionMethod = view.getUint16(offset + 10, true)
    const checksum = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const end = offset + 46 + nameLength + extraLength + commentLength
    ensureRange(view, offset, end - offset)
    const name = decodeName(archive.subarray(offset + 46, offset + 46 + nameLength))
    if (names.has(name)) throw new Error(`The ZIP archive has a duplicate entry: ${name}`)
    names.add(name)
    offset = end

    totalUncompressedSize += uncompressedSize
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
      throw new Error('The ZIP archive expands beyond the supported size.')
    }
    if (name.endsWith('/')) {
      if (uncompressedSize !== 0) throw new Error('The ZIP archive has an invalid directory entry.')
      entries.push({ name, data: new Uint8Array() })
      continue
    }
    if ((flags & 1) !== 0 || (compressionMethod !== 0 && compressionMethod !== 8)) {
      throw new Error(`The ZIP entry is encrypted or uses an unsupported compression method: ${name}`)
    }

    ensureRange(view, localOffset, 30)
    if (view.getUint32(localOffset, true) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`The ZIP entry has an invalid local header: ${name}`)
    }
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    ensureRange(view, dataOffset, compressedSize)
    const localName = decodeName(archive.subarray(
      localOffset + 30,
      localOffset + 30 + localNameLength,
    ))
    if (localName !== name) throw new Error(`The ZIP entry name does not match: ${name}`)

    const compressed = archive.subarray(dataOffset, dataOffset + compressedSize)
    const data = compressionMethod === 0
      ? compressed.slice()
      : await decompressRawDeflate(compressed)
    if (data.length !== uncompressedSize || getCrc32(data) !== checksum) {
      throw new Error(`The ZIP entry is corrupted: ${name}`)
    }
    entries.push({ name, data })
  }
  if (offset !== centralOffset + centralSize) {
    throw new Error('The ZIP archive central directory size is inconsistent.')
  }
  return entries
}

function findEndRecord(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 22 - 0xFFFF)
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (
      view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE
      && offset + 22 + view.getUint16(offset + 20, true) === view.byteLength
    ) {
      return offset
    }
  }
  throw new Error('The selected file is not a valid ZIP archive.')
}

function ensureRange(view: DataView, offset: number, length: number) {
  if (offset < 0 || length < 0 || offset + length > view.byteLength) {
    throw new Error('The ZIP archive is truncated or contains invalid offsets.')
  }
}

function decodeName(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error('The ZIP archive contains an invalid UTF-8 entry name.', { cause: error })
  }
}

async function decompressRawDeflate(data: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress ZIP files.')
  }
  try {
    const input = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer
    const stream = new Blob([input]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch (error) {
    throw new Error('A compressed ZIP entry could not be decompressed.', { cause: error })
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
