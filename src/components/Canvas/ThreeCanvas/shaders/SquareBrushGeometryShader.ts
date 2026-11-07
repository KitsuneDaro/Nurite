export const squareBrushGeometryFunctions = `
  const float MAX_DIRECTION_TURN_RADIANS = 0.3490658504;

  vec2 clampDirectionTurn(vec2 previousDirection, vec2 currentDirection) {
    float previousLength = length(previousDirection);
    float currentLength = length(currentDirection);
    if (previousLength <= 0.0001 || currentLength <= 0.0001) {
      return currentDirection;
    }

    vec2 previousTangent = previousDirection / previousLength;
    vec2 currentTangent = currentDirection / currentLength;
    float crossProduct = previousTangent.x * currentTangent.y
      - previousTangent.y * currentTangent.x;
    float directionChange = atan(crossProduct, dot(previousTangent, currentTangent));
    float limitedChange = clamp(
      directionChange,
      -MAX_DIRECTION_TURN_RADIANS,
      MAX_DIRECTION_TURN_RADIANS
    );
    float cosine = cos(limitedChange);
    float sine = sin(limitedChange);
    return vec2(
      previousTangent.x * cosine - previousTangent.y * sine,
      previousTangent.x * sine + previousTangent.y * cosine
    ) * currentLength;
  }

  vec2 getSquareTangent(vec2 direction, vec2 fallbackDirection) {
    float directionLength = length(direction);
    if (directionLength > 0.5) return direction / directionLength;

    float fallbackLength = length(fallbackDirection);
    return fallbackLength > 0.5
      ? fallbackDirection / fallbackLength
      : vec2(1.0, 0.0);
  }

  vec2 rotateSquareAxis(vec2 direction) {
    const float diagonal = 0.70710678118;
    return vec2(
      (direction.x - direction.y) * diagonal,
      (direction.x + direction.y) * diagonal
    );
  }

  float getSquareHullAxisMargin(
    vec2 point,
    vec2 axis,
    vec2 previousSquareAxis,
    vec2 currentSquareAxis,
    vec2 segment,
    float halfSize
  ) {
    vec2 previousPerpendicular = vec2(
      -previousSquareAxis.y, previousSquareAxis.x
    );
    vec2 currentPerpendicular = vec2(
      -currentSquareAxis.y, currentSquareAxis.x
    );
    float previousRadius = halfSize * (
      abs(dot(axis, previousSquareAxis))
      + abs(dot(axis, previousPerpendicular))
    );
    float currentRadius = halfSize * (
      abs(dot(axis, currentSquareAxis))
      + abs(dot(axis, currentPerpendicular))
    );
    float segmentProjection = dot(segment, axis);
    float lowerBound = min(
      -previousRadius,
      min(-currentRadius, segmentProjection - currentRadius)
    );
    float upperBound = max(
      previousRadius,
      max(currentRadius, segmentProjection + currentRadius)
    );
    float pointProjection = dot(point, axis);
    return min(pointProjection - lowerBound, upperBound - pointProjection);
  }

  float getSquareBrushSignedDistance(
    vec2 point,
    vec2 segment,
    vec2 previousDirection,
    float halfSize,
    float followDirection
  ) {
    vec2 tangent = getSquareTangent(segment, previousDirection);
    vec2 previousTangent = getSquareTangent(previousDirection, tangent);
    vec2 limitedTangent = getSquareTangent(
      clampDirectionTurn(previousTangent, tangent),
      previousTangent
    );
    vec2 previousSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(previousTangent)
      : vec2(1.0, 0.0);
    vec2 currentSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(limitedTangent)
      : vec2(1.0, 0.0);
    vec2 segmentNormal = length(segment) > 0.0001
      ? normalize(vec2(-segment.y, segment.x))
      : vec2(-tangent.y, tangent.x);
    float edgeDistance = getSquareHullAxisMargin(
      point, previousSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
    );
    edgeDistance = min(edgeDistance, getSquareHullAxisMargin(
      point,
      vec2(-previousSquareAxis.y, previousSquareAxis.x),
      previousSquareAxis,
      currentSquareAxis,
      segment,
      halfSize
    ));
    edgeDistance = min(edgeDistance, getSquareHullAxisMargin(
      point, currentSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
    ));
    edgeDistance = min(edgeDistance, getSquareHullAxisMargin(
      point,
      vec2(-currentSquareAxis.y, currentSquareAxis.x),
      previousSquareAxis,
      currentSquareAxis,
      segment,
      halfSize
    ));
    return min(edgeDistance, getSquareHullAxisMargin(
      point, segmentNormal, previousSquareAxis, currentSquareAxis, segment, halfSize
    ));
  }

  float getSquareBrushStrokeEdgeDistance(
    vec2 point,
    vec2 segment,
    float halfSize,
    vec2 tangent
  ) {
    float segmentLength = length(segment);
    float along = clamp(dot(point, tangent), 0.0, segmentLength);
    return max(0.0, halfSize - length(point - tangent * along));
  }
`
