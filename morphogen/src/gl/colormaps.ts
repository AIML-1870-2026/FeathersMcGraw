import type { ColormapName } from '../types';

type ColorStop = [number, number, number];

const COLORMAP_DATA: Record<ColormapName, ColorStop[]> = {
  viridis: [
    [68, 1, 84], [72, 35, 116], [64, 67, 135], [52, 94, 141],
    [41, 120, 142], [32, 144, 140], [34, 167, 132], [68, 190, 112],
    [121, 209, 81], [189, 222, 38], [253, 231, 37],
  ],
  magma: [
    [0, 0, 4], [18, 14, 54], [51, 16, 104], [90, 17, 126],
    [130, 26, 129], [168, 46, 118], [204, 72, 96], [232, 109, 72],
    [248, 155, 57], [252, 206, 49], [252, 253, 191],
  ],
  inferno: [
    [0, 0, 4], [22, 11, 57], [58, 12, 107], [96, 20, 124],
    [132, 37, 120], [167, 55, 105], [200, 77, 80], [227, 108, 51],
    [245, 150, 24], [249, 199, 20], [252, 255, 164],
  ],
  plasma: [
    [13, 8, 135], [65, 4, 157], [106, 0, 168], [143, 13, 164],
    [175, 40, 146], [201, 67, 120], [222, 97, 93], [237, 130, 64],
    [246, 167, 34], [248, 207, 12], [240, 249, 33],
  ],
  grayscale: [
    [0, 0, 0], [28, 28, 28], [57, 57, 57], [85, 85, 85],
    [113, 113, 113], [142, 142, 142], [170, 170, 170], [198, 198, 198],
    [227, 227, 227], [255, 255, 255],
  ],
};

function interpolateColor(stops: ColorStop[], t: number): ColorStop {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (stops.length - 1);
  const low = Math.floor(idx);
  const high = Math.min(low + 1, stops.length - 1);
  const frac = idx - low;
  return [
    Math.round(stops[low][0] + (stops[high][0] - stops[low][0]) * frac),
    Math.round(stops[low][1] + (stops[high][1] - stops[low][1]) * frac),
    Math.round(stops[low][2] + (stops[high][2] - stops[low][2]) * frac),
  ];
}

export function generateColormapTexture(gl: WebGL2RenderingContext, name: ColormapName): WebGLTexture {
  const stops = COLORMAP_DATA[name];
  const width = 256;
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const [r, g, b] = interpolateColor(stops, t);
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export function getColormapPreviewData(name: ColormapName): Uint8Array {
  const stops = COLORMAP_DATA[name];
  const width = 64;
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const [r, g, b] = interpolateColor(stops, t);
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return data;
}
