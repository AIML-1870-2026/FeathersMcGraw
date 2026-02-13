import { useRef, useEffect, useCallback, useState } from 'react';
import { SimulationEngine } from '../gl/engine';
import { CPUSimulationEngine } from '../gl/cpu-engine';
import { useSimulation } from '../store/simulation';

type Engine = SimulationEngine | CPUSimulationEngine;

let engine: Engine | null = null;
let engineCanvas: HTMLCanvasElement | null = null;

export function getEngine(): Engine | null {
  return engine;
}

function supportsWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const ok = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch { return false; }
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const [cpuMode, setCpuMode] = useState(false);

  const {
    model, params, running, stepsPerFrame, gridSize, colormap,
    activeTool, brushRadius, brushIntensity,
    setActivityLevel,
  } = useSimulation();

  const currentParams = params[model];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine?.resize(canvas.width, canvas.height);
    };

    if (!engine || engineCanvas !== canvas) {
      if (engine) engine.destroy();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (supportsWebGL2()) {
        try {
          const e = new SimulationEngine();
          e.init(canvas, gridSize);
          e.onActivityUpdate = (l) => setActivityLevel(l);
          engine = e;
          engineCanvas = canvas;
        } catch {
          const e = new CPUSimulationEngine();
          e.init(canvas, gridSize);
          e.onActivityUpdate = (l) => setActivityLevel(l);
          engine = e;
          engineCanvas = canvas;
          setCpuMode(true);
        }
      } else {
        const e = new CPUSimulationEngine();
        e.init(canvas, gridSize);
        e.onActivityUpdate = (l) => setActivityLevel(l);
        engine = e;
        engineCanvas = canvas;
        setCpuMode(true);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gridSize, setActivityLevel]);

  useEffect(() => { engine?.setModel(model); }, [model]);
  useEffect(() => { engine?.setParams(currentParams); }, [currentParams]);
  useEffect(() => {
    if (!engine) return;
    if (running) engine.start(); else engine.stop();
  }, [running]);
  useEffect(() => { engine?.setStepsPerFrame(stepsPerFrame); }, [stepsPerFrame]);
  useEffect(() => { engine?.setColormap(colormap); }, [colormap]);

  const handleBrush = useCallback((e: React.MouseEvent) => {
    if (!engine) return;
    const [uvX, uvY] = engine.screenToUV(e.clientX, e.clientY);
    engine.applyBrush(uvX, uvY, activeTool, brushRadius, brushIntensity, e.shiftKey);
  }, [activeTool, brushRadius, brushIntensity]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    handleBrush(e);
  }, [handleBrush]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) handleBrush(e);
  }, [handleBrush]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -2 : 2;
    useSimulation.getState().setBrushRadius(useSimulation.getState().brushRadius + delta);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {cpuMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full text-[10px] font-mono"
          style={{ background: 'rgba(255,171,0,0.15)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.2)' }}>
          CPU mode — Open in Chrome/Firefox for GPU acceleration
        </div>
      )}
    </>
  );
}
