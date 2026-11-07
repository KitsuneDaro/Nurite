import { squareBrushGeometryFunctions } from './SquareBrushGeometryShader'

export const brushEdgeDistanceFunctions = `
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
