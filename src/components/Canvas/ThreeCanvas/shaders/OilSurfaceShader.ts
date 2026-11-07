export const oilDepthFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uDrawingStateA;
  uniform sampler2D uDrawingStateC;
  uniform float uDepthScale;

  const float OIL_RIDGE_WAVELENGTH_PX = 7.5;
  const float OIL_MAX_DEPTH_PX = 2.0;
  const float PI = 3.14159265359;

  void main() {
    vec4 stateA = texture2D(uDrawingStateA, vUv);
    float paintStyleId = floor(stateA.a * 255.0 + 0.5) / 4.0;
    vec3 strokeData = texture2D(uDrawingStateC, vUv).rgb;
    float brushSize = strokeData.b * 255.0;

    if (paintStyleId != 2.0 || brushSize <= 0.0) {
      gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
      return;
    }

    float maxEdgeDistance = strokeData.r * 255.0;
    float overrideEdgeDistance = strokeData.g * 255.0;
    float centerFactor = clamp(overrideEdgeDistance / brushSize, 0.0, 1.0);
    float maxDistanceWeight = 0.2 * (
      1.0 - (1.0 - centerFactor) * (1.0 - centerFactor)
    );
    float edgeDistance = maxEdgeDistance * maxDistanceWeight
      + overrideEdgeDistance * (1.0 - maxDistanceWeight);
    float ridgeDistance = clamp(edgeDistance, 0.0, brushSize);
    float x = ridgeDistance / brushSize;
    float ridge = abs(sin(PI * ridgeDistance / OIL_RIDGE_WAVELENGTH_PX));
    float centerDip = abs(cos(PI * x));
    float profile = ridge * (0.25 + 0.75 * centerDip);
    float depth = OIL_MAX_DEPTH_PX * profile * uDepthScale;
    gl_FragColor = vec4(depth, 0.4, 0.0, 1.0);
  }
`

export const oilNormalFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uDepthTexture;
  uniform vec2 uTexelSize;
  uniform float uNormalStrength;

  float getDepth(vec2 uv) {
    return texture2D(uDepthTexture, uv).r;
  }

  void main() {
    vec2 texel = uTexelSize;
    float topLeft = getDepth(vUv + vec2(-texel.x, texel.y));
    float top = getDepth(vUv + vec2(0.0, texel.y));
    float topRight = getDepth(vUv + texel);
    float left = getDepth(vUv - vec2(texel.x, 0.0));
    float right = getDepth(vUv + vec2(texel.x, 0.0));
    float bottomLeft = getDepth(vUv - texel);
    float bottom = getDepth(vUv - vec2(0.0, texel.y));
    float bottomRight = getDepth(vUv + vec2(texel.x, -texel.y));
    vec2 gradient = vec2(
      topRight + 2.0 * right + bottomRight - topLeft - 2.0 * left - bottomLeft,
      topLeft + 2.0 * top + topRight - bottomLeft - 2.0 * bottom - bottomRight
    ) * 0.125;
    vec3 normal = normalize(vec3(
      -gradient * uNormalStrength,
      1.0
    ));
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`
