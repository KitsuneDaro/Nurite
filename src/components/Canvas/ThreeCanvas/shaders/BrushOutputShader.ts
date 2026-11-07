import { segmentMetadataFunctions } from './SegmentMetadataShader'

export const brushColorFragmentShader = `
  ${segmentMetadataFunctions}
  uniform vec3 uColor;

  void main() {
    if (!isCurrentSegmentCovered()) discard;
    gl_FragColor = vec4(uColor, 1.0);
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
