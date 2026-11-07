export function createDefaultCanvasName(date = new Date()) {
  const datePart = [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('')
  const hourPart = date.getHours().toString().padStart(2, '0')
  return `Notitle_${datePart}_${hourPart}`
}

export function sanitizeCanvasFileName(name: string) {
  const sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .replace(/[. ]+$/g, '')
    .slice(0, 120)
    .trim()
  if (!sanitized || sanitized === '.' || sanitized === '..') return 'Untitled'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(sanitized)) {
    return `_${sanitized}`
  }
  return sanitized
}
