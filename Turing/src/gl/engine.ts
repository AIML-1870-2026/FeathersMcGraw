import type { ModelType, ColormapName, InitialCondition, ToolType } from '../types';
import { generateColormapTexture } from './colormaps';

import quadVertSrc from './shaders/quad.vert?raw';
import grayScottSrc from './shaders/gray-scott.frag?raw';
import renderSrc from './shaders/render.frag?raw';
import brushSrc from './shaders/brush.frag?raw';

const MODEL_SHADERS: Record<ModelType, string> = {
  'gray-scott': grayScottSrc,
};

interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

export class SimulationEngine {
  private gl!: WebGL2RenderingContext;
  private canvas!: HTMLCanvasElement;
  private width = 512;
  private height = 512;
  private fboA!: FBO;
  private fboB!: FBO;
  private readFBO!: FBO;
  private writeFBO!: FBO;
  private simProgram!: WebGLProgram;
  private renderProgram!: WebGLProgram;
  private brushProgram!: WebGLProgram;
  private quadVAO!: WebGLVertexArrayObject;
  private colormapTexture!: WebGLTexture;
  private currentColormap: ColormapName = 'viridis';
  private currentModel: ModelType = 'gray-scott';
  private params: Record<string, number> = {};
  private running = false;
  private animFrameId = 0;
  private stepsPerFrame = 8;
  private frameCount = 0;
  private lastActivityLevel = 0;
  onActivityUpdate?: (level: number) => void;

  init(canvas: HTMLCanvasElement, gridSize = 512) {
    this.canvas = canvas;
    this.width = gridSize;
    this.height = gridSize;
    const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float not supported');

    this.setupQuad();
    this.createFBOs();
    this.simProgram = this.linkProgram(quadVertSrc, MODEL_SHADERS[this.currentModel]);
    this.renderProgram = this.linkProgram(quadVertSrc, renderSrc);
    this.brushProgram = this.linkProgram(quadVertSrc, brushSrc);
    this.colormapTexture = generateColormapTexture(gl, this.currentColormap);
    this.resetState('center');
  }

  private setupQuad() {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.quadVAO = vao;
  }

  private createFBO(): FBO {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer incomplete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer, texture };
  }

  private createFBOs() {
    this.fboA = this.createFBO();
    this.fboB = this.createFBO();
    this.readFBO = this.fboA;
    this.writeFBO = this.fboB;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader error: ${log}`);
    }
    return shader;
  }

  private linkProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const vert = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Link error: ${gl.getProgramInfoLog(program)}`);
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private drawQuad() {
    this.gl.bindVertexArray(this.quadVAO);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.bindVertexArray(null);
  }

  private swap() { const t = this.readFBO; this.readFBO = this.writeFBO; this.writeFBO = t; }

  private simulateStep() {
    const gl = this.gl;
    gl.useProgram(this.simProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readFBO.texture);
    gl.uniform1i(gl.getUniformLocation(this.simProgram, 'uState'), 0);
    gl.uniform2f(gl.getUniformLocation(this.simProgram, 'uResolution'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'uF'), this.params.F ?? 0.037);
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'uK'), this.params.k ?? 0.06);
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'uDu'), this.params.Du ?? 0.21);
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'uDv'), this.params.Dv ?? 0.105);
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'uDt'), this.params.dt ?? 1.0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFBO.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    this.drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.swap();
  }

  private renderToScreen() {
    const gl = this.gl;
    gl.useProgram(this.renderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readFBO.texture);
    gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'uState'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.colormapTexture);
    gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'uColormap'), 1);
    gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'uChannel'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.drawQuad();
  }

  private frame = () => {
    if (!this.running) return;
    for (let i = 0; i < this.stepsPerFrame; i++) this.simulateStep();
    this.renderToScreen();
    this.frameCount++;
    if (this.frameCount % 30 === 0) this.trackActivity();
    this.animFrameId = requestAnimationFrame(this.frame);
  };

  private trackActivity() {
    const gl = this.gl;
    const s = 16;
    const px = new Float32Array(s * s * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFBO.framebuffer);
    gl.readPixels(Math.floor((this.width - s) / 2), Math.floor((this.height - s) / 2), s, s, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += px[i + 1];
    const avg = sum / (s * s);
    this.onActivityUpdate?.(Math.min(1, Math.abs(avg - this.lastActivityLevel) * 10));
    this.lastActivityLevel = avg;
  }

  start() { if (this.running) return; this.running = true; this.animFrameId = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.animFrameId); this.animFrameId = 0; }

  setModel(_model: ModelType) { /* only gray-scott */ }
  setParams(params: Record<string, number>) { this.params = { ...params }; }
  setStepsPerFrame(steps: number) { this.stepsPerFrame = Math.max(1, Math.min(20, steps)); }

  setColormap(name: ColormapName) {
    if (name === this.currentColormap) return;
    this.currentColormap = name;
    this.gl.deleteTexture(this.colormapTexture);
    this.colormapTexture = generateColormapTexture(this.gl, name);
    if (!this.running) this.renderToScreen();
  }

  resetState(condition: InitialCondition) {
    const data = new Float32Array(this.width * this.height * 4);
    if (condition === 'center') {
      for (let i = 0; i < this.width * this.height; i++) { data[i * 4] = 1.0; }
      const cx = this.width / 2, cy = this.height / 2, r = this.width * 0.04;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) {
            const idx = (y * this.width + x) * 4;
            data[idx] = 0.5; data[idx + 1] = 0.25;
          }
        }
      }
    } else if (condition === 'noise') {
      for (let i = 0; i < this.width * this.height; i++) {
        data[i * 4] = 1.0 - Math.random() * 0.1;
        data[i * 4 + 1] = Math.random() * 0.1;
      }
    } else {
      for (let i = 0; i < this.width * this.height; i++) { data[i * 4] = 1.0; }
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.readFBO.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
    gl.bindTexture(gl.TEXTURE_2D, this.writeFBO.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
    if (!this.running) this.renderToScreen();
  }

  applyBrush(normX: number, normY: number, tool: ToolType, radius: number, intensity: number, _square: boolean) {
    const gl = this.gl;
    gl.useProgram(this.brushProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readFBO.texture);
    gl.uniform1i(gl.getUniformLocation(this.brushProgram, 'uState'), 0);
    gl.uniform2f(gl.getUniformLocation(this.brushProgram, 'uResolution'), this.width, this.height);
    gl.uniform2f(gl.getUniformLocation(this.brushProgram, 'uBrushPos'), normX, normY);
    gl.uniform1f(gl.getUniformLocation(this.brushProgram, 'uBrushRadius'), radius);
    gl.uniform1f(gl.getUniformLocation(this.brushProgram, 'uBrushIntensity'), intensity);
    gl.uniform1i(gl.getUniformLocation(this.brushProgram, 'uBrushType'), tool === 'inject' ? 0 : 1);
    gl.uniform1i(gl.getUniformLocation(this.brushProgram, 'uBrushSquare'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFBO.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    this.drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.swap();
    if (!this.running) this.renderToScreen();
  }

  screenToUV(screenX: number, screenY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(screenX - r.left) / r.width, (screenY - r.top) / r.height];
  }

  resize(w: number, h: number) { this.canvas.width = w; this.canvas.height = h; if (!this.running) this.renderToScreen(); }
  readVChannel(_size = 64) { return new Float32Array(0); }
  pushUndoState() {}
  undo() { return false; }
  screenshot() {}
  destroy() {
    this.stop();
    const gl = this.gl;
    gl.deleteProgram(this.simProgram);
    gl.deleteProgram(this.renderProgram);
    gl.deleteProgram(this.brushProgram);
    gl.deleteFramebuffer(this.fboA.framebuffer);
    gl.deleteTexture(this.fboA.texture);
    gl.deleteFramebuffer(this.fboB.framebuffer);
    gl.deleteTexture(this.fboB.texture);
    gl.deleteTexture(this.colormapTexture);
  }
}
