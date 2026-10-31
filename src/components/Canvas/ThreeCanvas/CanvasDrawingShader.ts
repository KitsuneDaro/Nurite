export const brushVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const brushFragmentShader = `
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform float uBrushSize;
  uniform float uShape;
  uniform float uFollowDirection;
  uniform vec3 uColor;
  uniform vec2 uResolution;

  void main() {
    vec2 point = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 segment = uEnd - uStart;
    float segmentLength = length(segment);
    vec2 tangent = segmentLength > 0.0 ? segment / segmentLength : vec2(1.0, 0.0);
    vec2 normal = vec2(-tangent.y, tangent.x);
    vec2 relativePoint = point - uStart;
    float halfSize = uBrushSize * 0.5;
    bool covered = false;

    if (uShape < 0.5) {
      float along = clamp(dot(relativePoint, tangent), 0.0, segmentLength);
      vec2 nearestPoint = uStart + tangent * along;
      covered = distance(point, nearestPoint) <= halfSize;
    } else if (uShape < 1.5) {
      if (uFollowDirection > 0.5) {
        float along = dot(relativePoint, tangent);
        float across = dot(relativePoint, normal);
        covered = along >= 0.0 && along <= segmentLength && abs(across) <= halfSize;
      } else {
        float along = segmentLength > 0.0
          ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
          : 0.0;
        vec2 nearestPoint = uStart + tangent * along;
        vec2 distanceFromBrush = abs(point - nearestPoint);
        covered = distanceFromBrush.x <= max(1.0, uBrushSize * 0.04)
          && distanceFromBrush.y <= halfSize;
      }
    } else if (uFollowDirection > 0.5 && segmentLength > 0.0) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      covered = along >= -halfSize && along <= segmentLength + halfSize
        && abs(across) <= halfSize;
    } else {
      float along = segmentLength > 0.0
        ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
        : 0.0;
      vec2 nearestPoint = uStart + tangent * along;
      vec2 distanceFromBrush = abs(point - nearestPoint);
      covered = distanceFromBrush.x <= halfSize && distanceFromBrush.y <= halfSize;
    }

    if (!covered) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`
