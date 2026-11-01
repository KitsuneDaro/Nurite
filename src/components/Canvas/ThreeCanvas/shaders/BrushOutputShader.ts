import { segmentMetadataFunctions } from './SegmentMetadataShader'
import { squareBrushGeometryFunctions } from './SquareBrushGeometryShader'

export const brushColorFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec3 uColor;

  void main() {
    if (!isCurrentSegmentCovered()) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`

const brushEdgeDistanceFunctions = `
  ${squareBrushGeometryFunctions}

  float distanceFromRoundBrushEdge(
    vec2 relativePoint,
    vec2 tangent,
    float segmentLength,
    float halfSize
  ) {
    float along = clamp(dot(relativePoint, tangent), 0.0, segmentLength);
    return max(0.0, halfSize - length(relativePoint - tangent * along));
  }

  float distanceFromFixedFlatBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    vec2 normal,
    float halfSize,
    float brushSize
  ) {
    float halfThickness = max(1.0, brushSize * 0.04);
    float segmentLength = length(segment);
    if (segmentLength == 0.0) {
      return min(halfThickness - abs(relativePoint.x), halfSize - abs(relativePoint.y));
    }

    float normalExtent = halfThickness * abs(normal.x) + halfSize * abs(normal.y);
    float normalMargin = normalExtent - abs(dot(relativePoint, normal));
    return max(0.0, normalMargin);
  }

  float distanceToSegmentEdge(vec2 point, vec2 start, vec2 end) {
    vec2 edge = end - start;
    float edgeLengthSquared = dot(edge, edge);
    if (edgeLengthSquared == 0.0) return length(point - start);
    float along = clamp(dot(point - start, edge) / edgeLengthSquared, 0.0, 1.0);
    return length(point - (start + edge * along));
  }

  float distanceFromDirectionalFlatBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    vec2 currentNormal,
    vec2 previousDirection,
    float halfSize
  ) {
    if (length(previousDirection) == 0.0) {
      float across = dot(relativePoint, currentNormal);
      return max(0.0, halfSize - abs(across));
    }

    vec2 previousTangent = normalize(previousDirection);
    vec2 previousNormal = vec2(-previousTangent.y, previousTangent.x);
    vec2 previousPositive = previousNormal * halfSize;
    vec2 previousNegative = -previousPositive;
    vec2 currentPositive = currentNormal * halfSize;
    vec2 currentNegative = -currentPositive;
    vec2 endPositive = segment + currentPositive;
    vec2 endNegative = segment + currentNegative;
    float edgeDistance = distanceToSegmentEdge(
      relativePoint, previousPositive, currentPositive
    );
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, currentPositive, endPositive
    ));
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, endNegative, currentNegative
    ));
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, currentNegative, previousNegative
    ));
    return edgeDistance;
  }

  float distanceFromFlatBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    vec2 normal,
    vec2 previousDirection,
    float halfSize,
    float brushSize,
    float followDirection
  ) {
    if (followDirection <= 0.5) {
      return distanceFromFixedFlatBrushEdge(
        relativePoint, segment, normal, halfSize, brushSize
      );
    }
    return distanceFromDirectionalFlatBrushEdge(
      relativePoint, segment, normal, previousDirection, halfSize
    );
  }

  float distanceFromSquareBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    float halfSize,
    vec2 tangent
  ) {
    return getSquareBrushStrokeEdgeDistance(
      relativePoint, segment, halfSize, tangent
    );
  }

  float getBrushEdgeDistance(
    vec2 relativePoint,
    vec2 segment,
    vec2 previousDirection,
    float brushSize,
    int shape,
    float followDirection
  ) {
    float segmentLength = length(segment);
    vec2 tangent = segmentLength > 0.0 ? segment / segmentLength : vec2(1.0, 0.0);
    vec2 normal = vec2(-tangent.y, tangent.x);
    float halfSize = brushSize * 0.5;

    if (shape == 0) {
      return distanceFromRoundBrushEdge(relativePoint, tangent, segmentLength, halfSize);
    }
    if (shape == 1) {
      return distanceFromFlatBrushEdge(
        relativePoint,
        segment,
        normal,
        previousDirection,
        halfSize,
        brushSize,
        followDirection
      );
    }
    return distanceFromSquareBrushEdge(
      relativePoint, segment, halfSize, tangent
    );
  }
`

export const brushStateAFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec2 uEnd;
  uniform int uShape;
  uniform int uPaintStyleId;

  void main() {
    if (!isCurrentSegmentCovered()) discard;

    float endX = floor(clamp(uEnd.x, 0.0, 1023.0) + 0.5);
    float endY = floor(clamp(uEnd.y, 0.0, 1023.0) + 0.5);
    float brushShapeId = floor(clamp(float(uShape + 1), 0.0, 63.0) + 0.5);
    float paintStyleId = floor(clamp(float(uPaintStyleId), 0.0, 63.0) + 0.5);
    float byte0 = mod(endX, 256.0);
    float byte1 = floor(endX / 256.0) + mod(endY, 64.0) * 4.0;
    float byte2 = floor(endY / 64.0) + mod(brushShapeId, 16.0) * 16.0;
    float byte3 = floor(brushShapeId / 16.0) + paintStyleId * 4.0;
    gl_FragColor = vec4(byte0, byte1, byte2, byte3) / 255.0;
  }
`

export const brushStrokeDistanceFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform vec2 uPreviousDirection;
  uniform float uBrushSize;
  uniform int uShape;
  uniform float uFollowDirection;

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
    float strokeDistance = clamp(edgeDistance * 2.0, 0.0, 255.0);
    float brushSize = floor(clamp(uBrushSize, 0.0, 255.0) + 0.5);
    gl_FragColor = vec4(strokeDistance, brushSize, 0.0, 1.0);
  }
`

export const squareBrushStrokeCapFragmentShader = `
  uniform vec2 uEndpoint;
  uniform vec2 uDirection;
  uniform float uBrushSize;
  uniform float uFollowDirection;
  uniform float uStartCap;
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
    vec2 tangent = directionLength > 0.5
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

    float strokeDistance = clamp(edgeDistance * 2.0, 0.0, 255.0);
    float brushSize = floor(clamp(uBrushSize, 0.0, 255.0) + 0.5);
    gl_FragColor = vec4(strokeDistance, brushSize, 0.0, 1.0);
  }
`

export const brushStateBFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec2 uVelocity;
  uniform vec2 uAcceleration;

  void main() {
    if (!isCurrentSegmentCovered()) discard;
    vec2 velocity = clamp(uVelocity, vec2(-128.0), vec2(127.0));
    vec2 acceleration = clamp(uAcceleration, vec2(-128.0), vec2(127.0));
    gl_FragColor = vec4(
      (velocity + 128.0) / 255.0,
      (acceleration + 128.0) / 255.0
    );
  }
`
