import type { HslColor } from 'react-colorful'

export function hexToHsl(hex: string): HslColor {
  const red = parseInt(hex.slice(1, 3), 16) / 255
  const green = parseInt(hex.slice(3, 5), 16) / 255
  const blue = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6
        break
      case green:
        hue = (blue - red) / delta + 2
        break
      default:
        hue = (red - green) / delta + 4
    }
    hue *= 60
    if (hue < 0) hue += 360
  }

  return { h: hue, s: saturation * 100, l: lightness * 100 }
}

export function hslToHex({ h, s, l }: HslColor): string {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const section = h / 60
  const x = chroma * (1 - Math.abs((section % 2) - 1))
  const [red, green, blue] =
    section < 1 ? [chroma, x, 0] :
      section < 2 ? [x, chroma, 0] :
        section < 3 ? [0, chroma, x] :
          section < 4 ? [0, x, chroma] :
            section < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const offset = lightness - chroma / 2
  return `#${[red, green, blue].map((channel) =>
    Math.round((channel + offset) * 255).toString(16).padStart(2, '0'),
  ).join('')}`
}
