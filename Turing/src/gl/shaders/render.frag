#version 300 es
precision highp float;

uniform sampler2D uState;
uniform sampler2D uColormap;
uniform int uChannel; // 0 = V channel (default), 1 = U channel, 2 = both

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 state = texture(uState, vUv).rg;

  if (uChannel == 2) {
    // Two-tone overlay: U as blue, V as orange with alpha blending
    vec3 colorU = texture(uColormap, vec2(state.r, 0.5)).rgb * vec3(0.3, 0.5, 1.0);
    vec3 colorV = texture(uColormap, vec2(state.g, 0.5)).rgb * vec3(1.0, 0.6, 0.2);
    fragColor = vec4(colorU + colorV, 1.0);
  } else {
    float val = uChannel == 1 ? state.r : state.g;
    vec3 color = texture(uColormap, vec2(val, 0.5)).rgb;
    fragColor = vec4(color, 1.0);
  }
}
