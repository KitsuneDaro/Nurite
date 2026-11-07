import { segmentMetadataFunctions } from './SegmentMetadataShader'
import { brushEdgeDistanceFunctions } from './BrushEdgeDistanceFunctions'

export const brushStrokeDistanceFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform vec2 uPreviousDirection;
  uniform float uBrushSize;
  uniform int uShape;
  uniform float uFollowDirection;
  uniform float uOverridePass;

  ${brushEdgeDistanceFunctions}

  void main() {
    if (!isCurrentSegmentCovered()) discard;

    vec2 point = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    float edgeDistance = getBrushEdgeDistance(
      point - uStart,
      uEnd - uStart,
      uPreviousDirection,
      uBrushSize,
      uShape,
      uFollowDirection
    );
    float strokeDistance = clamp(edgeDistance * 2.0, 0.0, 255.0) / 255.0;
    float brushSize = floor(clamp(uBrushSize, 0.0, 255.0) + 0.5) / 255.0;
    gl_FragColor = uOverridePass > 0.5
      ? vec4(strokeDistance, 1.0, 0.0, 0.0)
      : vec4(strokeDistance, 0.0, brushSize, 0.0);
  }
`

export const squareBrushStrokeCapFragmentShader = `
  uniform vec2 uEndpoint;
  uniform vec2 uDirection;
  uniform float uBrushSize;
  uniform float uFollowDirection;
  uniform float uStartCap;
  uniform float uOverridePass;
  uniform vec2 uResolution;

  vec2 rotateSquareAxis(vec2 direction) {
    const float diagonal = 0.70710678118;
    return vec2(
      (direction.x - direction.y) * diagonal,
      (direction.x + direction.y) * diagonal
    );
  }

  void main() {
    float directionLength = length(uDirection);
    vec2 tangent = directionLength > 0.0001
      ? uDirection / directionLength
      : vec2(1.0, 0.0);
    vec2 point = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 relativePoint = point - uEndpoint;
    float along = dot(relativePoint, tangent);
    if ((uStartCap > 0.5 && along > 0.0) || (uStartCap <= 0.5 && along < 0.0)) {
      discard;
    }

    vec2 axis = uFollowDirection > 0.5
      ? rotateSquareAxis(tangent)
      : vec2(1.0, 0.0);
    vec2 perpendicular = vec2(-axis.y, axis.x);
    float halfSize = uBrushSize * 0.5;
    float edgeDistance = halfSize - max(
      abs(dot(relativePoint, axis)),
      abs(dot(relativePoint, perpendicular))
    );
    if (edgeDistance <= 0.0) discard;

    float strokeDistance = clamp(edgeDistance * 2.0, 0.0, 255.0) / 255.0;
    float brushSize = floor(clamp(uBrushSize, 0.0, 255.0) + 0.5) / 255.0;
    gl_FragColor = uOverridePass > 0.5
      ? vec4(strokeDistance, 1.0, 0.0, 0.0)
      : vec4(strokeDistance, 0.0, brushSize, 0.0);
  }
`
