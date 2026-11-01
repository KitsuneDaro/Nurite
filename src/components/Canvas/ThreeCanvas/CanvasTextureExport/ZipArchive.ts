export type ArchiveEntry = {
  name: string
  data: Uint8Array
}

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
    localView.setUint32(0, 0x04034B50, true)
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
    centralView.setUint32(0, 0x02014B50, true)
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
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, localOffset, true)
  endView.setUint16(20, 0, true)
  const archiveLength = [...localChunks, ...centralChunks, endRecord]
    .reduce((length, chunk) => length + chunk.length, 0)
  const archive = new Uint8Array(archiveLength)
  let archiveOffset = 0
  for (const chunk of [...localChunks, ...centralChunks, endRecord]) {
    archive.set(chunk, archiveOffset)
    archiveOffset += chunk.length
  }
  return new Blob([archive.buffer], { type: 'application/zip' })
}

