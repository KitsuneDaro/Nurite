export const segmentMetadataFunctions = `
  uniform int uStrokeId;
  uniform int uSegmentId;
  uniform vec2 uResolution;
  uniform sampler2D uMetadataTexture;

  vec4 getSegmentMetadataKey() {
    float strokeLow = mod(float(uStrokeId), 256.0);
    float strokeMiddle = mod(floor(float(uStrokeId) / 256.0), 256.0);
    float strokeHighAndSegmentLow = mod(floor(float(uStrokeId) / 65536.0), 16.0)
      + mod(float(uSegmentId), 16.0) * 16.0;
    float segmentHigh = floor(float(uSegmentId) / 16.0);
    return vec4(
      strokeLow,
      strokeMiddle,
      strokeHighAndSegmentLow,
      segmentHigh
    ) / 255.0;
  }

  bool isCurrentSegmentCovered() {
    vec4 storedMetadata = texture2D(
      uMetadataTexture,
      gl_FragCoord.xy / uResolution
    );
    return all(lessThanEqual(
      abs(storedMetadata - getSegmentMetadataKey()),
      vec4(0.5 / 255.0)
    ));
  }
`

