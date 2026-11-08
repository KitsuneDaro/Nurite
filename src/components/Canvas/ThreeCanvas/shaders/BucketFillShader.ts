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
  uniform vec4 uValue;

  void main() {
    if (texture2D(uMask, vUv).r < 0.5) discard;
    gl_FragColor = uValue;
  }
`
