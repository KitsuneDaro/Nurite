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
  uniform vec4 uValue;

  void main() {
    if (uUseStrokeId == 1) {
      vec3 metadata = floor(texture2D(uMetadata, vUv).rgb * 255.0 + 0.5);
      if (
        abs(metadata.r - uStrokeId.r) > 0.5
        || abs(metadata.g - uStrokeId.g) > 0.5
        || mod(metadata.b, 16.0) != uStrokeId.b
      ) discard;
    } else if (texture2D(uMask, vUv).r < 0.5) {
      discard;
    }
    gl_FragColor = uValue;
  }
`
