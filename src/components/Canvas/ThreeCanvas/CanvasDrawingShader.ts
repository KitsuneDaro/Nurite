export const brushVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const brushFragmentShader = `
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform vec2 uPreviousDirection;
  uniform float uBrushSize;
  uniform int uShape;
  uniform float uFollowDirection;
  uniform vec3 uColor;
  uniform vec2 uResolution;

  bool coversRoundBrush(
    vec2 relativePoint,
    vec2 tangent,
    vec2 previousDirection,
    float segmentLength,
    float halfSize
  ) {
    float along = clamp(dot(relativePoint, tangent), 0.0, segmentLength);
    vec2 nearestPoint = tangent * along;
    bool onCurrentSegment = length(relativePoint - nearestPoint) <= halfSize;
    return onCurrentSegment || (
      length(previousDirection) > 0.0 && length(relativePoint) <= halfSize
    );
  }

  bool isInsideTriangle(vec2 point, vec2 a, vec2 b, vec2 c) {
    float edgeAB = (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y);
    float edgeBC = (point.x - c.x) * (b.y - c.y) - (b.x - c.x) * (point.y - c.y);
    float edgeCA = (point.x - a.x) * (c.y - a.y) - (c.x - a.x) * (point.y - a.y);
    bool hasNegative = edgeAB < 0.0 || edgeBC < 0.0 || edgeCA < 0.0;
    bool hasPositive = edgeAB > 0.0 || edgeBC > 0.0 || edgeCA > 0.0;
    return !(hasNegative && hasPositive);
  }

  bool coversDirectionalJoin(
    vec2 relativePoint,
    vec2 previousDirection,
    vec2 currentNormal,
    float halfSize
  ) {
    float previousLength = length(previousDirection);
    if (previousLength == 0.0) return false;

    vec2 previousTangent = previousDirection / previousLength;
    vec2 previousNormal = vec2(-previousTangent.y, previousTangent.x);
    vec2 previousPositive = previousNormal * halfSize;
    vec2 previousNegative = -previousPositive;
    vec2 currentPositive = currentNormal * halfSize;
    vec2 currentNegative = -currentPositive;
    return isInsideTriangle(relativePoint, previousPositive, currentPositive, currentNegative)
      || isInsideTriangle(relativePoint, previousPositive, currentNegative, previousNegative);
  }

  bool coversFixedFlatSegment(
    vec2 relativePoint,
    vec2 segment,
    float halfSize,
    float brushSize
  ) {
    float segmentLength = length(segment);
    vec2 tangent = segmentLength > 0.0 ? segment / segmentLength : vec2(1.0, 0.0);
    float halfThickness = max(1.0, brushSize * 0.04);
    if (abs(segment.x) > halfThickness) {
      float along = relativePoint.x / segment.x;
      float across = relativePoint.y - along * segment.y;
      float alongPadding = halfThickness / abs(segment.x);
      float acrossPadding = halfThickness * abs(segment.y / segment.x);
      return along >= -alongPadding
        && along <= 1.0 + alongPadding
        && abs(across) <= halfSize + acrossPadding;
    }

    float along = segmentLength > 0.0
      ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
      : 0.0;
    vec2 nearestPoint = tangent * along;
    vec2 distanceFromBrush = abs(relativePoint - nearestPoint);
    return distanceFromBrush.x <= halfThickness && distanceFromBrush.y <= halfSize;
  }

  bool coversFlatBrush(
    vec2 relativePoint,
    vec2 segment,
    vec2 tangent,
    vec2 normal,
    vec2 previousDirection,
    float segmentLength,
    float halfSize,
    float brushSize,
    float followDirection
  ) {
    if (followDirection > 0.5) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      bool onSegment = along >= 0.0 && along <= segmentLength && abs(across) <= halfSize;
      return onSegment || coversDirectionalJoin(
        relativePoint, previousDirection, normal, halfSize
      );
    }

    bool onCurrentSegment = coversFixedFlatSegment(
      relativePoint, segment, halfSize, brushSize
    );
    bool onPreviousSegment = length(previousDirection) > 0.0
      && coversFixedFlatSegment(
        relativePoint + previousDirection,
        previousDirection,
        halfSize,
        brushSize
      );
    return onCurrentSegment || onPreviousSegment;
  }

  bool coversSquareBrush(
    vec2 point,
    vec2 start,
    vec2 relativePoint,
    vec2 tangent,
    vec2 normal,
    vec2 previousDirection,
    float segmentLength,
    float halfSize,
    float followDirection
  ) {
    if (followDirection > 0.5 && segmentLength > 0.0) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      bool onSegment = along >= -halfSize && along <= segmentLength + halfSize
        && abs(across) <= halfSize;
      return onSegment || coversDirectionalJoin(
        relativePoint, previousDirection, normal, halfSize
      );
    }

    float along = segmentLength > 0.0
      ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
      : 0.0;
    vec2 nearestPoint = start + tangent * along;
    vec2 distanceFromBrush = abs(point - nearestPoint);
    return distanceFromBrush.x <= halfSize && distanceFromBrush.y <= halfSize;
  }

  void main() {
    vec2 point = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 segment = uEnd - uStart;
    float segmentLength = length(segment);
    vec2 tangent = segmentLength > 0.0 ? segment / segmentLength : vec2(1.0, 0.0);
    vec2 normal = vec2(-tangent.y, tangent.x);
    vec2 relativePoint = point - uStart;
    float halfSize = uBrushSize * 0.5;
    vec2 previousDirection = uPreviousDirection;
    float followDirection = uFollowDirection;
    bool covered = false;

    if (uShape == 0) {
      covered = coversRoundBrush(
        relativePoint, tangent, previousDirection, segmentLength, halfSize
      );
    } else if (uShape == 1) {
      covered = coversFlatBrush(
        relativePoint,
        segment,
        tangent,
        normal,
        previousDirection,
        segmentLength,
        halfSize,
        uBrushSize,
        followDirection
      );
    } else {
      covered = coversSquareBrush(
        point,
        uStart,
        relativePoint,
        tangent,
        normal,
        previousDirection,
        segmentLength,
        halfSize,
        followDirection
      );
    }

    if (!covered) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`
