#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uResolution;
uniform vec2 uBrushPos;     // normalized [0,1]
uniform float uBrushRadius; // in pixels
uniform float uBrushIntensity;
uniform int uBrushType;     // 0=inject, 1=erase, 2=attractor, 3=repeller
uniform int uBrushSquare;   // 0=circle, 1=square

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 state = texture(uState, vUv).rg;

  vec2 diff = (vUv - uBrushPos) * uResolution;
  float dist;
  if (uBrushSquare == 1) {
    dist = max(abs(diff.x), abs(diff.y));
  } else {
    dist = length(diff);
  }

  float falloff = 1.0 - smoothstep(0.0, uBrushRadius, dist);
  float strength = falloff * uBrushIntensity;

  float u = state.r;
  float v = state.g;

  if (uBrushType == 0) {
    v = v + strength;
  } else if (uBrushType == 1) {
    u = mix(u, 1.0, strength);
    v = mix(v, 0.0, strength);
  } else if (uBrushType == 2) {
    v = v + strength * 0.5;
  } else if (uBrushType == 3) {
    v = v - strength * 0.5;
  }

  fragColor = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
}
