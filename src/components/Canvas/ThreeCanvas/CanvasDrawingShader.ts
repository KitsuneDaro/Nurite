export const brushVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const brushFragmentShader = `
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform float uBrushSize;
  uniform int uShape;
  uniform float uFollowDirection;
  uniform vec3 uColor;
  uniform vec2 uResolution;

  bool coversRoundBrush(
    vec2 relativePoint,
    vec2 tangent,
    float segmentLength,
    float halfSize
  ) {
    float along = clamp(dot(relativePoint, tangent), 0.0, segmentLength);
    vec2 nearestPoint = tangent * along;
    return length(relativePoint - nearestPoint) <= halfSize;
  }

  bool coversFlatBrush(
    vec2 point,
    vec2 start,
    vec2 relativePoint,
    vec2 tangent,
    vec2 normal,
    float segmentLength,
    float halfSize,
    float brushSize,
    float followDirection
  ) {
    if (followDirection > 0.5) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      return along >= 0.0 && along <= segmentLength && abs(across) <= halfSize;
    }

    float along = segmentLength > 0.0
      ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
      : 0.0;
    vec2 nearestPoint = start + tangent * along;
    vec2 distanceFromBrush = abs(point - nearestPoint);
    return distanceFromBrush.x <= max(1.0, brushSize * 0.04)
      && distanceFromBrush.y <= halfSize;
  }

  bool coversSquareBrush(
    vec2 point,
    vec2 start,
    vec2 relativePoint,
    vec2 tangent,
    vec2 normal,
    float segmentLength,
    float halfSize,
    float followDirection
  ) {
    if (followDirection > 0.5 && segmentLength > 0.0) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      return along >= -halfSize && along <= segmentLength + halfSize
        && abs(across) <= halfSize;
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
    float followDirection = uFollowDirection;
    bool covered;

    if (uShape == 0) {
      covered = coversRoundBrush(relativePoint, tangent, segmentLength, halfSize);
    } else if (uShape == 1) {
      covered = coversFlatBrush(
        point,
        uStart,
        relativePoint,
        tangent,
        normal,
        segmentLength,
        halfSize,
        uBrushSize,
        followDirection
      );
    } else {
      covered = coversSquareBrush(
        point, uStart, relativePoint, tangent, normal, segmentLength, halfSize, followDirection
      );
    }

    if (!covered) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`
