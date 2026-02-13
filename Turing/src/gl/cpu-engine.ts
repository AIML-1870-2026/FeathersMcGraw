import type { ModelType, ColormapName, InitialCondition, ToolType } from '../types';
import { getColormapPreviewData } from './colormaps';

type ColormapLUT = Uint8Array;

function buildLUT(name: ColormapName): ColormapLUT {
  const small = getColormapPreviewData(name);
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * 63;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, 63);
    const f = t - lo;
    for (let c = 0; c < 4; c++) lut[i * 4 + c] = Math.round(small[lo * 4 + c] * (1 - f) + small[hi * 4 + c] * f);
  }
  return lut;
}

export class CPUSimulationEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private width = 256;
  private height = 256;
  private u!: Float32Array;
  private v!: Float32Array;
  private uNext!: Float32Array;
  private vNext!: Float32Array;
  private imageData!: ImageData;
  private lut!: ColormapLUT;
  private params: Record<string, number> = {};
  private running = false;
  private animFrameId = 0;
  private stepsPerFrame = 5;
  private frameCount = 0;
  private lastAvgV = 0;
  onActivityUpdate?: (level: number) => void;

  init(canvas: HTMLCanvasElement, gridSize = 256) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = Math.min(gridSize, 256);
    this.height = this.width;
    const n = this.width * this.height;
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.uNext = new Float32Array(n);
    this.vNext = new Float32Array(n);
    this.imageData = new ImageData(this.width, this.height);
    this.lut = buildLUT('viridis');
    this.resetState('center');
  }

  private simulateStep() {
    const w = this.width, h = this.height;
    const u = this.u, v = this.v, un = this.uNext, vn = this.vNext;
    const F = this.params.F ?? 0.037, k = this.params.k ?? 0.06;
    const Du = this.params.Du ?? 0.21, Dv = this.params.Dv ?? 0.105;
    const dt = this.params.dt ?? 1.0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const lapU = u[y * w + ((x - 1 + w) % w)] + u[y * w + ((x + 1) % w)] + u[((y - 1 + h) % h) * w + x] + u[((y + 1) % h) * w + x] - 4 * u[i];
        const lapV = v[y * w + ((x - 1 + w) % w)] + v[y * w + ((x + 1) % w)] + v[((y - 1 + h) % h) * w + x] + v[((y + 1) % h) * w + x] - 4 * v[i];
        const uvv = u[i] * v[i] * v[i];
        un[i] = Math.max(0, Math.min(1, u[i] + (Du * lapU - uvv + F * (1 - u[i])) * dt));
        vn[i] = Math.max(0, Math.min(1, v[i] + (Dv * lapV + uvv - (F + k) * v[i]) * dt));
      }
    }
    const tu = this.u, tv = this.v;
    this.u = this.uNext; this.v = this.vNext;
    this.uNext = tu; this.vNext = tv;
  }

  private renderToScreen() {
    const data = this.imageData.data, lut = this.lut, v = this.v;
    for (let i = 0; i < this.width * this.height; i++) {
      const idx = Math.round(Math.max(0, Math.min(1, v[i])) * 255) * 4;
      data[i * 4] = lut[idx]; data[i * 4 + 1] = lut[idx + 1]; data[i * 4 + 2] = lut[idx + 2]; data[i * 4 + 3] = 255;
    }
    const tmp = new OffscreenCanvas(this.width, this.height);
    const tc = tmp.getContext('2d')!;
    tc.putImageData(this.imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);
  }

  private frame = () => {
    if (!this.running) return;
    for (let i = 0; i < this.stepsPerFrame; i++) this.simulateStep();
    this.renderToScreen();
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      let sum = 0;
      for (let i = 0; i < this.v.length; i++) sum += this.v[i];
      const avg = sum / this.v.length;
      this.onActivityUpdate?.(Math.min(1, Math.abs(avg - this.lastAvgV) * 10));
      this.lastAvgV = avg;
    }
    this.animFrameId = requestAnimationFrame(this.frame);
  };

  start() { if (this.running) return; this.running = true; this.animFrameId = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.animFrameId); this.animFrameId = 0; }

  setModel(_model: ModelType) {}
  setParams(params: Record<string, number>) { this.params = { ...params }; }
  setStepsPerFrame(steps: number) { this.stepsPerFrame = Math.max(1, Math.min(10, steps)); }
  setColormap(name: ColormapName) { this.lut = buildLUT(name); if (!this.running) this.renderToScreen(); }

  resetState(condition: InitialCondition) {
    this.u.fill(1); this.v.fill(0);
    if (condition === 'center') {
      const cx = this.width / 2, cy = this.height / 2, r = this.width * 0.04;
      for (let y = 0; y < this.height; y++)
        for (let x = 0; x < this.width; x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) { this.u[y * this.width + x] = 0.5; this.v[y * this.width + x] = 0.25; }
    } else if (condition === 'noise') {
      for (let i = 0; i < this.u.length; i++) { this.u[i] = 1 - Math.random() * 0.1; this.v[i] = Math.random() * 0.1; }
    }
    if (!this.running) this.renderToScreen();
  }

  applyBrush(normX: number, normY: number, tool: ToolType, radius: number, intensity: number, _square: boolean) {
    const cx = normX * this.width, cy = normY * this.height, r = radius * (this.width / 512);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > r) continue;
        const s = (1 - dist / r) * intensity;
        const i = y * this.width + x;
        if (tool === 'inject') this.v[i] = Math.min(1, this.v[i] + s);
        else { this.u[i] += (1 - this.u[i]) * s; this.v[i] *= (1 - s); }
      }
    }
    if (!this.running) this.renderToScreen();
  }

  screenToUV(sx: number, sy: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(sx - r.left) / r.width, (sy - r.top) / r.height];
  }

  resize(w: number, h: number) { this.canvas.width = w; this.canvas.height = h; if (!this.running) this.renderToScreen(); }
  readVChannel() { return new Float32Array(0); }
  pushUndoState() {}
  undo() { return false; }
  screenshot() {}
  destroy() { this.stop(); }
}
