#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uResolution;
uniform float uF;
uniform float uK;
uniform float uDu;
uniform float uDv;
uniform float uDt;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / uResolution;
  vec2 state = texture(uState, vUv).rg;
  float u = state.r;
  float v = state.g;

  vec2 sL = texture(uState, vUv + vec2(-texel.x, 0.0)).rg;
  vec2 sR = texture(uState, vUv + vec2( texel.x, 0.0)).rg;
  vec2 sT = texture(uState, vUv + vec2(0.0,  texel.y)).rg;
  vec2 sB = texture(uState, vUv + vec2(0.0, -texel.y)).rg;

  float lapU = sL.r + sR.r + sT.r + sB.r - 4.0 * u;
  float lapV = sL.g + sR.g + sT.g + sB.g - 4.0 * v;

  float uvv = u * v * v;
  float du = uDu * lapU - uvv + uF * (1.0 - u);
  float dv = uDv * lapV + uvv - (uF + uK) * v;

  fragColor = vec4(clamp(u + du * uDt, 0.0, 1.0), clamp(v + dv * uDt, 0.0, 1.0), 0.0, 1.0);
}
