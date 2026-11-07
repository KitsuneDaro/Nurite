export const textureDebugFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform int uDebugField;

  void main() {
    vec4 value = texture2D(uTexture, vUv);
    vec4 bytes = floor(value * 255.0 + 0.5);
    float debugValue = 0.0;

    if (uDebugField == 0) {
      float strokeId = bytes.r + bytes.g * 256.0 + mod(bytes.b, 16.0) * 65536.0;
      debugValue = log2(strokeId + 1.0) / 20.0;
    } else if (uDebugField == 1) {
      float segmentId = floor(bytes.b / 16.0) + bytes.a * 16.0;
      debugValue = segmentId / 4095.0;
    } else if (uDebugField >= 2 && uDebugField <= 5) {
      int channel = uDebugField - 2;
      debugValue = channel == 0 ? value.r
        : channel == 1 ? value.g
        : channel == 2 ? value.b
        : value.a;
    } else if (uDebugField >= 6 && uDebugField <= 9) {
      float endX = bytes.r + mod(bytes.g, 4.0) * 256.0;
      float endY = floor(bytes.g / 4.0) + mod(bytes.b, 16.0) * 64.0;
      float brushShapeId = floor(bytes.b / 16.0) + mod(bytes.a, 4.0) * 16.0;
      float paintStyleId = floor(bytes.a / 4.0);
      if (uDebugField == 6) debugValue = endX / 1023.0;
      else if (uDebugField == 7) debugValue = endY / 1023.0;
      else if (uDebugField == 8) debugValue = brushShapeId / 3.0;
      else debugValue = paintStyleId / 3.0;
    } else if (uDebugField == 14) {
      debugValue = value.r;
    } else if (uDebugField == 15) {
      debugValue = value.g;
    } else if (uDebugField == 16) {
      debugValue = value.r / 12.0;
    } else if (uDebugField == 17) {
      gl_FragColor = vec4(value.rgb, 1.0);
      #include <colorspace_fragment>
      return;
    } else if (uDebugField == 18) {
      debugValue = value.b;
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
