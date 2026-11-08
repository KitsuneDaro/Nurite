export const bucketFillVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const bucketFillFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uMask;
  uniform sampler2D uMetadata;
  uniform vec3 uStrokeId;
  uniform int uUseStrokeId;
  uniform int uWriteMetadata;
  uniform vec4 uValue;

  void main() {
    vec2 textureUv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 metadata = texture2D(uMetadata, textureUv);
    if (uUseStrokeId == 1) {
      vec3 metadataBytes = floor(metadata.rgb * 255.0 + 0.5);
      if (
        abs(metadataBytes.r - uStrokeId.r) > 0.5
        || abs(metadataBytes.g - uStrokeId.g) > 0.5
        || mod(metadataBytes.b, 16.0) != uStrokeId.b
      ) discard;
    } else if (texture2D(uMask, textureUv).r < 0.5) {
      discard;
    }
    if (uWriteMetadata == 1) {
      float metadataByteB = floor(metadata.b * 255.0 + 0.5);
      float strokeHigh = floor(uValue.b * 255.0 + 0.5);
      float segmentLow = floor(metadataByteB / 16.0);
      gl_FragColor = vec4(
        uValue.rg,
        (segmentLow * 16.0 + strokeHigh) / 255.0,
        metadata.a
      );
    } else {
      gl_FragColor = uValue;
    }
  }
`
