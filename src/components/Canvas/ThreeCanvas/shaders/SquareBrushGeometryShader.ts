export const squareBrushGeometryFunctions = `
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

  float getSquareBrushSideMargin(
    vec2 point,
    vec2 tangent,
    vec2 previousSquareAxis,
    vec2 currentSquareAxis,
    vec2 segment,
    float halfSize
  ) {
    vec2 normal = vec2(-tangent.y, tangent.x);
    float edgeMargin = 0.0;
    if (length(segment) <= 0.0001) {
      edgeMargin = getSquareHullAxisMargin(
        point, previousSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
      );
      edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
        point,
        vec2(-previousSquareAxis.y, previousSquareAxis.x),
        previousSquareAxis,
        currentSquareAxis,
        segment,
        halfSize
      ));
      edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
        point, currentSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
      ));
      edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
        point,
        vec2(-currentSquareAxis.y, currentSquareAxis.x),
        previousSquareAxis,
        currentSquareAxis,
        segment,
        halfSize
      ));
    } else {
      edgeMargin = getSquareHullAxisMargin(
        point, normal, previousSquareAxis, currentSquareAxis, segment, halfSize
      );
      if (abs(dot(previousSquareAxis, normal)) > abs(dot(previousSquareAxis, tangent))) {
        edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
          point, previousSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
        ));
      }
      vec2 previousPerpendicular = vec2(-previousSquareAxis.y, previousSquareAxis.x);
      if (abs(dot(previousPerpendicular, normal)) > abs(dot(previousPerpendicular, tangent))) {
        edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
          point, previousPerpendicular, previousSquareAxis, currentSquareAxis, segment, halfSize
        ));
      }
      if (abs(dot(currentSquareAxis, normal)) > abs(dot(currentSquareAxis, tangent))) {
        edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
          point, currentSquareAxis, previousSquareAxis, currentSquareAxis, segment, halfSize
        ));
      }
      vec2 currentPerpendicular = vec2(-currentSquareAxis.y, currentSquareAxis.x);
      if (abs(dot(currentPerpendicular, normal)) > abs(dot(currentPerpendicular, tangent))) {
        edgeMargin = min(edgeMargin, getSquareHullAxisMargin(
          point, currentPerpendicular, previousSquareAxis, currentSquareAxis, segment, halfSize
        ));
      }
    }
    return edgeMargin;
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
    vec2 previousSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(previousTangent)
      : vec2(1.0, 0.0);
    vec2 currentSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(tangent)
      : vec2(1.0, 0.0);
    vec2 segmentNormal = length(segment) > 0.0001
      ? normalize(vec2(-segment.y, segment.x))
      : vec2(-tangent.y, tangent.x);
    float edgeDistance = getSquareBrushSideMargin(
      point, tangent, previousSquareAxis, currentSquareAxis, segment, halfSize
    );
    return min(edgeDistance, getSquareHullAxisMargin(
      point, segmentNormal, previousSquareAxis, currentSquareAxis, segment, halfSize
    ));
  }

  float getSquareBrushStrokeEdgeDistance(
    vec2 point,
    vec2 segment,
    vec2 previousDirection,
    float halfSize,
    float followDirection
  ) {
    vec2 tangent = getSquareTangent(segment, previousDirection);
    vec2 previousTangent = getSquareTangent(previousDirection, tangent);
    vec2 previousSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(previousTangent)
      : vec2(1.0, 0.0);
    vec2 currentSquareAxis = followDirection > 0.5
      ? rotateSquareAxis(tangent)
      : vec2(1.0, 0.0);
    float segmentLength = length(segment);
    float along = clamp(dot(point, tangent), 0.0, segmentLength);
    vec2 centerlinePoint = tangent * along;
    float edgeMargin = getSquareBrushSideMargin(
      point, tangent, previousSquareAxis, currentSquareAxis, segment, halfSize
    );
    float centerlineMargin = getSquareBrushSideMargin(
      centerlinePoint, tangent, previousSquareAxis, currentSquareAxis, segment, halfSize
    );
    return halfSize * clamp(edgeMargin / max(centerlineMargin, 0.0001), 0.0, 1.0);
  }
`
