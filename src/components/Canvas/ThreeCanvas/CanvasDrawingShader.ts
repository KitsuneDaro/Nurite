export const brushVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const brushFragmentShader = `
  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform vec2 uPreviousDirection;
  uniform vec2 uVelocity;
  uniform vec2 uAcceleration;
  uniform float uBrushSize;
  uniform int uShape;
  uniform int uOutputType;
  uniform int uStrokeIndex;
  uniform int uFrameIndex;
  uniform float uFollowDirection;
  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform sampler2D uMetadataTexture;

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
    float halfThickness = max(1.0, brushSize * 0.04);
    if (segmentLength == 0.0) {
      return abs(relativePoint.x) <= halfThickness
        && abs(relativePoint.y) <= halfSize;
    }

    vec2 tangent = segment / segmentLength;
    vec2 normal = vec2(-tangent.y, tangent.x);
    vec2 lowerBound = min(vec2(0.0), segment) - vec2(halfThickness, halfSize);
    vec2 upperBound = max(vec2(0.0), segment) + vec2(halfThickness, halfSize);
    float normalExtent = halfThickness * abs(normal.x) + halfSize * abs(normal.y);

    return all(greaterThanEqual(relativePoint, lowerBound))
      && all(lessThanEqual(relativePoint, upperBound))
      && abs(dot(relativePoint, normal)) <= normalExtent;
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
    bool covered = false;
    if (followDirection > 0.5) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      bool onSegment = along >= 0.0 && along <= segmentLength && abs(across) <= halfSize;
      covered = onSegment || coversDirectionalJoin(
        relativePoint, previousDirection, normal, halfSize
      );
    } else {
      covered = coversFixedFlatSegment(relativePoint, segment, halfSize, brushSize);
    }
    return covered;
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
    bool covered = false;
    if (followDirection > 0.5 && segmentLength > 0.0) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      bool onSegment = along >= -halfSize && along <= segmentLength + halfSize
        && abs(across) <= halfSize;
      covered = onSegment || coversDirectionalJoin(
        relativePoint, previousDirection, normal, halfSize
      );
    } else {
      float along = segmentLength > 0.0
        ? clamp(dot(relativePoint, tangent), 0.0, segmentLength)
        : 0.0;
      vec2 nearestPoint = start + tangent * along;
      vec2 distanceFromBrush = abs(point - nearestPoint);
      covered = distanceFromBrush.x <= halfSize && distanceFromBrush.y <= halfSize;
    }
    return covered;
  }

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

    vec2 lowerBound = min(vec2(0.0), segment) - vec2(halfThickness, halfSize);
    vec2 upperBound = max(vec2(0.0), segment) + vec2(halfThickness, halfSize);
    float normalExtent = halfThickness * abs(normal.x) + halfSize * abs(normal.y);
    float horizontalMargin = min(
      relativePoint.x - lowerBound.x,
      upperBound.x - relativePoint.x
    );
    float verticalMargin = min(
      relativePoint.y - lowerBound.y,
      upperBound.y - relativePoint.y
    );
    float normalMargin = normalExtent - abs(dot(relativePoint, normal));
    return max(0.0, min(horizontalMargin, min(verticalMargin, normalMargin)));
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
    float segmentLength,
    float halfSize
  ) {
    if (length(previousDirection) == 0.0) {
      float along = dot(relativePoint, vec2(currentNormal.y, -currentNormal.x));
      float across = dot(relativePoint, currentNormal);
      return max(0.0, min(
        halfSize - abs(across),
        min(along, segmentLength - along)
      ));
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
      relativePoint, endPositive, endNegative
    ));
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, endNegative, currentNegative
    ));
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, currentNegative, previousNegative
    ));
    edgeDistance = min(edgeDistance, distanceToSegmentEdge(
      relativePoint, previousNegative, previousPositive
    ));
    return edgeDistance;
  }

  float distanceFromFlatBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    vec2 tangent,
    vec2 normal,
    float segmentLength,
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
      relativePoint,
      segment,
      normal,
      uPreviousDirection,
      segmentLength,
      halfSize
    );
  }

  float distanceFromSquareBrushEdge(
    vec2 relativePoint,
    vec2 segment,
    vec2 tangent,
    vec2 normal,
    float segmentLength,
    float halfSize,
    float followDirection
  ) {
    if (followDirection > 0.5 && segmentLength > 0.0) {
      float along = dot(relativePoint, tangent);
      float across = dot(relativePoint, normal);
      float alongMargin = min(along + halfSize, segmentLength + halfSize - along);
      return max(0.0, min(alongMargin, halfSize - abs(across)));
    }

    vec2 lowerBound = min(vec2(0.0), segment) - vec2(halfSize);
    vec2 upperBound = max(vec2(0.0), segment) + vec2(halfSize);
    float horizontalMargin = min(
      relativePoint.x - lowerBound.x,
      upperBound.x - relativePoint.x
    );
    float verticalMargin = min(
      relativePoint.y - lowerBound.y,
      upperBound.y - relativePoint.y
    );
    float normalExtent = halfSize * (abs(normal.x) + abs(normal.y));
    float normalMargin = normalExtent - abs(dot(relativePoint, normal));
    return max(0.0, min(horizontalMargin, min(verticalMargin, normalMargin)));
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

    float strokeLow = mod(float(uStrokeIndex), 256.0);
    float strokeMiddle = mod(floor(float(uStrokeIndex) / 256.0), 256.0);
    float strokeHighAndFrameLow = mod(floor(float(uStrokeIndex) / 65536.0), 16.0)
      + mod(float(uFrameIndex), 16.0) * 16.0;
    float frameHigh = floor(float(uFrameIndex) / 16.0);
    vec4 metadataKey = vec4(
      strokeLow,
      strokeMiddle,
      strokeHighAndFrameLow,
      frameHigh
    ) / 255.0;

    if (uOutputType != 0) {
      vec4 storedMetadata = texture2D(uMetadataTexture, gl_FragCoord.xy / uResolution);
      if (any(greaterThan(abs(storedMetadata - metadataKey), vec4(0.5 / 255.0)))) {
        discard;
      }
    }

    if (uOutputType == 0) {
      gl_FragColor = metadataKey;
    } else if (uOutputType == 1) {
      gl_FragColor = vec4(uColor, 1.0);
    } else if (uOutputType == 2) {
      float edgeDistance = 0.0;
      if (uShape == 0) {
        edgeDistance = distanceFromRoundBrushEdge(
          relativePoint, tangent, segmentLength, halfSize
        );
      } else if (uShape == 1) {
        edgeDistance = distanceFromFlatBrushEdge(
          relativePoint,
          segment,
          tangent,
          normal,
          segmentLength,
          halfSize,
          uBrushSize,
          followDirection
        );
      } else {
        edgeDistance = distanceFromSquareBrushEdge(
          relativePoint,
          segment,
          tangent,
          normal,
          segmentLength,
          halfSize,
          followDirection
        );
      }

      float endX = floor(clamp(uEnd.x, 0.0, 1023.0) + 0.5);
      float endY = floor(clamp(uEnd.y, 0.0, 1023.0) + 0.5);
      float distanceValue = floor(clamp(edgeDistance, 0.0, 63.0) + 0.5);
      float brushSize = floor(clamp(uBrushSize, 0.0, 63.0) + 0.5);
      float byte0 = mod(endX, 256.0);
      float byte1 = floor(endX / 256.0) + mod(endY, 64.0) * 4.0;
      float byte2 = floor(endY / 64.0) + mod(distanceValue, 16.0) * 16.0;
      float byte3 = floor(distanceValue / 16.0) + brushSize * 4.0;
      gl_FragColor = vec4(
        byte0, byte1, byte2, byte3
      ) / 255.0;
    } else {
      vec2 velocity = clamp(uVelocity, vec2(-128.0), vec2(127.0));
      vec2 acceleration = clamp(uAcceleration, vec2(-128.0), vec2(127.0));
      gl_FragColor = vec4(
        (velocity + 128.0) / 255.0,
        (acceleration + 128.0) / 255.0
      );
    }
  }
`

export const textureDebugFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform int uDebugField;

  void main() {
    vec4 value = texture2D(uTexture, vUv);
    vec4 bytes = floor(value * 255.0 + 0.5);
    float debugValue = 0.0;

    if (uDebugField == 0) {
      float strokeIndex = bytes.r + bytes.g * 256.0 + mod(bytes.b, 16.0) * 65536.0;
      debugValue = log2(strokeIndex + 1.0) / 20.0;
    } else if (uDebugField == 1) {
      float frameIndex = floor(bytes.b / 16.0) + bytes.a * 16.0;
      debugValue = frameIndex / 4095.0;
    } else if (uDebugField >= 2 && uDebugField <= 5) {
      int channel = uDebugField - 2;
      debugValue = channel == 0 ? value.r
        : channel == 1 ? value.g
        : channel == 2 ? value.b
        : value.a;
    } else if (uDebugField >= 6 && uDebugField <= 9) {
      float endX = bytes.r + mod(bytes.g, 4.0) * 256.0;
      float endY = floor(bytes.g / 4.0) + mod(bytes.b, 16.0) * 64.0;
      float edgeDistance = floor(bytes.b / 16.0) + mod(bytes.a, 4.0) * 16.0;
      float brushSize = floor(bytes.a / 4.0);
      if (uDebugField == 6) debugValue = endX / 1023.0;
      else if (uDebugField == 7) debugValue = endY / 1023.0;
      else if (uDebugField == 8) debugValue = edgeDistance / 63.0;
      else debugValue = brushSize / 63.0;
    } else {
      int channel = uDebugField - 10;
      debugValue = channel == 0 ? value.r
        : channel == 1 ? value.g
        : channel == 2 ? value.b
        : value.a;
    }

    gl_FragColor = vec4(vec3(debugValue), 1.0);
    #include <colorspace_fragment>
  }
`

export const textureDebugVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
