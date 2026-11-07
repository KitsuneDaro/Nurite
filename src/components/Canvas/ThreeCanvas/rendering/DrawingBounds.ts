export type DrawingBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

export function unionDrawingBounds(
  current: DrawingBounds | null,
  next: DrawingBounds,
): DrawingBounds {
  if (!current) return next
  return {
    left: Math.min(current.left, next.left),
    right: Math.max(current.right, next.right),
    top: Math.min(current.top, next.top),
    bottom: Math.max(current.bottom, next.bottom),
  }
}
