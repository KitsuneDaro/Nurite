export const squareBrushDirectionFunction = `
  vec2 getSquareBrushDirection(vec2 segmentDirection, vec2 previousDirection) {
    float previousLength = length(previousDirection);
    if (previousLength == 0.0) return segmentDirection;

    vec2 blendedDirection = segmentDirection + previousDirection / previousLength;
    float blendedLength = length(blendedDirection);
    return blendedLength > 0.0001
      ? blendedDirection / blendedLength
      : segmentDirection;
  }
`
